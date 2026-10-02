import type { FastifyInstance } from 'fastify';
import { smartPixService, type SmartPixService } from '../smartPix/SmartPixService.js';

/**
 * Public read side of Smart Pix links: the /pix/{token} page (public/pix/smart.html)
 * calls this to get the data it shows. No auth — the customer opening the link
 * has nothing but the token, and the token is the credential.
 *
 * Every link that must not open (malformed, unknown, revoked, expired) gets the
 * same 404 and body, so the response never says whether a token exists.
 *
 * PRODUCTION REQUIREMENT: adicionar rate limiting específico para
 * `/v1/pix/smart/:token` na camada de proxy/rede quando o Smart Pix entrar no
 * fluxo de produção. Not done here on purpose: without `trustProxy` every
 * request reaches this process from the proxy's IP, so an in-app limit would be
 * one bucket shared by all customers.
 */
export const INVALID_LINK_BODY = { error: 'Link Pix inválido ou expirado.' } as const;

// Payment data: nothing between the browser and here may keep a copy.
const NO_STORE_HEADERS = {
  'cache-control': 'no-store',
  pragma: 'no-cache',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};

const paramsJsonSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string', pattern: '^[A-Za-z0-9_-]{22}$', description: 'Token do link Smart Pix (22 caracteres base64url).' },
  },
} as const;

const noopValidator = () => () => true;

export interface SmartPixRouteOptions {
  service?: SmartPixService;
}

export async function smartPixRoutes(app: FastifyInstance, opts: SmartPixRouteOptions): Promise<void> {
  const service = opts.service ?? smartPixService;

  app.get('/v1/pix/smart/:token', {
    validatorCompiler: noopValidator,
    schema: {
      tags: ['pix'],
      summary: 'Smart Pix: dados do link /pix/{token} (público, sem autenticação)',
      description: 'Devolve razão social, documento, tipo e chave Pix de um link válido. Link malformado, inexistente, revogado ou expirado: 404 com o mesmo corpo.',
      security: [],
      params: paramsJsonSchema,
    },
  }, async (request, reply) => {
    reply.headers(NO_STORE_HEADERS);
    const { token } = request.params as { token?: unknown };
    try {
      const data = await service.resolve(token);
      if (!data) return reply.code(404).send(INVALID_LINK_BODY);
      return reply.send({
        merchantName: data.merchantName,
        document: data.document,
        keyType: data.keyType,
        pixKey: data.pixKey,
      });
    } catch (error) {
      request.log.error(error, '[smart-pix] lookup failed');
      return reply.code(503).send({ error: 'Não foi possível carregar a chave Pix agora.' });
    }
  });
}
