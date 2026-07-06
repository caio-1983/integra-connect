import type { FastifyInstance } from 'fastify';
import { aiEventBus } from '../runtime/EventBus.js';
import { configService } from '../config/ConfigService.js';
import { ChannelEvents, type InboundWebhookReceivedPayload } from '../channels/channelEvents.js';

/**
 * Extremely thin channel ingress (Ajuste 5): validate the secret, publish a
 * raw event, ack 200 immediately. Knows nothing of Supabase, IA, Evolution,
 * OpenAI, tools — it only touches the EventBus. All processing happens async
 * off the bus, so a slow AI call never makes Evolution time out / retry.
 */
export async function channelWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/:provider/:secret', {
    schema: { tags: ['webhooks'], summary: 'Inbound channel webhook (thin ingress)' },
  }, async (request, reply) => {
    const { provider, secret } = request.params as { provider: string; secret: string };

    if (secret !== configService.require('EVOLUTION_WEBHOOK_SECRET')) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const payload: InboundWebhookReceivedPayload = { provider, rawBody: request.body };
    // Fire-and-forget: do NOT await the downstream chain — ack fast.
    void aiEventBus.publish({
      type: ChannelEvents.InboundWebhookReceived,
      payload: payload as unknown as Record<string, unknown>,
      timestamp: new Date(),
    });

    return reply.code(200).send({ received: true });
  });
}
