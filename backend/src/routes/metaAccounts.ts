import type { FastifyInstance } from 'fastify';
import { authMiddleware, requireRole, BEARER_SECURITY } from '../middleware/auth.js';
import { configService } from '../config/ConfigService.js';
import { configuredMetaAccounts } from '../channels/meta/MetaClient.js';

/**
 * Read-only view of the configured Meta accounts (Facebook Pages / Instagram
 * professional accounts).
 *
 * Unlike WhatsApp, there is nothing to pair from the UI: a Meta account is
 * connected by putting its page access token in `META_PAGE_TOKENS` and pointing
 * Meta's webhook at this backend. So this endpoint reports what IS configured
 * rather than offering a connect flow, and hands back the callback URL to paste
 * into the Meta app — with the path secret as a `{META_WEBHOOK_SECRET}`
 * placeholder: the secret authenticates inbound deliveries, so it never leaves
 * the server (the operator copies it from the stack env). Admin/manager only,
 * like the rest of the channels admin surface.
 */
export async function metaAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/meta/accounts', {
    preHandler: [authMiddleware, requireRole('admin', 'manager')],
    schema: {
      tags: ['meta'],
      summary: 'List configured Meta accounts (Messenger/Instagram) and webhook setup values (admin/manager)',
      security: BEARER_SECURITY,
    },
  }, async (request, reply) => {
    try {
      const accounts = configuredMetaAccounts();
      const publicUrl = configService.get('PUBLIC_BASE_URL');
      const secretConfigured = Boolean(configService.get('META_WEBHOOK_SECRET'));

      return reply.send({
        accounts: accounts.map((id) => ({ id, connected: true })),
        // Null rather than a half-built string when PUBLIC_BASE_URL or the Meta
        // secret isn't set — showing a URL that cannot work is worse than none.
        // Meta deliveries are refused without META_WEBHOOK_SECRET (no fallback
        // to the Evolution secret) and without META_APP_SECRET.
        webhookUrl: publicUrl && secretConfigured ? `${publicUrl.replace(/\/$/, '')}/webhooks/meta/{META_WEBHOOK_SECRET}` : null,
        webhookSecretConfigured: secretConfigured,
        verifyTokenConfigured: Boolean(configService.get('META_WEBHOOK_VERIFY_TOKEN')),
        signatureCheckEnabled: Boolean(configService.get('META_APP_SECRET')),
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Erro ao listar contas Meta.' });
    }
  });
}
