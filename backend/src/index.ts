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
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { persistAuthorization: true },
  });

  await app.register(healthRoutes);
  await app.register(agentChatRoutes);
  await app.register(channelWebhookRoutes);
  await app.register(whatsappInstanceRoutes);
  await app.register(conversationReplyRoutes);

  const port = configService.getNumber('PORT', 8787);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`AI Runtime listening on port ${port} — docs at /docs`);
}

main().catch((error) => {
  logger.error(error, 'Failed to start AI Runtime');
  process.exit(1);
});
