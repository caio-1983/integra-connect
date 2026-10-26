import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { configService } from './config/ConfigService.js';
import { logger } from './logger/Logger.js';
import { verifiedUserIdOf } from './middleware/auth.js';
import { healthRoutes, APP_VERSION } from './routes/health.js';
import { agentChatRoutes } from './routes/agentChat.js';
import { channelWebhookRoutes } from './routes/channelWebhooks.js';
import { whatsappInstanceRoutes } from './routes/whatsappInstances.js';
import { conversationReplyRoutes } from './routes/conversationReply.js';
import { metaAccountRoutes } from './routes/metaAccounts.js';
import { smartPixRoutes } from './routes/smartPix.js';
import { lightingProjectRoutes } from './routes/lightingProjects.js';
// Side-effect imports: each subscribes its handlers to the EventBus at boot.
import './telemetry/TelemetryService.js';
import './channels/ChannelOrchestrator.js';
import './channels/OutboundMessageService.js';
import './conversation/ConversationService.js';

/**
 * Which hops may set X-Forwarded-For. Production sits behind nginx-proxy-manager
 * on the same host, reaching this container over Docker's private network, so
 * the default trusts loopback and private ranges only: `request.ip` becomes the
 * real client for the rate limiter, while a client connecting directly (not
 * through the proxy) cannot spoof its address with the header.
 * TRUST_PROXY: 'false' | 'true' | comma-separated IPs/CIDRs/presets. (No hop
 * count: Fastify 5.12 types drop it, and it is the spoofable mode.)
 */
function trustProxySetting(): boolean | string {
  const raw = (configService.get('TRUST_PROXY') ?? '').trim();
  if (!raw) return 'loopback,linklocal,uniquelocal';
  if (raw === 'false') return false;
  if (raw === 'true') return true;
  return raw;
}

async function main(): Promise<void> {
  const app = Fastify({ loggerInstance: logger, trustProxy: trustProxySetting() });

  // 5xx bodies never carry the error's own message (upstream bodies, SQL, key
  // fragments); the full error goes to the log. 4xx keep Fastify's default
  // body, which is written for the client (bad JSON, body too large, 429).
  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
    const status = typeof statusCode === 'number' && statusCode >= 400 ? statusCode : 500;
    if (status >= 500) {
      request.log.error(error);
      return reply.code(status).send({ error: 'Erro interno do servidor.' });
    }
    return reply.code(status).send(error);
  });

  // Fail closed, not open: an unset ALLOWED_ORIGIN must stop boot, never
  // silently fall back to reflecting any origin.
  await app.register(cors, { origin: configService.require('ALLOWED_ORIGIN') });

  await app.register(rateLimit, {
    max: configService.getNumber('RATE_LIMIT_MAX', 120),
    timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    // Per person once their token is verified (the limiter runs before auth,
    // so only an already-verified token counts), per client IP otherwise.
    // Attendants behind one office NAT no longer share a single bucket.
    keyGenerator: (request) => {
      const userId = verifiedUserIdOf(request);
      return userId ? `user:${userId}` : `ip:${request.ip}`;
    },
  });

  // The docs are a map of the whole attack surface: every route, param and
  // auth scheme. Served unauthenticated they let anyone enumerate the API, so
  // they stay off in production unless ENABLE_API_DOCS is explicitly set.
  // Registering swagger itself is harmless (it only builds the spec in memory);
  // it is swaggerUi that publishes /docs and /docs/json.
  const docsEnabled =
    (configService.get('ENABLE_API_DOCS') ?? '').toLowerCase() === 'true' ||
    configService.get('NODE_ENV') !== 'production';

  await app.register(swagger, {
    openapi: {
      info: { title: 'Integra Connect — AI Runtime', version: APP_VERSION },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Access token da sessão Supabase do usuário (supabase.auth.getSession()). O papel (user_roles) e o acesso por número são verificados no servidor.',
          },
        },
      },
    },
  });
  if (docsEnabled) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { persistAuthorization: true },
    });
  } else {
    logger.info('API docs disabled (NODE_ENV=production without ENABLE_API_DOCS=true)');
  }

  await app.register(healthRoutes);
  await app.register(agentChatRoutes);
  await app.register(channelWebhookRoutes);
  await app.register(whatsappInstanceRoutes);
  await app.register(conversationReplyRoutes);
  await app.register(metaAccountRoutes);
  await app.register(smartPixRoutes);
  await app.register(lightingProjectRoutes);

  const port = configService.getNumber('PORT', 8787);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`AI Runtime listening on port ${port}${docsEnabled ? ' — docs at /docs' : ''}`);
}

main().catch((error) => {
  logger.error(error, 'Failed to start AI Runtime');
  process.exit(1);
});
