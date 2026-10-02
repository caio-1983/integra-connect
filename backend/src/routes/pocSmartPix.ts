import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { configService } from '../config/ConfigService.js';
import { DEFAULT_TTL_DAYS, MAX_TTL_DAYS, smartPixService, type SmartPixService } from '../smartPix/SmartPixService.js';
import { isWellFormedSmartPixToken } from '../smartPix/token.js';
import type { SmartPixData } from '../persistence/SmartPixRepository.js';

/**
 * POC — create and revoke Smart Pix links for the fixed POC Pix data, by hand
 * (PowerShell), ahead of wiring links into the real Pix flow. Touches nothing
 * of that flow (PIX_CARD_STYLE, sendPix, requestManualPixReply).
 *
 * Guarded by its own SMART_PIX_ADMIN_KEY, never by GATEWAY_API_KEY: that one
 * ships inside the frontend bundle, and nothing in the frontend calls these
 * routes. The key lives in the backend environment only. Unset or shorter than
 * 32 characters, the routes answer 401 to everyone.
 */
const POC_PIX: SmartPixData = {
  merchantName: 'Lumina Comércio de Iluminação LTDA',
  document: '38.230.659/0001-07',
  keyType: 'cnpj',
  pixKey: '38230659000107',
};

const MIN_ADMIN_KEY_LENGTH = 32;

function configuredAdminKey(): string | undefined {
  const key = configService.get('SMART_PIX_ADMIN_KEY');
  return key && key.length >= MIN_ADMIN_KEY_LENGTH ? key : undefined;
}

// Equal-length digests let timingSafeEqual compare keys of any length.
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

async function smartPixAdminAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const expected = configuredAdminKey();
  const header = request.headers.authorization;
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!expected || !provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
}

const tokenBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(MAX_TTL_DAYS).optional(),
});

const tokenBodyJsonSchema = {
  type: 'object',
  properties: {
    expiresInDays: { type: 'integer', minimum: 1, maximum: MAX_TTL_DAYS, default: DEFAULT_TTL_DAYS, description: 'Validade do link em dias.' },
  },
} as const;

const revokeBodyJsonSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string', pattern: '^[A-Za-z0-9_-]{22}$', description: 'Token do link a revogar.' },
  },
} as const;

const noopValidator = () => () => true;

export interface PocSmartPixRouteOptions {
  service?: SmartPixService;
}

export async function pocSmartPixRoutes(app: FastifyInstance, opts: PocSmartPixRouteOptions): Promise<void> {
  const service = opts.service ?? smartPixService;
  if (!configuredAdminKey()) {
    app.log.warn('[smart-pix] SMART_PIX_ADMIN_KEY unset or shorter than 32 characters — /v1/poc/smart-pix/* answers 401');
  }

  app.post('/v1/poc/smart-pix/token', {
    preHandler: smartPixAdminAuth,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['poc'],
      summary: 'POC: gerar um link Smart Pix para o Pix fixo do POC',
      description: 'Bearer SMART_PIX_ADMIN_KEY. O token puro só aparece nesta resposta; o banco guarda apenas o SHA-256.',
      security: [{ bearerAuth: [] }],
      body: tokenBodyJsonSchema,
    },
  }, async (request, reply) => {
    const bodyResult = tokenBodySchema.safeParse(request.body ?? {});
    if (!bodyResult.success) return reply.code(400).send({ error: `expiresInDays deve ser um inteiro de 1 a ${MAX_TTL_DAYS}.` });
    reply.header('cache-control', 'no-store');
    try {
      const base = configService.require('PUBLIC_BASE_URL').replace(/\/$/, '');
      const { token, expiresAt } = await service.createToken(POC_PIX, bodyResult.data.expiresInDays ?? DEFAULT_TTL_DAYS);
      return reply.code(201).send({ token, url: `${base}/pix/${token}`, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      request.log.error(error, '[smart-pix] token creation failed');
      return reply.code(500).send({ error: 'Não foi possível gerar o link.' });
    }
  });

  app.post('/v1/poc/smart-pix/revoke', {
    preHandler: smartPixAdminAuth,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['poc'],
      summary: 'POC: revogar um link Smart Pix',
      description: 'Bearer SMART_PIX_ADMIN_KEY. Recebe o token, calcula o SHA-256 e revoga pelo hash. revoked=false quando o link não existe ou já estava revogado.',
      security: [{ bearerAuth: [] }],
      body: revokeBodyJsonSchema,
    },
  }, async (request, reply) => {
    const token = (request.body as { token?: unknown } | undefined)?.token;
    if (!isWellFormedSmartPixToken(token)) return reply.code(400).send({ error: 'Token em formato inválido.' });
    try {
      return reply.send({ revoked: await service.revoke(token) });
    } catch (error) {
      request.log.error(error, '[smart-pix] revoke failed');
      return reply.code(500).send({ error: 'Não foi possível revogar o link.' });
    }
  });
}
