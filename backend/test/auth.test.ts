import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import { authMiddleware, authUserOf, requireRole } from '../src/middleware/auth.js';
import { canAccessInstance, requireConversationAccess, isValidInstanceName } from '../src/middleware/access.js';
import { accessRepository } from '../src/persistence/AccessRepository.js';

/**
 * The gateway authenticates the user's Supabase session (no shared key) and
 * authorizes per role and per conversation. The repository is stubbed: these
 * tests pin the HTTP behavior, not Supabase.
 */
const USERS: Record<string, { id: string; role: 'admin' | 'manager' | 'agent'; disabled?: boolean }> = {
  'h.admin.s': { id: '00000000-0000-4000-8000-000000000001', role: 'admin' },
  'h.agent.s': { id: '00000000-0000-4000-8000-000000000002', role: 'agent' },
  'h.disabled.s': { id: '00000000-0000-4000-8000-000000000003', role: 'agent', disabled: true },
};
const ALLOWED_CONVERSATION = '11111111-1111-4111-8111-111111111111';
const OTHER_CONVERSATION = '22222222-2222-4222-8222-222222222222';

let verifyCalls = 0;
let handlerCalls = 0;
const original = { ...accessRepository };

before(() => {
  accessRepository.verifyAccessToken = async (token) => {
    verifyCalls++;
    const user = USERS[token];
    return user ? { userId: user.id } : null;
  };
  accessRepository.getRole = async (userId) => Object.values(USERS).find((u) => u.id === userId)!.role;
  accessRepository.isDisabled = async (userId) => Boolean(Object.values(USERS).find((u) => u.id === userId)?.disabled);
  accessRepository.canAccessConversation = async (conversationId, userId) =>
    userId === USERS['h.admin.s'].id || conversationId === ALLOWED_CONVERSATION;
});

after(() => Object.assign(accessRepository, original));

let app: FastifyInstance;

beforeEach(async () => {
  handlerCalls = 0;
  app = Fastify();
  app.get('/me', { preHandler: authMiddleware }, async (request) => {
    handlerCalls++;
    return authUserOf(request);
  });
  app.post('/admin-only', { preHandler: [authMiddleware, requireRole('admin', 'manager')] }, async () => {
    handlerCalls++;
    return { ok: true };
  });
  app.post('/conversations/:conversationId/reply', { preHandler: [authMiddleware, requireConversationAccess] }, async (request) => {
    handlerCalls++;
    return { sentBy: authUserOf(request).id };
  });
  await app.ready();
});

const call = (method: 'GET' | 'POST', url: string, token?: string, payload?: unknown) =>
  app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: payload as never });

describe('authMiddleware', () => {
  test('no token → 401 and the handler never runs', async () => {
    const res = await call('GET', '/me');
    assert.equal(res.statusCode, 401);
    assert.equal(handlerCalls, 0);
  });

  test('the old static key (or any unknown token) → 401', async () => {
    const res = await call('GET', '/me', 'change-me-dev-key');
    assert.equal(res.statusCode, 401);
    assert.equal(handlerCalls, 0);
  });

  test('a valid session token → the verified user and role', async () => {
    const res = await call('GET', '/me', 'h.agent.s');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { id: USERS['h.agent.s'].id, role: 'agent' });
  });

  test('a verified token is cached: Supabase Auth is asked once', async () => {
    verifyCalls = 0;
    await call('GET', '/me', 'h.admin.s');
    await call('GET', '/me', 'h.admin.s');
    assert.equal(verifyCalls <= 1, true);
  });

  test('a disabled team member → 403', async () => {
    const res = await call('GET', '/me', 'h.disabled.s');
    assert.equal(res.statusCode, 403);
    assert.equal(handlerCalls, 0);
  });
});

describe('requireRole', () => {
  test('agent → 403', async () => {
    const res = await call('POST', '/admin-only', 'h.agent.s');
    assert.equal(res.statusCode, 403);
    assert.equal(handlerCalls, 0);
  });

  test('admin → 200', async () => {
    const res = await call('POST', '/admin-only', 'h.admin.s');
    assert.equal(res.statusCode, 200);
  });
});

describe('requireConversationAccess', () => {
  test('a conversation the user cannot see answers 404', async () => {
    const res = await call('POST', `/conversations/${OTHER_CONVERSATION}/reply`, 'h.agent.s', {});
    assert.equal(res.statusCode, 404);
    assert.equal(handlerCalls, 0);
  });

  test('the author is the token user, whatever the body says', async () => {
    const res = await call('POST', `/conversations/${ALLOWED_CONVERSATION}/reply`, 'h.agent.s', { operatorId: USERS['h.admin.s'].id });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().sentBy, USERS['h.agent.s'].id);
  });
});

describe('canAccessInstance', () => {
  const visibility = {
    privateOwners: new Map([['Juliana Coutinho', 'owner-id']]),
    granted: new Set(['integra-connect']),
  };

  test('a private number is only its owner\'s, admins included', () => {
    assert.equal(canAccessInstance({ id: 'admin-id', role: 'admin' }, 'Juliana Coutinho', visibility), false);
    assert.equal(canAccessInstance({ id: 'owner-id', role: 'agent' }, 'Juliana Coutinho', visibility), true);
  });

  test('admins see every other number; others only granted ones', () => {
    assert.equal(canAccessInstance({ id: 'admin-id', role: 'admin' }, 'loja-2', visibility), true);
    assert.equal(canAccessInstance({ id: 'manager-id', role: 'manager' }, 'loja-2', visibility), false);
    assert.equal(canAccessInstance({ id: 'agent-id', role: 'agent' }, 'integra-connect', visibility), true);
  });

  test('instance names: existing ones pass, path tricks do not', () => {
    assert.equal(isValidInstanceName('Juliana Coutinho'), true);
    assert.equal(isValidInstanceName('integra-connect'), true);
    assert.equal(isValidInstanceName('João'), true);
    assert.equal(isValidInstanceName('../instance/delete/x'), false);
    assert.equal(isValidInstanceName('a?b'), false);
    assert.equal(isValidInstanceName(''), false);
  });
});
