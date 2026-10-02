import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import { createSmartPixService, type SmartPixService } from '../src/smartPix/SmartPixService.js';
import { hashSmartPixToken } from '../src/smartPix/token.js';
import { smartPixRoutes, INVALID_LINK_BODY } from '../src/routes/smartPix.js';
import type { NewSmartPixToken, SmartPixData, SmartPixRecord, SmartPixRepository } from '../src/persistence/SmartPixRepository.js';

const LUMINA: SmartPixData = {
  merchantName: 'Lumina Comércio de Iluminação LTDA',
  document: '38.230.659/0001-07',
  keyType: 'cnpj',
  pixKey: '38230659000107',
};
const OTHER: SmartPixData = { merchantName: 'Outra Empresa LTDA', document: '11.222.333/0001-81', keyType: 'email', pixKey: 'pix@outra.test' };
const DAY_MS = 24 * 60 * 60 * 1000;

/** In-memory repository that records every argument it receives. */
function fakeRepository() {
  const rows = new Map<string, NewSmartPixToken & { revokedAt: Date | null }>();
  const calls: Array<{ op: string; arg: unknown }> = [];
  let failing = false;
  const repo: SmartPixRepository = {
    async insert(row) {
      calls.push({ op: 'insert', arg: row });
      if (failing) throw new Error('db down');
      rows.set(row.tokenHash, { ...row, revokedAt: null });
    },
    async findByHash(tokenHash) {
      calls.push({ op: 'findByHash', arg: tokenHash });
      if (failing) throw new Error('db down');
      const row = rows.get(tokenHash);
      if (!row) return null;
      const record: SmartPixRecord = {
        merchantName: row.merchantName, document: row.document, keyType: row.keyType, pixKey: row.pixKey,
        expiresAt: row.expiresAt, revokedAt: row.revokedAt,
      };
      return record;
    },
    async revokeByHash(tokenHash, revokedAt) {
      calls.push({ op: 'revokeByHash', arg: { tokenHash, revokedAt } });
      const row = rows.get(tokenHash);
      if (!row || row.revokedAt) return false;
      row.revokedAt = revokedAt;
      return true;
    },
  };
  return { repo, rows, calls, fail: () => { failing = true; } };
}

let clock: Date;
let store: ReturnType<typeof fakeRepository>;
let service: SmartPixService;
let app: FastifyInstance;

beforeEach(async () => {
  clock = new Date('2026-10-02T12:00:00.000Z');
  store = fakeRepository();
  service = createSmartPixService(store.repo, () => clock);
  app = Fastify();
  await app.register(smartPixRoutes, { service });
});

const getLink = (token: string) => app.inject({ method: 'GET', url: `/v1/pix/smart/${encodeURIComponent(token)}` });

describe('token generation', () => {
  test('two tokens for the same data are different', async () => {
    const a = await service.createToken(LUMINA);
    const b = await service.createToken(LUMINA);
    assert.notEqual(a.token, b.token);
    assert.notEqual(hashSmartPixToken(a.token), hashSmartPixToken(b.token));
  });

  test('two tokens for different data are different', async () => {
    const a = await service.createToken(LUMINA);
    const b = await service.createToken(OTHER);
    assert.notEqual(a.token, b.token);
  });

  test('a token is 22 base64url characters and carries none of the data', async () => {
    for (let i = 0; i < 50; i++) {
      const { token } = await service.createToken(LUMINA);
      assert.match(token, /^[A-Za-z0-9_-]{22}$/);
      assert.ok(!token.includes('38230659'));
    }
  });
});

