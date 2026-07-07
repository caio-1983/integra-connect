import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { runAgentChat } from '../runtime/AgentRuntime.js';
import { authMiddleware } from '../middleware/auth.js';
import { configService } from '../config/ConfigService.js';

const AGENT_IDS = ['atendimento', 'comercial', 'financeiro', 'suporte', 'recepcao'] as const;

const paramsSchema = z.object({ agentId: z.enum(AGENT_IDS) });

const bodySchema = z.object({
  conversationId: z.string().min(1),
  contactId: z.string().min(1),
  channel: z.string().min(1),
  messages: z.array(z.object({
    fromType: z.enum(['user', 'nina', 'human']),
    content: z.string(),
  })).min(1),
});

/**
 * The single frontend-facing contract (Adjustment 2/12): the frontend sends
 * a conversation to an agent by id and gets a final answer back. It never
 * knows about models, providers, or tools — the `AgentRuntime` decides
 * all of that.
 */
export async function agentChatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/agents/:agentId/chat', {
    preHandler: authMiddleware,
    // Tighter than the global default — this route pays for a real OpenAI
    // call per request, so it's the one that actually needs to bound cost.
    config: {
      rateLimit: {
        max: configService.getNumber('AGENT_CHAT_RATE_LIMIT_MAX', 20),
        timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
      },
    },
    schema: {
      tags: ['agents'],
      summary: 'Chat with an agent',
      description: 'Runs the AI Runtime pipeline (context, memory, knowledge, prompt, model, tools, handoff) for the given agent and returns the final answer.',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(404).send({ error: 'Agente não encontrado.' });
    }

    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: 'Corpo da requisição inválido.', details: bodyResult.error.flatten() });
    }

    try {
      const organizationId = (request.headers['x-organization-id'] as string | undefined) ?? 'default-org';
      const response = await runAgentChat(paramsResult.data.agentId, bodyResult.data, organizationId);
      return reply.send(response);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao processar a mensagem.' });
    }
  });
}
