import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, authUserOf, requireRole, BEARER_SECURITY } from '../middleware/auth.js';
import { canAccessInstance, isValidInstanceName, requireInstanceAccess, requirePairingRole, INSTANCE_NAME_RE } from '../middleware/access.js';
import { whatsappConnections } from '../channels/whatsappConnections.js';
import { pairingGuard } from '../channels/evolution/pairingGuard.js';
import { accessRepository } from '../persistence/AccessRepository.js';
import { clientErrorMessage } from '../utils/httpErrors.js';

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
      maxLength: 64,
      pattern: INSTANCE_NAME_RE.source,
      description: 'Nome da instância Evolution a criar (e usar depois no QR/estado). Letras, dígitos, espaço, _ . -',
      example: 'integra-connect',
    },
  },
} as const;

// Same docs-only treatment (Sprint 012) for every route keyed by `:name`.
const nameParamsJsonSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 64, description: 'Nome da instância Evolution.', example: 'integra-connect' },
  },
} as const;

const noopValidator = () => () => true;

// Creating, removing and importing numbers is what the channels screen does for
// admins and managers (canManageUsers in the frontend). Pairing an existing
// number again (QR, state, reconnect, disconnect) is also open to the agent
// marked responsible for it, held to the same phone number by pairingGuard.
// Other agents only work the conversations of the numbers granted to them.
const MANAGE = [authMiddleware, requireRole('admin', 'manager')];
const MANAGE_INSTANCE = [...MANAGE, requireInstanceAccess];
const PAIR_INSTANCE = [authMiddleware, requirePairingRole, requireInstanceAccess];

const isManager = (role: string) => role === 'admin' || role === 'manager';

/**
 * Endpoints for the frontend connect flow (Fase 2), behind the caller's
 * session token. Every `:name` route also requires that the user can see that
 * number (private numbers stay their owner's). Delegates to
 * EvolutionConnectionService — the route itself holds no Evolution logic.
 */
export async function whatsappInstanceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/whatsapp/instances', {
    preHandler: authMiddleware,
    schema: {
      tags: ['whatsapp'],
      summary: 'List the Evolution instances this user can access (private numbers only for their owner; admins see the rest)',
      security: BEARER_SECURITY,
    },
  }, async (request, reply) => {
    try {
      const user = authUserOf(request);
      const [instances, visibility] = await Promise.all([
        whatsappConnections.listInstances(),
        accessRepository.getInstanceVisibility(user.id),
      ]);
      return reply.send(instances.filter((instance) => canAccessInstance(user, instance.name, visibility)));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao listar instâncias.') });
    }
  });

  app.post('/v1/whatsapp/instances', {
    preHandler: MANAGE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'],
      summary: 'Create instance + auto-register webhook (admin/manager)',
      security: BEARER_SECURITY,
      body: createBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'instanceName obrigatório' });
    const { instanceName } = parsed.data;
    if (!isValidInstanceName(instanceName)) {
      return reply.code(400).send({ error: 'Nome de instância inválido: use letras, números, espaço, _ . - (até 64).' });
    }

    try {
      const user = authUserOf(request);
      // Evolution's create is idempotent: an existing name returns that
      // instance's QR. So "creating" a number you cannot see would hand you its
      // pairing, and the grant below, which is why an existing name must
      // already be accessible.
      const [instances, visibility] = await Promise.all([
        whatsappConnections.listInstances(),
        accessRepository.getInstanceVisibility(user.id),
      ]);
      const exists = instances.some((instance) => instance.name === instanceName);
      if ((exists || visibility.privateOwners.has(instanceName)) && !canAccessInstance(user, instanceName, visibility)) {
        return reply.code(409).send({ error: 'Já existe uma instância com esse nome.' });
      }

      const result = await whatsappConnections.createInstance(instanceName);
      // Admins see every number; anyone else would lose sight of the number
      // they just created, so they get its grant.
      if (!exists && user.role !== 'admin') await accessRepository.grantInstanceAccess(instanceName, user.id);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao criar instância.') });
    }
  });

  app.get('/v1/whatsapp/instances/:name/qr', {
    preHandler: PAIR_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Fetch QR code (admin/manager or the number\'s responsible)', security: BEARER_SECURITY, params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await pairingGuard.watch(parsed.data.name, !isManager(authUserOf(request).role), { fresh: false });
      return reply.send(await whatsappConnections.getQr(parsed.data.name));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao obter QR.') });
    }
  });

  app.get('/v1/whatsapp/instances/:name/state', {
    preHandler: PAIR_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'],
      summary: 'Connection state (admin/manager or the number\'s responsible); `rejectedWrongNumber` when the last QR was read by another number',
      security: BEARER_SECURITY,
      params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    const { name } = parsed.data;
    try {
      const result = await whatsappConnections.getState(name);
      if (result.state === 'open') await pairingGuard.check(name);
      if (pairingGuard.wasRejected(name)) return reply.send({ state: 'close', rejectedWrongNumber: true });
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao obter estado.') });
    }
  });

  app.post('/v1/whatsapp/instances/:name/disconnect', {
    preHandler: PAIR_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Disconnect session (keeps the instance registered) (admin/manager or the number\'s responsible)', security: BEARER_SECURITY, params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await whatsappConnections.disconnect(parsed.data.name);
      return reply.send({ ok: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao desconectar.') });
    }
  });

  app.post('/v1/whatsapp/instances/:name/reconnect', {
    preHandler: PAIR_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Request a fresh QR code for an existing instance (admin/manager or the number\'s responsible)', security: BEARER_SECURITY, params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await pairingGuard.watch(parsed.data.name, !isManager(authUserOf(request).role), { fresh: true });
      const qr = await whatsappConnections.reconnect(parsed.data.name);
      return reply.send({ qr: qr.base64 });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao reconectar.') });
    }
  });

  app.post('/v1/whatsapp/instances/:name/contacts/import', {
    preHandler: MANAGE_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Import the WhatsApp address book synced for this instance (admin/manager)', security: BEARER_SECURITY, params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      return reply.send(await whatsappConnections.importContacts(parsed.data.name));
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao importar contatos.') });
    }
  });

  app.delete('/v1/whatsapp/instances/:name', {
    preHandler: MANAGE_INSTANCE,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['whatsapp'], summary: 'Remove an instance entirely (admin/manager)', security: BEARER_SECURITY, params: nameParamsJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = nameParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'name obrigatório' });
    try {
      await whatsappConnections.remove(parsed.data.name);
      return reply.send({ ok: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: clientErrorMessage(error, 'Erro ao remover instância.') });
    }
  });
}
