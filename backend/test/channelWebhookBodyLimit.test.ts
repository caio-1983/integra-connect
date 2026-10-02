import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import { channelWebhookRoutes } from '../src/routes/channelWebhooks.js';
import { aiEventBus } from '../src/runtime/EventBus.js';
import { ChannelEvents } from '../src/channels/channelEvents.js';

/**
 * Evolution embeds the media as base64 in `messages.upsert`, so a video or PDF
 * over ~600 KB makes a body past Fastify's 1 MiB default. Those were refused
 * with 413 and never reached the system.
 */
const SECRET = 'test-webhook-secret';
process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;

const received: unknown[] = [];
aiEventBus.on(ChannelEvents.InboundWebhookReceived, (event) => { received.push(event.payload); });

let app: FastifyInstance;

before(async () => {
  app = Fastify();
  await app.register(channelWebhookRoutes);
  await app.ready();
});

after(() => app.close());

/** A `messages.upsert` with a video of `fileBytes` embedded as base64. */
const upsertWithVideo = (fileBytes: number) => JSON.stringify({
  event: 'messages.upsert',
  instance: 'integra-connect',
  data: {
    key: { id: 'VIDEO1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
    message: { videoMessage: { mimetype: 'video/mp4' }, base64: Buffer.alloc(fileBytes).toString('base64') },
  },
});

const post = (secret: string, payload: string) =>
  app.inject({ method: 'POST', url: `/webhooks/evolution/${secret}`, headers: { 'content-type': 'application/json' }, payload });

describe('POST /webhooks/:provider/:secret body size', () => {
  test('accepts a 15 MB video embedded as base64', async () => {
    received.length = 0;
    const res = await post(SECRET, upsertWithVideo(15 * 1024 * 1024));
    assert.equal(res.statusCode, 200);
    assert.equal(received.length, 1);
  });

  test('a wrong secret is refused with 401, even with a large body', async () => {
    received.length = 0;
    const res = await post('wrong', upsertWithVideo(15 * 1024 * 1024));
    assert.equal(res.statusCode, 401);
    assert.equal(received.length, 0);
  });

  test('a body past the limit is still refused', async () => {
    const res = await post(SECRET, upsertWithVideo(50 * 1024 * 1024));
    assert.equal(res.statusCode, 413);
  });
});
