import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseInbound, parseOutboundEcho } from '../src/channels/evolution/inboundParser.ts';

const CHAT = '123456789012345@lid';

const upsert = (data: Record<string, unknown>, fromMe = false) => ({
  event: 'messages.upsert',
  instance: 'loja',
  data: { key: { id: 'ABC', remoteJid: CHAT, fromMe }, ...data },
});

describe('quoted replies ("responder")', () => {
  test('plain text: the quote sits on data.contextInfo (live v2.3.7 shape)', () => {
    const msg = parseInbound(upsert({
      message: { conversation: 'Esse mesmo' },
      contextInfo: { stanzaId: 'Q1', participant: '999999999999999@lid', quotedMessage: { conversation: 'Temos a 12W e a 18W' } },
    }));
    assert.equal(msg?.quotedProviderMessageId, 'Q1');
    assert.deepEqual(msg?.quoted, { text: 'Temos a 12W e a 18W', fromCustomer: false });
  });

  test('the customer quoting their own message', () => {
    const msg = parseInbound(upsert({
      message: { extendedTextMessage: { text: 'e aí?', contextInfo: { stanzaId: 'Q2', participant: CHAT, quotedMessage: { conversation: 'Tem pronta entrega?' } } } },
    }));
    assert.deepEqual(msg?.quoted, { text: 'Tem pronta entrega?', fromCustomer: true });
  });

  test('a quoted photo without caption reads as the media placeholder', () => {
    const msg = parseInbound(upsert({
      message: { conversation: 'Quero essa' },
      contextInfo: { stanzaId: 'Q3', participant: '999999999999999@lid', quotedMessage: { imageMessage: { mimetype: 'image/jpeg' } } },
    }));
    assert.equal(msg?.quoted?.text, '📷 Imagem');
  });

  test('author is left unknown when participant and chat use different id kinds', () => {
    const msg = parseInbound(upsert({
      message: { conversation: 'ok' },
      contextInfo: { stanzaId: 'Q4', participant: '5511999998888@s.whatsapp.net', quotedMessage: { conversation: 'oi' } },
    }));
    assert.deepEqual(msg?.quoted, { text: 'oi' });
  });

  test('a reply typed on the phone keeps its quote too', () => {
    const echo = parseOutboundEcho(upsert({
      message: { extendedTextMessage: { text: 'Sim', contextInfo: { stanzaId: 'Q5', participant: CHAT, quotedMessage: { conversation: 'Ainda tem?' } } } },
    }, true));
    assert.equal(echo?.quotedProviderMessageId, 'Q5');
    assert.deepEqual(echo?.quoted, { text: 'Ainda tem?', fromCustomer: true });
  });

  test('no quote, no fields', () => {
    const msg = parseInbound(upsert({ message: { conversation: 'oi' } }));
    assert.equal(msg?.quotedProviderMessageId, undefined);
    assert.equal(msg?.quoted, undefined);
  });
});
