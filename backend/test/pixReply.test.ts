import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/**
 * requestManualPixReply end to end, with the network faked at `fetch`: the real
 * repository (supabase-js → PostgREST), the real connectors and the real
 * EvolutionClient run, and every request they make is recorded here. Nothing
 * else is faked, so these tests pin what each PIX_CARD_STYLE puts on the wire.
 *
 * Fail closed: the env is set before anything is imported, backend/.env is
 * never loaded, and any request to a host not listed below throws — no test can
 * reach production.
 */
process.env.DOTENV_CONFIG_PATH = 'test/.env.never-loaded';
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.EVOLUTION_API_URL = 'https://evolution.test';
process.env.EVOLUTION_API_KEY = 'test-evolution-key';
process.env.PUBLIC_BASE_URL = 'https://chat.example.test';
process.env.PIX_HEADER_IMAGE_URL = '';
process.env.OUTBOUND_SIGNATURE = 'on';
process.env.META_PAGE_TOKENS = '{"page-1":"test-page-token"}';
delete process.env.PIX_CARD_STYLE;

const OPERATOR = 'operator-1';
const PIX_ROW = { merchant_name: 'Lumina Comércio de Iluminação LTDA', key_type: 'cnpj', pix_key: '38230659000107' };
const KEY = '38230659000107';
const KEY_FORMATTED = '38.230.659/0001-07';
const HEADER_URL = 'https://chat.example.test/pix-header-lumina.jpg';
const HEADER_BYTES = Buffer.from('fake-jpeg-bytes');
const SMART_FAILED = 'Não foi possível gerar o link Pix. Nada foi enviado ao cliente.';

const CONVERSATIONS: Record<string, unknown> = {
  'conv-wa': { metadata: { instance: 'lumina' }, channel: 'whatsapp', provider: 'evolution', contacts: { external_id: '5511999990000' } },
  'conv-meta': { metadata: { instance: 'page-1' }, channel: 'facebook', provider: 'meta', contacts: { external_id: 'psid-1' } },
};

interface Recorded { method: string; host: string; path: string; search: URLSearchParams; body: any }
let requests: Recorded[] = [];
let pixRow: Record<string, string> | null;
let fail: { tokenInsert?: boolean; sendText?: boolean };
let nextId = 0;

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const raw = init?.body ?? undefined;
  let body: any = raw;
  if (typeof raw === 'string') { try { body = JSON.parse(raw); } catch { /* keep text */ } }
  requests.push({ method, host: url.host, path: url.pathname, search: url.searchParams, body });

  if (url.host === 'supabase.test') {
    const table = url.pathname.replace('/rest/v1/', '');
    if (table === 'conversations' && method === 'GET') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '') ?? '';
      return json(200, CONVERSATIONS[id] ? [CONVERSATIONS[id]] : []);
    }
    if (table === 'conversations' && method === 'PATCH') return json(204, undefined);
    if (table === 'pix_settings' && method === 'GET') return json(200, pixRow ? [pixRow] : []);
    if (table === 'team_members' && method === 'GET') return json(200, [{ name: 'Juliana' }]);
    if (table === 'messages' && method === 'POST') return json(201, undefined);
    if (table === 'pix_smart_tokens' && method === 'POST') {
      return fail.tokenInsert ? json(500, { code: 'XX000', message: 'boom', details: null, hint: null }) : json(201, undefined);
    }
  }
  if (url.host === 'evolution.test') {
    if (url.pathname === '/' && method === 'GET') return json(200, { version: '2.3.7' });
    if (url.pathname.startsWith('/message/sendText/') && fail.sendText) return json(500, { error: 'evolution down' });
    if (/^\/message\/send(Text|Buttons|Media)\//.test(url.pathname)) return json(201, { key: { id: `WA-${++nextId}` } });
  }
  if (url.host === 'chat.example.test' && url.pathname === '/pix-header-lumina.jpg') {
    return new Response(HEADER_BYTES, { status: 200, headers: { 'content-type': 'image/jpeg' } });
  }
  if (url.host === 'graph.facebook.com' && method === 'POST') return json(200, { message_id: `m-${++nextId}` });
  throw new Error(`[test] unexpected request: ${method} ${url.href}`);
}) as typeof fetch;

const { requestManualPixReply } = await import('../src/conversation/ConversationService.js');
const { logger } = await import('../src/logger/Logger.js');

