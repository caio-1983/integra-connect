import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSmartPixMessage,
  smartPixBaseUrl,
  smartPixDataFromSettings,
  smartPixMessageText,
  SmartPixKeyNotSupportedError,
} from '../src/smartPix/smartPixMessage.js';
import { createSmartPixService, type SmartPixService } from '../src/smartPix/SmartPixService.js';
import type { PixDetails } from '../src/channels/pix.js';
import type { NewSmartPixToken, SmartPixRepository } from '../src/persistence/SmartPixRepository.js';

const LUMINA: PixDetails = { merchant_name: 'Lumina Comércio de Iluminação LTDA', key: '38230659000107', key_type: 'cnpj' };
const DAY_MS = 24 * 60 * 60 * 1000;

/** In-memory repository: rows by hash, plus every insert it received. */
function fakeRepository() {
  const rows = new Map<string, NewSmartPixToken>();
  const inserts: NewSmartPixToken[] = [];
  let failing = false;
  const repo: SmartPixRepository = {
    async insert(row) {
      inserts.push(row);
      if (failing) throw new Error('db down');
      rows.set(row.tokenHash, row);
    },
    async findByHash(tokenHash) {
      const row = rows.get(tokenHash);
      return row
        ? { merchantName: row.merchantName, document: row.document, keyType: row.keyType, pixKey: row.pixKey, expiresAt: row.expiresAt, revokedAt: null }
        : null;
    },
    async revokeByHash() { return false; },
  };
  return { repo, inserts, fail: () => { failing = true; } };
}

let clock: Date;
let store: ReturnType<typeof fakeRepository>;
let service: SmartPixService;

beforeEach(() => {
  clock = new Date('2026-10-02T12:00:00.000Z');
  store = fakeRepository();
  service = createSmartPixService(store.repo, () => clock);
  process.env.PUBLIC_BASE_URL = 'https://chat.example.test';
});

const lastLine = (text: string) => text.split('\n').at(-1) ?? '';
const tokenOf = (text: string) => lastLine(text).split('/pix/')[1];

describe('document from pix_settings', () => {
  test('CNPJ key: the key itself, formatted', () => {
    assert.deepEqual(smartPixDataFromSettings(LUMINA), {
      merchantName: LUMINA.merchant_name,
      document: '38.230.659/0001-07',
      keyType: 'cnpj',
      pixKey: '38230659000107',
    });
  });

  test('CPF key: the key itself, formatted', () => {
    const data = smartPixDataFromSettings({ merchant_name: 'Fulano', key: '12345678909', key_type: 'cpf' });
    assert.equal(data.document, '123.456.789-09');
    assert.equal(data.pixKey, '12345678909');
  });

  for (const [keyType, key] of [['email', 'pix@lumina.test'], ['phone', '+5511999990000'], ['random', '123e4567-e89b-12d3-a456-426614174000']] as const) {
    test(`${keyType} key: refused, no document made up`, () => {
      assert.throws(() => smartPixDataFromSettings({ merchant_name: 'Lumina', key, key_type: keyType }), SmartPixKeyNotSupportedError);
    });
  }

  test('CNPJ key that is not 14 digits: refused', () => {
    assert.throws(() => smartPixDataFromSettings({ ...LUMINA, key: '3823065900010' }), SmartPixKeyNotSupportedError);
  });
});

