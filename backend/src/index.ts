import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { configService } from './config/ConfigService.js';
import { logger } from './logger/Logger.js';
import { healthRoutes } from './routes/health.js';
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

async function main(): Promise<void> {
  const app = Fastify({ loggerInstance: logger });

  // Fail closed, not open: an unset ALLOWED_ORIGIN must stop boot, never
  // silently fall back to reflecting any origin.
  await app.register(cors, { origin: configService.require('ALLOWED_ORIGIN') });

  await app.register(rateLimit, {
    max: configService.getNumber('RATE_LIMIT_MAX', 120),
    timeWindow: configService.getNumber('RATE_LIMIT_WINDOW_MS', 60_000),
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
      info: { title: 'Integra Connect — AI Runtime', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
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