const evolutionSends = () => requests.filter((r) => r.host === 'evolution.test' && r.method === 'POST');
const sendsTo = (kind: string) => evolutionSends().filter((r) => r.path === `/message/${kind}/lumina`);
const tokenRequests = () => requests.filter((r) => r.path === '/rest/v1/pix_smart_tokens');
const messageInserts = () => requests.filter((r) => r.path === '/rest/v1/messages' && r.method === 'POST');
const graphPosts = () => requests.filter((r) => r.host === 'graph.facebook.com');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function setStyle(style: string | undefined) {
  if (style === undefined) delete process.env.PIX_CARD_STYLE;
  else process.env.PIX_CARD_STYLE = style;
}

let errorLog: ReturnType<typeof mock.method>;

beforeEach(() => {
  requests = [];
  pixRow = { ...PIX_ROW };
  fail = {};
  process.env.PUBLIC_BASE_URL = 'https://chat.example.test';
  setStyle(undefined);
  errorLog?.mock.restore();
  errorLog = mock.method(logger, 'error', () => {});
});

const NATIVE_BUTTONS_BODY = {
  number: '5511999990000',
  title: 'Chave Pix',
  buttons: [{ type: 'pix', currency: 'BRL', name: PIX_ROW.merchant_name, keyType: 'cnpj', key: KEY }],
};

describe('native (default)', () => {
  for (const style of [undefined, 'native', 'unknown-value', '']) {
    test(`PIX_CARD_STYLE=${style === undefined ? '(unset)' : JSON.stringify(style)}: one sendButtons with the current pix payload`, async () => {
      setStyle(style);
      await requestManualPixReply('conv-wa', OPERATOR);

      assert.equal(sendsTo('sendButtons').length, 1);
      assert.deepEqual(sendsTo('sendButtons')[0].body, NATIVE_BUTTONS_BODY);
      assert.equal(sendsTo('sendText').length, 0);
      assert.equal(sendsTo('sendMedia').length, 0);
      assert.equal(evolutionSends().length, 1);
      assert.equal(tokenRequests().length, 0, 'no Smart Pix access');

      assert.equal(messageInserts().length, 1);
      const row = messageInserts()[0].body;
      assert.equal(row.content, `Chave Pix\n${PIX_ROW.merchant_name}\nCNPJ: ${KEY_FORMATTED}`);
      assert.equal(row.type, 'text');
      assert.equal(row.from_type, 'human');
      assert.equal(row.sent_by, OPERATOR);
      assert.equal(row.whatsapp_message_id, `WA-${nextId}`);
      assert.deepEqual(row.metadata, { pix: { merchant_name: PIX_ROW.merchant_name, key: KEY, key_type: 'cnpj', variant: 'native' } });
    });
  }

  test('an e-mail key still goes out as the native card', async () => {
    pixRow = { merchant_name: 'Lumina', key_type: 'email', pix_key: 'pix@lumina.test' };
    await requestManualPixReply('conv-wa', OPERATOR);
    assert.deepEqual(sendsTo('sendButtons')[0].body.buttons, [{ type: 'pix', currency: 'BRL', name: 'Lumina', keyType: 'email', key: 'pix@lumina.test' }]);
    assert.equal(tokenRequests().length, 0);
  });
});

describe('branded and plain (unchanged)', () => {
  test('branded: one sendButtons with the logo card and the copy button', async () => {
    setStyle('branded');
    await requestManualPixReply('conv-wa', OPERATOR);

    assert.equal(evolutionSends().length, 1);
    assert.deepEqual(sendsTo('sendButtons')[0].body, {
      number: '5511999990000',
      title: 'Chave Pix',
      description: `${PIX_ROW.merchant_name}\nCNPJ: ${KEY_FORMATTED}`,
      footer: 'Juliana',
      thumbnailUrl: HEADER_URL,
      buttons: [{ type: 'copy', displayText: 'Copiar chave Pix', copyCode: KEY }],
    });
    assert.equal(tokenRequests().length, 0);
    assert.deepEqual(messageInserts()[0].body.metadata, {
      pix: { merchant_name: PIX_ROW.merchant_name, key: KEY, key_type: 'cnpj', variant: 'branded', header_url: HEADER_URL },
    });
  });

  test('plain: the logo with the signed caption, then the key alone', async () => {
    setStyle('plain');
    await requestManualPixReply('conv-wa', OPERATOR);

    const sends = evolutionSends();
    assert.deepEqual(sends.map((r) => r.path), ['/message/sendMedia/lumina', '/message/sendText/lumina']);
    const caption = `*Chave Pix*\n${PIX_ROW.merchant_name}\nCNPJ: ${KEY_FORMATTED}\n\nCopie a chave na mensagem abaixo.`;
    assert.deepEqual(sends[0].body, {
      number: '5511999990000',
      mediatype: 'image',
      mimetype: 'image/jpeg',
      media: HEADER_BYTES.toString('base64'),
      fileName: 'chave-pix-lumina.jpg',
      caption: `*Juliana*\n${caption}`,
    });
    assert.deepEqual(sends[1].body, { number: '5511999990000', text: KEY });
    assert.equal(tokenRequests().length, 0);

    const rows = messageInserts().map((r) => r.body);
    assert.deepEqual(rows.map((r) => [r.type, r.content]), [['image', caption], ['text', KEY]]);
    assert.equal(rows[0].media_url, HEADER_URL);
  });
});