describe('base URL', () => {
  test('https is accepted, trailing slashes removed', () => {
    process.env.PUBLIC_BASE_URL = 'https://chat.example.test/';
    assert.equal(smartPixBaseUrl(), 'https://chat.example.test');
    process.env.PUBLIC_BASE_URL = 'https://chat.example.test//';
    assert.equal(smartPixBaseUrl(), 'https://chat.example.test');
  });

  test('unset is refused', () => {
    delete process.env.PUBLIC_BASE_URL;
    assert.throws(() => smartPixBaseUrl(), /PUBLIC_BASE_URL is not set/);
  });

  test('empty is refused', () => {
    process.env.PUBLIC_BASE_URL = '';
    assert.throws(() => smartPixBaseUrl(), /PUBLIC_BASE_URL is not set/);
  });

  test('http is refused', () => {
    process.env.PUBLIC_BASE_URL = 'http://chat.example.test';
    assert.throws(() => smartPixBaseUrl(), /must be https/);
  });

  test('not a URL is refused', () => {
    process.env.PUBLIC_BASE_URL = 'chat.example.test';
    assert.throws(() => smartPixBaseUrl(), /not a valid URL/);
  });

  test('a query or fragment is refused', () => {
    process.env.PUBLIC_BASE_URL = 'https://chat.example.test/?x=1';
    assert.throws(() => smartPixBaseUrl(), /query or fragment/);
  });

  for (const base of [undefined, 'http://chat.example.test']) {
    test(`createSmartPixMessage with base ${base ?? '(unset)'}: fails before any token exists`, async () => {
      if (base === undefined) delete process.env.PUBLIC_BASE_URL;
      else process.env.PUBLIC_BASE_URL = base;
      await assert.rejects(createSmartPixMessage(LUMINA, service));
      assert.equal(store.inserts.length, 0);
    });
  }

  test('an unsupported key type also fails before any token exists', async () => {
    await assert.rejects(createSmartPixMessage({ merchant_name: 'Lumina', key: 'pix@lumina.test', key_type: 'email' }, service), SmartPixKeyNotSupportedError);
    assert.equal(store.inserts.length, 0);
  });
});

describe('token', () => {
  test('the link carries a 22-character token', async () => {
    const { text } = await createSmartPixMessage(LUMINA, service);
    assert.match(lastLine(text), /^https:\/\/chat\.example\.test\/pix\/[A-Za-z0-9_-]{22}$/);
  });

  test('the token resolves back to the same data', async () => {
    const { text } = await createSmartPixMessage(LUMINA, service);
    assert.deepEqual(await service.resolve(tokenOf(text)), smartPixDataFromSettings(LUMINA));
  });

  test('valid for 30 days', async () => {
    const { expiresAt } = await createSmartPixMessage(LUMINA, service);
    assert.equal(expiresAt.getTime(), clock.getTime() + 30 * DAY_MS);
    assert.equal(store.inserts[0].expiresAt.getTime(), clock.getTime() + 30 * DAY_MS);
  });

  test('a repository failure rejects', async () => {
    store.fail();
    await assert.rejects(createSmartPixMessage(LUMINA, service), /db down/);
  });

  test('returns only the text and the expiry — no token hash', async () => {
    const result = await createSmartPixMessage(LUMINA, service);
    assert.deepEqual(Object.keys(result).sort(), ['expiresAt', 'text']);
    assert.ok(!result.text.includes(store.inserts[0].tokenHash));
  });
});

describe('text', () => {
  test('exact text, URL alone on the last line', async () => {
    const { text } = await createSmartPixMessage(LUMINA, service);
    const url = `https://chat.example.test/pix/${tokenOf(text)}`;
    assert.equal(text, `*Chave Pix*\n${LUMINA.merchant_name}\n\nToque no link abaixo para ver e copiar a chave Pix:\n\n${url}`);
    assert.equal(lastLine(text), url);
    assert.equal(smartPixMessageText(LUMINA.merchant_name, url), text);
  });

  test('the key is not in the text, raw or formatted', async () => {
    const { text } = await createSmartPixMessage(LUMINA, service);
    assert.ok(!text.includes('38230659000107'));
    assert.ok(!text.includes('38.230.659/0001-07'));
    assert.ok(!/38\D?230\D?659\D?0001\D?07/.test(text));
  });

  test('a CPF key is not in the text either', async () => {
    const { text } = await createSmartPixMessage({ merchant_name: 'Fulano', key: '12345678909', key_type: 'cpf' }, service);
    assert.ok(!text.includes('12345678909'));
    assert.ok(!text.includes('123.456.789-09'));
  });
});
