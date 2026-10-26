import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import { storageMedia } from '../src/persistence/ConversationRepository.js';
import { isAllowedMetaMediaUrl } from '../src/channels/meta/MetaChannelConnector.js';
import { redactUrl } from '../src/logger/Logger.js';
import { clientErrorMessage } from '../src/utils/httpErrors.js';
import { channelWebhookRoutes } from '../src/routes/channelWebhooks.js';

describe('storageMedia (public bucket Content-Type and extension)', () => {
  test('media and common documents keep their type', () => {
    assert.deepEqual(storageMedia('image/jpeg'), { contentType: 'image/jpeg', ext: 'jpg' });
    assert.deepEqual(storageMedia('audio/ogg; codecs=opus'), { contentType: 'audio/ogg', ext: 'ogg' });
    assert.deepEqual(storageMedia('video/mp4'), { contentType: 'video/mp4', ext: 'mp4' });
    assert.deepEqual(storageMedia('application/pdf', 'x.pdf'), { contentType: 'application/pdf', ext: 'pdf' });
  });

  test('HTML and SVG are stored as opaque downloads, never with an active extension', () => {
    assert.deepEqual(storageMedia('text/html', 'page.html'), { contentType: 'application/octet-stream', ext: 'bin' });
    assert.deepEqual(storageMedia('image/svg+xml', 'logo.svg'), { contentType: 'application/octet-stream', ext: 'bin' });
  });

  test('an unknown type keeps a harmless extension from the file name as a label', () => {
    assert.deepEqual(storageMedia('application/x-dwg', 'planta.dwg'), { contentType: 'application/octet-stream', ext: 'dwg' });
  });
});

describe('isAllowedMetaMediaUrl', () => {
  test('Meta CDN over https passes', () => {
    assert.equal(isAllowedMetaMediaUrl('https://scontent.xx.fbcdn.net/v/t1/abc.jpg?x=1'), true);
    assert.equal(isAllowedMetaMediaUrl('https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1'), true);
  });

  test('anything else is refused', () => {
    assert.equal(isAllowedMetaMediaUrl('http://scontent.xx.fbcdn.net/a.jpg'), false);
    assert.equal(isAllowedMetaMediaUrl('https://169.254.169.254/latest/meta-data'), false);
    assert.equal(isAllowedMetaMediaUrl('https://evil.com/?.fbcdn.net'), false);
    assert.equal(isAllowedMetaMediaUrl('https://fbcdn.net.evil.com/a'), false);
    assert.equal(isAllowedMetaMediaUrl('https://user:pw@scontent.xx.fbcdn.net/a'), false);
  });
});

describe('redactUrl', () => {
  test('webhook secret and Smart Pix token never reach the log', () => {
    assert.equal(redactUrl('/webhooks/evolution/s3cr3t'), '/webhooks/evolution/[redacted]');
    assert.equal(redactUrl('/webhooks/meta/s3cr3t?hub.mode=subscribe'), '/webhooks/meta/[redacted]?hub.mode=subscribe');
    assert.equal(redactUrl('/v1/pix/smart/VVVVVVVVVVVVVVVVVVVVVV'), '/v1/pix/smart/[redacted]');
    assert.equal(redactUrl('/v1/conversations/abc/reply'), '/v1/conversations/abc/reply');
  });
});

describe('clientErrorMessage', () => {
  test('attendant-facing errors pass, internals do not', () => {
    assert.equal(clientErrorMessage(new Error('Só mensagens de texto podem ser editadas.'), 'x'), 'Só mensagens de texto podem ser editadas.');
    assert.equal(clientErrorMessage(new Error('[repo] failed: relation does not exist'), 'x'), 'x');
    assert.equal(clientErrorMessage(new TypeError('fetch failed'), 'x'), 'x');
    class UpstreamError extends Error {}
    assert.equal(clientErrorMessage(new UpstreamError('401 Incorrect API key sk-abc'), 'x'), 'x');
  });
});

describe('Meta webhooks require their own secrets', () => {
  let app: FastifyInstance;
  const saved = { ...process.env };

  before(async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = 'evo-secret';
    delete process.env.META_WEBHOOK_SECRET;
    delete process.env.META_APP_SECRET;
    app = Fastify();
    await app.register(channelWebhookRoutes);
    await app.ready();
  });

  after(async () => {
    await app.close();
    process.env = saved;
  });

  const post = (url: string) => app.inject({ method: 'POST', url, headers: { 'content-type': 'application/json' }, payload: '{}' });

  test('the Evolution secret no longer opens the Meta callback', async () => {
    const res = await post('/webhooks/meta/evo-secret');
    assert.equal(res.statusCode, 401);
  });

  test('without META_APP_SECRET a Meta delivery is refused even with the right path secret', async () => {
    process.env.META_WEBHOOK_SECRET = 'meta-secret';
    const res = await post('/webhooks/meta/meta-secret');
    assert.equal(res.statusCode, 401);
    delete process.env.META_WEBHOOK_SECRET;
  });

  test('unknown providers are refused', async () => {
    const res = await post('/webhooks/telegram/evo-secret');
    assert.equal(res.statusCode, 401);
  });
});
