import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { configService } from '../config/ConfigService.js';
import { configuredMetaAccounts } from '../channels/meta/MetaClient.js';

/**
 * Read-only view of the configured Meta accounts (Facebook Pages / Instagram
 * professional accounts).
 *
 * Unlike WhatsApp, there is nothing to pair from the UI: a Meta account is
 * connected by putting its page access token in `META_PAGE_TOKENS` and pointing
 * Meta's webhook at this backend. So this endpoint reports what IS configured
 * rather than offering a connect flow, and hands back the exact callback URL and
 * verify token to paste into the Meta app — the two values people most often get
 * wrong.
 */
export async function metaAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/meta/accounts', {
    preHandler: authMiddleware,
    schema: {
      tags: ['meta'],
      summary: 'List configured Meta accounts (Messenger/Instagram) and webhook setup values',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const accounts = configuredMetaAccounts();
      const publicUrl = configService.get('PUBLIC_BASE_URL');
      const secret = configService.get('META_WEBHOOK_SECRET') ?? configService.get('EVOLUTION_WEBHOOK_SECRET');

      return reply.send({
        accounts: accounts.map((id) => ({ id, connected: true })),
        // Null rather than a half-built string when PUBLIC_BASE_URL isn't set —
        // showing a wrong URL is worse than showing none.
        webhookUrl: publicUrl && secret ? `${publicUrl.replace(/\/$/, '')}/webhooks/meta/${secret}` : null,
        verifyTokenConfigured: Boolean(configService.get('META_WEBHOOK_VERIFY_TOKEN')),
        signatureCheckEnabled: Boolean(configService.get('META_APP_SECRET')),
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: error instanceof Error ? error.message : 'Erro ao listar contas Meta.' });
    }
  });
}
