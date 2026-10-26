import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, authUserOf, BEARER_SECURITY } from '../middleware/auth.js';
import { requireConversationAccess, isValidInstanceName, userCanAccessInstance } from '../middleware/access.js';
import { clientErrorMessage } from '../utils/httpErrors.js';
import { requestManualReply, requestManualMediaReply, requestManualPixReply, requestMessageEdit, startConversation } from '../conversation/ConversationService.js';
import { evolutionConnectionService } from '../channels/evolution/EvolutionConnectionService.js';
import { summarizeConversation } from '../conversation/ConversationSummaryService.js';
import { getConversationInsight } from '../conversation/ConversationInsightService.js';
import { configService } from '../config/ConfigService.js';
import { transcriptionService } from '../transcription/TranscriptionService.js';

const paramsSchema = z.object({ conversationId: z.string().min(1) });

// The author of a reply (`messages.sent_by`, the signature, the "only your own
// message" edit rule) is the user behind the verified session token
// (request.authUser), never the body. `operatorId` is still accepted so an older
// frontend build does not fail, but it is ignored.
const bodySchema = z.object({
  content: z.string().min(1),
  operatorId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
});

// 32 MB cap: base64 inflates a file by ~33%, so this admits real WhatsApp media
// (images/short videos/documents) while bounding memory per request.
const MEDIA_BODY_LIMIT = 32 * 1024 * 1024;
const mediaBodySchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  caption: z.string().optional(),
  operatorId: z.string().uuid().optional(),
});

const OPERATOR_ID_DOC = {
  type: 'string',
  format: 'uuid',
  deprecated: true,
  description: 'Ignorado. O autor (messages.sent_by) é o usuário do token de sessão; o campo só é aceito para compatibilidade com builds antigos do frontend.',
} as const;

const mediaBodyJsonSchema = {
  type: 'object',
  required: ['base64', 'mimeType'],
  properties: {
    base64: { type: 'string', minLength: 1, description: 'Conteúdo do arquivo em base64 (sem o prefixo data:).' },
    mimeType: { type: 'string', minLength: 1, description: 'MIME type do arquivo.', example: 'image/png' },
    fileName: { type: 'string', description: 'Nome original do arquivo (rótulo do documento).' },
    caption: { type: 'string', description: 'Legenda opcional enviada junto da mídia.' },
    operatorId: OPERATOR_ID_DOC,
  },
} as const;

const replyBodyJsonSchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: { type: 'string', minLength: 1, description: 'Texto da resposta do atendente.' },
    operatorId: OPERATOR_ID_DOC,
    replyToMessageId: {
      type: 'string',
      format: 'uuid',
      description: 'ID (messages.id) da mensagem desta conversa que está sendo respondida — enviada citada no WhatsApp.',
    },
  },
} as const;

const editParamsSchema = z.object({ conversationId: z.string().min(1), messageId: z.string().uuid() });
const editBodySchema = z.object({
  content: z.string().trim().min(1),
  operatorId: z.string().uuid().optional(),
});

const editParamsJsonSchema = {
  type: 'object',
  required: ['conversationId', 'messageId'],
  properties: {
    conversationId: { type: 'string', minLength: 1, description: 'ID da conversa.' },
    messageId: { type: 'string', format: 'uuid', description: 'ID (messages.id) da mensagem a editar.' },
  },
} as const;

const editBodyJsonSchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: { type: 'string', minLength: 1, description: 'Novo texto da mensagem. Só a própria mensagem (do usuário do token) pode ser editada.' },
    operatorId: OPERATOR_ID_DOC,
  },
} as const;

// No key in the body on purpose: the Pix key is read server-side from
// Configurações, so the request can only ever send the registered one.
const pixBodySchema = z.object({
  operatorId: z.string().uuid().optional(),
}).optional();

const pixBodyJsonSchema = {
  type: 'object',
  properties: {
    operatorId: OPERATOR_ID_DOC,
  },
} as const;

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

const insightBodySchema = z.object({
  mode: z.enum(['default', 'shorter', 'alternative']).optional(),
}).optional();

