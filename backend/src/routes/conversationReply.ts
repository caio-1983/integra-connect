import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requestManualReply, startConversation } from '../conversation/ConversationService.js';
import { evolutionConnectionService } from '../channels/evolution/EvolutionConnectionService.js';

const paramsSchema = z.object({ conversationId: z.string().min(1) });
const bodySchema = z.object({ content: z.string().min(1) });

const conversationParamsJsonSchema = {
  type: 'object',
  required: ['conversationId'],
  properties: {
    conversationId: { type: 'string', minLength: 1, description: 'ID da conversa.' },
  },
} as const;

const startBodySchema = z.object({
  instance: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().optional(),
});

const noopValidator = () => () => true;

const startBodyJsonSchema = {
  type: 'object',
  required: ['instance', 'phone'],
  properties: {
    instance: { type: 'string', minLength: 1, description: 'Nome da instância Evolution a usar no envio.', example: 'integra-connect' },
    phone: { type: 'string', minLength: 1, description: 'Telefone em qualquer formato (dígitos são extraídos).', example: '+55 21 99999-9999' },
    name: { type: 'string', description: 'Nome do contato, se ainda não existir.' },
  },
} as const;

/**
 * Lets the Workspace's human operator send a reply through the same
 * channel-agnostic outbound pipeline the AI uses (Ajuste 4/7) — the route
 * itself knows nothing about Evolution/WhatsApp; ConversationService resolves
 * the right connector from what was stored on the conversation.
 */
export async function conversationReplyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/conversations/start', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'Find or create a contact + conversation ahead of the first message ("Nova Conversa")',
      security: [{ bearerAuth: [] }],
      body: startBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = startBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'instance e phone são obrigatórios' });

    try {
      const result = await startConversation(parsed.data.instance, parsed.data.phone, parsed.data.name);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Erro ao iniciar conversa.' });
    }
  });

  app.get('/v1/conversations/:conversationId/group-participants', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'List a WhatsApp group conversation\'s current members',
      security: [{ bearerAuth: [] }],
      params: conversationParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    try {
      return reply.send(await evolutionConnectionService.getGroupParticipants(parsed.data.conversationId));
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Erro ao carregar participantes.' });
    }
  });

  app.post('/v1/conversations/:conversationId/reply', {
    preHandler: authMiddleware,
    schema: {
      tags: ['conversations'],
      summary: 'Send a human operator reply',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'content obrigatório' });

    try {
      await requestManualReply(paramsResult.data.conversationId, bodyResult.data.content);
      return reply.code(202).send({ accepted: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Erro ao enviar resposta.' });
    }
  });
}
