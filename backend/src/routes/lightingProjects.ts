import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { analyzeMessageAttachment, analyzePdf, scanMessageAttachments, ProjectInputError } from '../projects/LightingProjectService.js';

const noopValidator = () => () => true;

// base64 inflates ~33%: 70 MB of body admits the 50 MB PDF cap.
const UPLOAD_BODY_LIMIT = 70 * 1024 * 1024;

const messageParamsSchema = z.object({ messageId: z.string().uuid() });
const scanBodySchema = z.object({ messageIds: z.array(z.string().uuid()).min(1).max(100) });
const uploadBodySchema = z.object({ base64: z.string().min(1), fileName: z.string().optional() });

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof ProjectInputError) return reply.code(400).send({ error: error.message });
  reply.log.error(error);
  return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao ler o projeto.' });
}

export async function lightingProjectRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/projects/messages/:messageId/analyze', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['projects'],
      summary: 'Count the luminaires in a lighting project PDF received in a chat message',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['messageId'],
        properties: { messageId: { type: 'string', format: 'uuid', description: 'ID da mensagem (messages.id) com o PDF anexado.' } },
      },
    },
  }, async (request, reply) => {
    const parsed = messageParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'messageId inválido' });
    try {
      return reply.send(await analyzeMessageAttachment(parsed.data.messageId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/v1/projects/scan', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['projects'],
      summary: 'Tell which chat PDFs are lighting projects (luminaire codes on the plan)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['messageIds'],
        properties: {
          messageIds: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', format: 'uuid' }, description: 'IDs das mensagens com PDF anexado.' },
        },
      },
    },
  }, async (request, reply) => {
    const parsed = scanBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'messageIds inválido (1 a 100 UUIDs)' });
    try {
      return reply.send(await scanMessageAttachments(parsed.data.messageIds));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/v1/projects/analyze', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    bodyLimit: UPLOAD_BODY_LIMIT,
    schema: {
      tags: ['projects'],
      summary: 'Count the luminaires in an uploaded lighting project PDF',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['base64'],
        properties: {
          base64: { type: 'string', minLength: 1, description: 'PDF em base64 (sem o prefixo data:).' },
          fileName: { type: 'string', description: 'Nome original do arquivo.' },
        },
      },
    },
  }, async (request, reply) => {
    const parsed = uploadBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'base64 obrigatório' });
    try {
      const data = new Uint8Array(Buffer.from(parsed.data.base64, 'base64'));
      return reply.send(await analyzePdf(data, parsed.data.fileName ?? null));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