describe('GET /v1/pix/smart/:token', () => {
  test('a valid token returns the Pix data with the right key', async () => {
    const { token } = await service.createToken(LUMINA);
    const res = await getLink(token);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), LUMINA);
    assert.equal(res.json().pixKey, '38230659000107');
  });

  test('the public response has exactly the four public fields: no token_hash, id or dates', async () => {
    const { token } = await service.createToken(LUMINA);
    const res = await getLink(token);
    const body = res.json();
    assert.deepEqual(Object.keys(body).sort(), ['document', 'keyType', 'merchantName', 'pixKey']);
    for (const field of ['token', 'token_hash', 'tokenHash', 'id', 'created_at', 'createdAt', 'expires_at', 'expiresAt', 'revoked_at', 'revokedAt']) {
      assert.ok(!(field in body), `response must not contain ${field}`);
    }
    assert.ok(!res.body.includes(hashSmartPixToken(token)), 'hash must not appear in the body');
    assert.ok(!res.body.includes(token), 'token must not appear in the body');
    assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(res.body), 'no ISO dates in the body');
  });

  test('an unknown (well-formed) token returns 404', async () => {
    const res = await getLink('AAAAAAAAAAAAAAAAAAAAAA');
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.json(), INVALID_LINK_BODY);
  });

  test('a malformed token returns 404 without touching the repository', async () => {
    for (const bad of ['abc', 'x'.repeat(23), 'a8K92xLm7QpX4nRt.2abcd', '38230659000107', '%20'.repeat(3)]) {
      const res = await getLink(bad);
      assert.equal(res.statusCode, 404, bad);
      assert.deepEqual(res.json(), INVALID_LINK_BODY);
    }
    assert.equal(store.calls.filter((c) => c.op === 'findByHash').length, 0);
  });

  test('an expired token returns 404', async () => {
    const { token } = await service.createToken(LUMINA, 1);
    clock = new Date(clock.getTime() + DAY_MS);
    assert.equal((await getLink(token)).statusCode, 404);
    clock = new Date(clock.getTime() - 1);
    assert.equal((await getLink(token)).statusCode, 200, 'still valid one millisecond before expiry');
  });

  test('a revoked token returns 404', async () => {
    const { token } = await service.createToken(LUMINA);
    assert.equal((await getLink(token)).statusCode, 200);
    assert.equal(await service.revoke(token), true);
    const res = await getLink(token);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.json(), INVALID_LINK_BODY);
  });

  test('every invalid case returns exactly the same status and body', async () => {
    const expired = await service.createToken(LUMINA, 1);
    const revoked = await service.createToken(LUMINA);
    await service.revoke(revoked.token);
    clock = new Date(clock.getTime() + 2 * DAY_MS);
    const responses = await Promise.all([
      getLink('AAAAAAAAAAAAAAAAAAAAAA'), // unknown
      getLink('not-a-token'), // malformed
      getLink(expired.token),
      getLink(revoked.token),
    ]);
    const shapes = responses.map((r) => ({ status: r.statusCode, body: r.body, type: r.headers['content-type'], cache: r.headers['cache-control'] }));
    for (const shape of shapes) assert.deepEqual(shape, shapes[0]);
    assert.equal(shapes[0].status, 404);
  });

  test('responses carry Cache-Control: no-store (valid, invalid and failure)', async () => {
    const { token } = await service.createToken(LUMINA);
    const ok = await getLink(token);
    const invalid = await getLink('AAAAAAAAAAAAAAAAAAAAAA');
    store.fail();
    const failed = await getLink(token);
    assert.equal(failed.statusCode, 503);
    for (const res of [ok, invalid, failed]) {
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(res.headers['pragma'], 'no-cache');
      assert.equal(res.headers['referrer-policy'], 'no-referrer');
    }
  });
});

describe('only the hash reaches the repository', () => {
  test('create, resolve and revoke never pass the raw token down', async () => {
    const { token } = await service.createToken(LUMINA);
    await getLink(token);
    await service.revoke(token);
    const recorded = JSON.stringify(store.calls);
    assert.deepEqual(store.calls.map((c) => c.op), ['insert', 'findByHash', 'revokeByHash']);
    assert.ok(!recorded.includes(token), 'raw token reached the repository');
    assert.ok(recorded.includes(hashSmartPixToken(token)));
    for (const row of store.rows.values()) assert.match(row.tokenHash, /^[0-9a-f]{64}$/);
  });
});
