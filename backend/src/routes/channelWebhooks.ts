import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { aiEventBus } from '../runtime/EventBus.js';
import { configService } from '../config/ConfigService.js';
import { ChannelEvents, type InboundWebhookReceivedPayload } from '../channels/channelEvents.js';

/**
 * Extremely thin channel ingress (Ajuste 5): validate the secret, publish a
 * raw event, ack 200 immediately. Knows nothing of Supabase, IA, Evolution,
 * OpenAI, tools — it only touches the EventBus. All processing happens async
 * off the bus, so a slow AI call never makes Evolution time out / retry.
 *
 * Two providers now share this ingress:
 *   - `evolution` (WhatsApp): URL-path secret only.
 *   - `meta` (Messenger + Instagram Direct): URL-path secret, PLUS a GET
 *     verification handshake Meta requires before it will deliver anything, PLUS
 *     an `X-Hub-Signature-256` HMAC over the raw body.
 */

const noopValidator = () => () => true;

const webhookParamsJsonSchema = {
  type: 'object',
  required: ['provider', 'secret'],
  properties: {
    provider: { type: 'string', description: 'Conector de destino.', enum: ['evolution', 'meta'] },
    secret: { type: 'string', description: 'Segredo compartilhado no caminho da URL.' },
  },
} as const;

const verifyQueryJsonSchema = {
  type: 'object',
  properties: {
    'hub.mode': { type: 'string', example: 'subscribe' },
    'hub.verify_token': { type: 'string', description: 'Comparado com META_WEBHOOK_VERIFY_TOKEN.' },
    'hub.challenge': { type: 'string', description: 'Ecoado de volta em texto puro quando o token confere.' },
  },
} as const;

/**
 * The URL-path secret expected for a provider.
 *
 * Meta gets its own so its callback URL can be rotated independently of the
 * Evolution one, but falls back to the Evolution secret — a single deployment
 * that never sets META_WEBHOOK_SECRET keeps working instead of silently
 * rejecting every Meta delivery.
 */
function expectedPathSecret(provider: string): string {
  if (provider === 'meta') {
    return configService.get('META_WEBHOOK_SECRET') ?? configService.require('EVOLUTION_WEBHOOK_SECRET');
  }
  return configService.require('EVOLUTION_WEBHOOK_SECRET');
}

/**
 * Verifies Meta's `X-Hub-Signature-256` over the exact bytes received.
 *
 * Must run against the RAW body: re-serializing the parsed JSON changes key
 * order and whitespace, which changes the HMAC — a signature check on
 * `JSON.stringify(request.body)` would fail on valid payloads and pass nothing
 * useful.
 *
 * Returns true when `META_APP_SECRET` is unset, so signature enforcement is
 * opt-in and an incomplete config doesn't drop real traffic. The URL-path secret
 * still gates the endpoint in that case.
 */
function metaSignatureValid(request: FastifyRequest): boolean {
  const appSecret = configService.get('META_APP_SECRET');
  if (!appSecret) return true;

  const header = request.headers['x-hub-signature-256'];
  if (typeof header !== 'string' || !header.startsWith('sha256=')) return false;

  const raw = (request as FastifyRequest & { rawBody?: string }).rawBody;
  if (raw === undefined) return false;

  const expected = createHmac('sha256', appSecret).update(raw, 'utf8').digest('hex');
  const received = header.slice('sha256='.length);
  // Both are fixed-length hex digests; the length guard keeps timingSafeEqual
  // from throwing on a malformed header.
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

export async function channelWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Keeps the raw request body alongside the parsed one, for Meta's HMAC.
  // Encapsulated to this plugin, so no other route's parsing changes.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, bodyString: string, done) => {
    (request as FastifyRequest & { rawBody?: string }).rawBody = bodyString;
    try {
      done(null, bodyString.length > 0 ? JSON.parse(bodyString) : {});
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  /**
   * Meta's subscription handshake. It calls this once when the webhook is
   * configured and refuses to deliver anything until it gets `hub.challenge`
   * echoed back as plain text — same protocol the legacy
   * supabase/functions/whatsapp-webhook implemented for the Cloud API.
   */
  app.get('/webhooks/:provider/:secret', {
    validatorCompiler: noopValidator,
    // Exempt from the global rate limit — see the POST handler below for why.
    config: { rateLimit: false },
    schema: {
      tags: ['webhooks'],
      summary: 'Meta webhook subscription verification (hub.challenge handshake)',
      params: webhookParamsJsonSchema,
      querystring: verifyQueryJsonSchema,
    },
  }, async (request, reply) => {
    const { provider, secret } = request.params as { provider: string; secret: string };
    const query = request.query as Record<string, string | undefined>;

    if (secret !== expectedPathSecret(provider)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const verifyToken = configService.get('META_WEBHOOK_VERIFY_TOKEN');
    if (query['hub.mode'] === 'subscribe' && verifyToken && query['hub.verify_token'] === verifyToken) {
      // Plain text, not JSON — Meta compares the body byte-for-byte.
      return reply.code(200).type('text/plain').send(query['hub.challenge'] ?? '');
    }

    return reply.code(403).send({ error: 'forbidden' });
  });

  app.post('/webhooks/:provider/:secret', {
    validatorCompiler: noopValidator,
    // The global rate limit keys on IP, and EVERY delivery from Evolution or
    // Meta arrives from a single provider IP. A busy number would therefore
    // rate-limit itself: past RATE_LIMIT_MAX in the window the provider gets
    // 429s and inbound messages are dropped on the floor. The limit exists to
    // cap cost on the paid OpenAI-backed endpoints, which these are not — the
    // handler only checks the path secret and publishes to the event bus.
    // Authentication here is the unguessable `:secret` segment, not throttling.
    config: { rateLimit: false },
    schema: {
      tags: ['webhooks'],
      summary: 'Inbound channel webhook (thin ingress)',
      params: webhookParamsJsonSchema,
    },
  }, async (request, reply) => {
    const { provider, secret } = request.params as { provider: string; secret: string };

    if (secret !== expectedPathSecret(provider)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    if (provider === 'meta' && !metaSignatureValid(request)) {
      request.log.warn('[webhooks] meta signature mismatch — payload rejected');
      return reply.code(401).send({ error: 'invalid signature' });
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