describe('smart', () => {
  beforeEach(() => setStyle('smart'));

  test('one plain text with the link, no buttons, no media, the key nowhere', async () => {
    await requestManualPixReply('conv-wa', OPERATOR);

    assert.equal(sendsTo('sendButtons').length, 0);
    assert.equal(sendsTo('sendMedia').length, 0);
    assert.equal(sendsTo('sendText').length, 1);
    assert.equal(evolutionSends().length, 1);

    const body = sendsTo('sendText')[0].body;
    assert.deepEqual(Object.keys(body).sort(), ['number', 'text']);
    assert.equal(body.number, '5511999990000');

    const lines = (body.text as string).split('\n');
    const url = lines[lines.length - 1];
    assert.match(url, /^https:\/\/chat\.example\.test\/pix\/[A-Za-z0-9_-]{22}$/);
    assert.equal(
      body.text,
      `*Juliana*\n*Chave Pix*\n${PIX_ROW.merchant_name}\n\nToque no link abaixo para ver e copiar a chave Pix:\n\n${url}`,
    );
    assert.ok(!body.text.includes(KEY), 'raw key in the message');
    assert.ok(!body.text.includes(KEY_FORMATTED), 'formatted key in the message');
    assert.ok(!/38\D?230\D?659\D?0001\D?07/.test(body.text), 'key in any punctuation');
  });

  test('the token is stored only as its SHA-256, before the message goes out', async () => {
    await requestManualPixReply('conv-wa', OPERATOR);

    const text = sendsTo('sendText')[0].body.text as string;
    const token = text.slice(text.lastIndexOf('/') + 1);
    const inserts = tokenRequests();
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].method, 'POST');
    const row = inserts[0].body;
    assert.equal(row.token_hash, sha256(token));
    assert.ok(!JSON.stringify(row).includes(token), 'raw token stored');
    assert.equal(row.merchant_name, PIX_ROW.merchant_name);
    assert.equal(row.document, KEY_FORMATTED);
    assert.equal(row.key_type, 'cnpj');
    assert.equal(row.pix_key, KEY);
    assert.equal(new Date(row.expires_at).getTime() - new Date(row.created_at).getTime(), 30 * 24 * 60 * 60 * 1000);
    assert.ok(requests.indexOf(inserts[0]) < requests.indexOf(sendsTo('sendText')[0]), 'token stored before sending');
  });

  test('the stored message has the clean text and expires_at, no hash', async () => {
    await requestManualPixReply('conv-wa', OPERATOR);

    const sent = sendsTo('sendText')[0].body.text as string;
    const tokenRow = tokenRequests()[0].body;
    assert.equal(messageInserts().length, 1);
    const row = messageInserts()[0].body;
    assert.equal(row.content, sent.replace(/^\*Juliana\*\n/, ''));
    assert.equal(row.type, 'text');
    assert.equal(row.from_type, 'human');
    assert.equal(row.sent_by, OPERATOR);
    assert.equal(row.whatsapp_message_id, `WA-${nextId}`);
    assert.deepEqual(row.metadata, { smart_pix: { expires_at: tokenRow.expires_at } });
    const stored = JSON.stringify(row);
    assert.ok(!stored.includes(tokenRow.token_hash), 'token_hash in the message row');
    assert.ok(!stored.includes('token_hash'));
  });

  test('never calls the backend API over HTTP', async () => {
    await requestManualPixReply('conv-wa', OPERATOR);
    assert.equal(requests.filter((r) => r.path.startsWith('/v1/')).length, 0);
  });

  test('token creation fails: nothing sent, generic error, logged with conversationId and no token', async () => {
    fail.tokenInsert = true;
    await assert.rejects(requestManualPixReply('conv-wa', OPERATOR), { message: SMART_FAILED });

    assert.equal(tokenRequests().length, 1);
    assert.equal(evolutionSends().length, 0);
    assert.equal(messageInserts().length, 0);
    assert.equal(errorLog.mock.callCount(), 1);
    const [fields] = errorLog.mock.calls[0].arguments as [Record<string, unknown>];
    assert.equal(fields.conversationId, 'conv-wa');
    const logged = JSON.stringify(errorLog.mock.calls[0].arguments);
    assert.ok(!logged.includes(tokenRequests()[0].body.token_hash), 'token hash logged');
    assert.ok(!/\/pix\/[A-Za-z0-9_-]{22}/.test(logged), 'link logged');
  });

  for (const [name, base] of [['unset', undefined], ['empty', ''], ['http', 'http://chat.example.test'], ['not a URL', 'chat.example.test']] as const) {
    test(`PUBLIC_BASE_URL ${name}: nothing created, nothing sent`, async () => {
      if (base === undefined) delete process.env.PUBLIC_BASE_URL;
      else process.env.PUBLIC_BASE_URL = base;
      await assert.rejects(requestManualPixReply('conv-wa', OPERATOR), { message: SMART_FAILED });
      assert.equal(tokenRequests().length, 0);
      assert.equal(evolutionSends().length, 0);
      assert.equal(messageInserts().length, 0);
      assert.equal(errorLog.mock.callCount(), 1);
    });
  }

  for (const [keyType, key] of [['email', 'pix@lumina.test'], ['phone', '+5511999990000'], ['random', '123e4567-e89b-12d3-a456-426614174000']]) {
    test(`${keyType} key: refused with a clear error, nothing created or sent`, async () => {
      pixRow = { merchant_name: 'Lumina', key_type: keyType, pix_key: key };
      await assert.rejects(requestManualPixReply('conv-wa', OPERATOR), { message: /só funciona com chave CNPJ ou CPF/ });
      assert.equal(tokenRequests().length, 0);
      assert.equal(evolutionSends().length, 0);
      assert.equal(messageInserts().length, 0);
    });
  }

  test('sendText fails after the token exists: the send error goes up as today, no revoke', async () => {
    fail.sendText = true;
    await assert.rejects(requestManualPixReply('conv-wa', OPERATOR), { message: /^\[evolution\] POST \/message\/sendText\/lumina → 500/ });

    assert.equal(tokenRequests().length, 1, 'only the insert — no revoke');
    assert.equal(tokenRequests()[0].method, 'POST');
    assert.equal(messageInserts().length, 0);
    assert.equal(errorLog.mock.callCount(), 0, 'not reported as a link failure');
  });

  test('no Pix key registered: the same error as every style', async () => {
    pixRow = null;
    await assert.rejects(requestManualPixReply('conv-wa', OPERATOR), { message: 'Chave Pix não cadastrada. Cadastre em Configurações.' });
    assert.equal(tokenRequests().length, 0);
    assert.equal(evolutionSends().length, 0);
  });
});

describe('Meta channels', () => {
  async function graphCallsFor(style: string) {
    requests = [];
    setStyle(style);
    await requestManualPixReply('conv-meta', OPERATOR);
    return {
      graph: graphPosts().map((r) => r.body),
      rows: messageInserts().map((r) => r.body),
      tokens: tokenRequests().length,
      evolution: requests.filter((r) => r.host === 'evolution.test').length,
    };
  }

  test('smart sends exactly what plain sends today, with no Smart Pix', async () => {
    const plain = await graphCallsFor('plain');
    const smart = await graphCallsFor('smart');

    assert.deepEqual(smart.graph, plain.graph);
    assert.deepEqual(smart.rows.map((r) => [r.type, r.content]), plain.rows.map((r) => [r.type, r.content]));
    assert.equal(smart.tokens, 0);
    assert.equal(smart.evolution, 0);
    // The plain sequence itself: logo by URL, caption, then the key alone.
    assert.equal(smart.graph.length, 3);
    assert.deepEqual(smart.graph[0].message, { attachment: { type: 'image', payload: { url: HEADER_URL, is_reusable: false } } });
    assert.deepEqual(smart.graph[2].message, { text: KEY });
  });
});