const insightBodyJsonSchema = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['default', 'shorter', 'alternative'],
      description: 'default reaproveita o insight em cache enquanto não chega mensagem nova; shorter/alternative geram outra versão da resposta sugerida.',
    },
  },
} as const;

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
      security: BEARER_SECURITY,
      body: startBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = startBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'instance e phone são obrigatórios' });
    const { instance } = parsed.data;
    if (!isValidInstanceName(instance)) return reply.code(400).send({ error: 'Nome de instância inválido.' });

    try {
      // Only from a number this user works on, and one that really exists in
      // Evolution: otherwise anyone could open threads under any number, or
      // park conversations on an instance name that does not exist.
      if (!(await userCanAccessInstance(authUserOf(request), instance))) {
        return reply.code(404).send({ error: 'Instância não encontrada.' });
      }
      const instances = await evolutionConnectionService.listInstances();
      if (!instances.some((i) => i.name === instance)) {
        return reply.code(404).send({ error: 'Instância não encontrada.' });
      }

      const result = await startConversation(instance, parsed.data.phone, parsed.data.name, authUserOf(request).id);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao iniciar conversa.') });
    }
  });

  app.get('/v1/conversations/:conversationId/group-participants', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'List a WhatsApp group conversation\'s current members',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    try {
      return reply.send(await evolutionConnectionService.getGroupParticipants(parsed.data.conversationId));
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao carregar participantes.') });
    }
  });

  app.post('/v1/conversations/:conversationId/summary', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    // Each call pays for a real model request — same bound as agent chat.
    config: {
      rateLimit: {
        max: configService.getNumber('AGENT_CHAT_RATE_LIMIT_MAX', 20),
        timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
      },
    },
    schema: {
      tags: ['conversations'],
      summary: 'Summarize a conversation with Lu (motivo, contexto, pendências, última ação, próximo passo)',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    try {
      return reply.send(await summarizeConversation(parsed.data.conversationId));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: 'Erro ao gerar o resumo.' });
    }
  });

  app.post('/v1/conversations/:conversationId/insight', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    // A cache miss pays for a real model request — same bound as the summary.
    config: {
      rateLimit: {
        max: configService.getNumber('AGENT_CHAT_RATE_LIMIT_MAX', 20),
        timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
      },
    },
    schema: {
      tags: ['conversations'],
      summary: 'Lu copilot insight: suggested reply, customer need, detected fields, missing info and next steps',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
      body: insightBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'conversationId obrigatório' });
    const body = insightBodySchema.safeParse(request.body ?? undefined);
    if (!body.success) return reply.code(400).send({ error: 'mode inválido' });

    try {
      const insight = await getConversationInsight(parsed.data.conversationId, body.data?.mode ?? 'default');
      return insight ? reply.send(insight) : reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: 'Erro ao gerar a sugestão.' });
    }
  });

  app.post('/v1/conversations/:conversationId/reply', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'Send a human operator reply',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
      body: replyBodyJsonSchema,
    },
  }, async (request, reply) => {
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'content obrigatório' });

    try {
      await requestManualReply(
        paramsResult.data.conversationId,
        bodyResult.data.content,
        authUserOf(request).id,
        bodyResult.data.replyToMessageId,
      );
      return reply.code(202).send({ accepted: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao enviar resposta.') });
    }
  });

  app.post('/v1/conversations/:conversationId/messages/:messageId/edit', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'Edit the text of an operator\'s own message (WhatsApp, up to 15 minutes after sending)',
      security: BEARER_SECURITY,
      params: editParamsJsonSchema,
      body: editBodyJsonSchema,
    },
  }, async (request, reply) => {
    const paramsResult = editParamsSchema.safeParse(request.params);
    if (!paramsResult.success) return reply.code(400).send({ error: 'conversationId e messageId obrigatórios' });

    const bodyResult = editBodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'content obrigatório' });

    try {
      await requestMessageEdit(
        paramsResult.data.conversationId,
        paramsResult.data.messageId,
        bodyResult.data.content,
        authUserOf(request).id,
      );
      return reply.send({ edited: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao editar mensagem.') });
    }
  });

  app.post('/v1/conversations/:conversationId/messages/:messageId/transcribe', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    // Each call may pay for a real transcription request.
    config: {
      rateLimit: {
        max: configService.getNumber('AGENT_CHAT_RATE_LIMIT_MAX', 20),
        timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
      },
    },
    schema: {
      tags: ['conversations'],
      summary: 'Transcribe a customer voice note (manual retry / old audio). The text lands on messages.transcription.',
      security: BEARER_SECURITY,
      params: editParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = editParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'conversationId e messageId obrigatórios' });

    const result = await transcriptionService.transcribe(parsed.data.messageId, parsed.data.conversationId);
    if (result === 'not_found') return reply.code(404).send({ error: 'Áudio do cliente não encontrado nesta conversa.' });
    return reply.send({ status: result });
  });

  app.post('/v1/conversations/:conversationId/reply-media', {
    preHandler: [authMiddleware, requireConversationAccess],
    bodyLimit: MEDIA_BODY_LIMIT,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'Send a human operator media reply (image/video/audio/document)',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
      body: mediaBodyJsonSchema,
    },
  }, async (request, reply) => {
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    const bodyResult = mediaBodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'base64 e mimeType obrigatórios' });

    try {
      await requestManualMediaReply(paramsResult.data.conversationId, { ...bodyResult.data, operatorId: authUserOf(request).id });
      return reply.code(202).send({ accepted: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao enviar anexo.') });
    }
  });

  app.post('/v1/conversations/:conversationId/reply-pix', {
    preHandler: [authMiddleware, requireConversationAccess],
    validatorCompiler: noopValidator,
    schema: {
      tags: ['conversations'],
      summary: 'Send the company\'s registered Pix key as a card with a "Copiar chave Pix" button',
      security: BEARER_SECURITY,
      params: conversationParamsJsonSchema,
      body: pixBodyJsonSchema,
    },
  }, async (request, reply) => {
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return reply.code(400).send({ error: 'conversationId obrigatório' });

    const bodyResult = pixBodySchema.safeParse(request.body ?? undefined);
    if (!bodyResult.success) return reply.code(400).send({ error: 'operatorId inválido' });

    try {
      await requestManualPixReply(paramsResult.data.conversationId, authUserOf(request).id);
      return reply.code(202).send({ accepted: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: clientErrorMessage(error, 'Erro ao enviar a chave Pix.') });
    }
  });
}
