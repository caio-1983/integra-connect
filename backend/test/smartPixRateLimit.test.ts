import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { smartPixRoutes, INVALID_LINK_BODY } from '../src/routes/smartPix.js';
import type { SmartPixService } from '../src/smartPix/SmartPixService.js';

/**
 * The public Smart Pix route has its own 60/min bucket, apart from the global
 * one. The plugin is registered the way index.ts registers it (120/min global).
 */
const VALID = 'VVVVVVVVVVVVVVVVVVVVVV';
const UNKNOWN = 'AAAAAAAAAAAAAAAAAAAAAA';
const DATA = { merchantName: 'Lumina Comércio de Iluminação LTDA', document: '38.230.659/0001-07', keyType: 'cnpj' as const, pixKey: '38230659000107' };

const service = {
  async resolve(token: unknown) { return token === VALID ? DATA : null; },
} as unknown as SmartPixService;

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify();
  await app.register(rateLimit, { max: 120, timeWindow: 60_000 });
  await app.register(smartPixRoutes, { service });
  // Any other route: no config of its own, so it uses the global bucket.
  app.get('/v1/other', async () => ({ ok: true }));
  await app.ready();
});

const link = (token: string, remoteAddress = '10.0.0.1') =>
  app.inject({ method: 'GET', url: `/v1/pix/smart/${token}`, remoteAddress });
const other = (remoteAddress = '10.0.0.1') => app.inject({ method: 'GET', url: '/v1/other', remoteAddress });

async function times(n: number, call: () => ReturnType<typeof link>) {
  const responses = [];
  for (let i = 0; i < n; i++) responses.push(await call());
  return responses;
}

describe('GET /v1/pix/smart/:token rate limit', () => {
  test('reports its own limit of 60, not the global 120', async () => {
    const res = await link(VALID);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), DATA);
    assert.equal(res.headers['x-ratelimit-limit'], '60');
    assert.equal(res.headers['x-ratelimit-remaining'], '59');
  });

  test('60 requests go through, the 61st gets 429', async () => {
    const ok = await times(60, () => link(UNKNOWN));
    assert.ok(ok.every((r) => r.statusCode === 404));
    assert.deepEqual(ok[59].json(), INVALID_LINK_BODY);

    const limited = await link(VALID);
    assert.equal(limited.statusCode, 429);
    assert.ok(limited.headers['retry-after'], 'retry-after header');
  });

  test('does not consume the global bucket', async () => {
    await times(61, () => link(UNKNOWN));
    const res = await other();
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-ratelimit-limit'], '120');
    assert.equal(res.headers['x-ratelimit-remaining'], '119');
  });

  test('the global bucket running out does not block Smart Pix', async () => {
    const global = await times(121, () => other());
    assert.equal(global[119].statusCode, 200);
    assert.equal(global[120].statusCode, 429);

    const res = await link(VALID);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-ratelimit-remaining'], '59');
  });

  test('keyed by connection IP: another address has its own count', async () => {
    await times(60, () => link(UNKNOWN, '10.0.0.1'));
    assert.equal((await link(VALID, '10.0.0.1')).statusCode, 429);
    assert.equal((await link(VALID, '10.0.0.2')).statusCode, 200);
  });
});
