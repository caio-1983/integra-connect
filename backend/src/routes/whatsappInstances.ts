import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { evolutionConnectionService } from '../channels/evolution/EvolutionConnectionService.js';

const createBody = z.object({ instanceName: z.string().min(1) });
const nameParams = z.object({ name: z.string().min(1) });

// Docs-only JSON Schema mirroring `createBody` above, for the Swagger UI body
// editor. Runtime validation still happens via the zod `safeParse` below —
// `noopValidator` keeps Fastify from also validating against this schema, so
// the existing auth-before-validation order and error shape are untouched.
const createBodyJsonSchema = {
  type: 'object',
  required: ['instanceName'],
  properties: {
    instanceName: {
      type: 'string',
      minLength: 1,
      description: 'Nome da instância Evolution a criar (e usar depois no QR/estado).',
      example: 'integra-connect',
    },
  },
} as const;

// Same docs-only treatment (Sprint 012) for every route keyed by `:name`.
const nameParamsJsonSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, description: 'Nome da instância Evolution.', example: 'integra-connect' },
  },
} as const;

const noopValidator = () => () => true;

/**
 * Admin endpoints for the frontend connect flow (Fase 2). Behind the same
 * Bearer `GATEWAY_API_KEY` as the rest of the admin surface. Delegates to
 * EvolutionConnectionService — the route itself holds no Evolution logic.
 */
export async function whatsappInstanceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/whatsapp/instances', {
    preHandler: authMiddleware,
    schema: { tags: ['whatsapp'], summary: 'List all Evolution instances', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      return reply.send(await evolutionConnectionService.listInstances());
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao listar instâncias.' });
    }
  });

  app.post('/v1/whatsapp/instances', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'],
      summary: 'Create instance + auto-register webhook',
      security: [{ bearerAuth: [] }],
      body: createBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'instanceName obrigatório' });
    try {
      const result = await evolutionConnectionService.createInstance(parsed.data.instanceName);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao criar instância.' });
    }
  });

  app.get('/v1/whatsapp/instances/:name/qr', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Fetch QR code', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      return reply.send(await evolutionConnectionService.getQr(parsed.data.name));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao obter QR.' });
    }
  });

  app.get('/v1/whatsapp/instances/:name/state', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Connection state', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      return reply.send(await evolutionConnectionService.getState(parsed.data.name));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao obter estado.' });
    }
  });

  app.post('/v1/whatsapp/instances/:name/disconnect', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Disconnect session (keeps the instance registered)', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await evolutionConnectionService.disconnect(parsed.data.name);
      return reply.send({ ok: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao desconectar.' });
    }
  });

  app.post('/v1/whatsapp/instances/:name/reconnect', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Request a fresh QR code for an existing instance', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      const qr = await evolutionConnectionService.reconnect(parsed.data.name);
      return reply.send({ qr: qr.base64 });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao reconectar.' });
    }
  });

  app.post('/v1/whatsapp/instances/:name/contacts/import', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Import the WhatsApp address book synced for this instance', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      return reply.send(await evolutionConnectionService.importContacts(parsed.data.name));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao importar contatos.' });
    }
  });

  app.delete('/v1/whatsapp/instances/:name', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Remove an instance entirely', security: [{ bearerAuth: [] }], params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await evolutionConnectionService.remove(parsed.data.name);
      return reply.send({ ok: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: error instanceof Error ? error.message : 'Erro ao remover instância.' });
    }
  });
}
