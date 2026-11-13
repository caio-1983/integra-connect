import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { parseWahaAck, parseWahaMessage, phoneOf } from '../src/channels/waha/inboundParser.ts';
import { rawMessageId, serializedMessageId, sessionNameFor, toChatId } from '../src/channels/waha/WahaClient.ts';
import { wahaSignatureValid } from '../src/routes/channelWebhooks.ts';

// Shapes copied from a live WAHA 2026.10.1 / GOWS capture (2026-11-13), with
// made-up numbers and ids.
const LID = '111111111111111@lid';
const PHONE = '5521999990000@s.whatsapp.net';
const ME = '5521988880000@s.whatsapp.net';

function event(payload: Record<string, unknown>, evt = 'message.any') {
  return { id: 'evt_1', event: evt, session: 'evelim-oliveira', metadata: { instance: 'Evelim Oliveira' }, engine: 'GOWS', payload };
}

function info(over: Record<string, unknown> = {}) {
  return { Chat: LID, Sender: LID, IsFromMe: false, IsGroup: false, SenderAlt: PHONE, RecipientAlt: '', ID: 'AC0000000000000000000000000000AA', PushName: 'Cliente', ...over };
}

describe('WAHA inbound parser', () => {
  test('1:1 text addressed by @lid: phone comes from SenderAlt, instance from metadata', () => {
    const parsed = parseWahaMessage(event({
      id: `false_${LID}_AC0000000000000000000000000000AA`, timestamp: 1794568000, from: LID, fromMe: false, source: 'app',
      body: 'Oi, tem fita LED?', hasMedia: false,
      _data: { Info: info(), Message: { conversation: 'Oi, tem fita LED?' } },
    }));
    assert.ok(parsed);
    assert.equal(parsed.fromMe, false);
    assert.equal(parsed.message.instance, 'Evelim Oliveira');
    assert.equal(parsed.message.externalContactId, '5521999990000');
    assert.equal(parsed.message.providerMessageId, 'AC0000000000000000000000000000AA');
    assert.equal(parsed.message.contactName, 'Cliente');
    assert.equal(parsed.message.text, 'Oi, tem fita LED?');
    assert.equal(parsed.unresolvedLid, undefined);
  });

  test('echo from the phone: recipient phone from RecipientAlt, no contact name', () => {
    const parsed = parseWahaMessage(event({
      id: `true_${LID}_3EB0AAAAAAAAAAAAAAAAAA`, timestamp: 1794568001, from: LID, fromMe: true, source: 'app', body: 'Temos sim',
      _data: { Info: info({ IsFromMe: true, Sender: '5521988880000:12@lid', SenderAlt: ME, RecipientAlt: PHONE, ID: '3EB0AAAAAAAAAAAAAAAAAA', PushName: 'Lumina' }), Message: { extendedTextMessage: { text: 'Temos sim' } } },
    }));
    assert.ok(parsed);
    assert.equal(parsed.fromMe, true);
    assert.equal(parsed.message.externalContactId, '5521999990000');
    assert.equal(parsed.message.contactName, undefined);
  });

  test('stored history image with empty caption "" still becomes an image message', () => {
    const parsed = parseWahaMessage(event({
      id: `true_${LID}_3EB0BBBBBBBBBBBBBBBBBB`, timestamp: 1794568002, from: LID, fromMe: true, body: '', hasMedia: true,
      _data: { Info: info({ IsFromMe: true, SenderAlt: ME, RecipientAlt: PHONE, ID: '3EB0BBBBBBBBBBBBBBBBBB' }), Message: { imageMessage: { caption: '', mimetype: 'image/jpeg' }, messageContextInfo: {} } },
    }));
    assert.ok(parsed);
    assert.equal(parsed.message.text, '📷 Imagem');
  });

  test('@lid with no phone alongside is left for the connector to resolve', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: LID, fromMe: false, body: 'oi',
      _data: { Info: info({ SenderAlt: '' }), Message: { conversation: 'oi' } },
    }));
    assert.equal(parsed?.unresolvedLid, LID);
  });

  test('quoted reply: whatsmeow spells stanzaID; customer quoting their own message', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: LID, fromMe: false, body: 'esse',
      _data: { Info: info(), Message: { extendedTextMessage: { text: 'esse', contextInfo: { stanzaID: 'Q1', participant: LID, quotedMessage: { conversation: 'Tem de 12W?' } } } } },
    }));
    assert.equal(parsed?.message.quotedProviderMessageId, 'Q1');
    assert.deepEqual(parsed?.message.quoted, { text: 'Tem de 12W?', fromCustomer: true });
  });

  test('image: placeholder text, WAHA-hosted URL kept for download', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: LID, fromMe: false, body: '', hasMedia: true,
      media: { url: 'http://waha:3000/api/files/evelim-oliveira/AC1.jpeg', mimetype: 'image/jpeg' },
      _data: { Info: info({ MediaType: 'image' }), Message: { imageMessage: { mimetype: 'image/jpeg' } } },
    }));
    assert.equal(parsed?.message.text, '📷 Imagem');
    assert.deepEqual(parsed?.message.pendingMedia, { kind: 'image', mimeType: 'image/jpeg', fileName: undefined });
    assert.equal(parsed?.mediaUrl, 'http://waha:3000/api/files/evelim-oliveira/AC1.jpeg');
  });

  test('captioned document is unwrapped and keeps its file name', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: LID, fromMe: false, hasMedia: true, media: { url: 'http://w/f.pdf', mimetype: 'application/pdf' },
      _data: { Info: info(), Message: { documentWithCaptionMessage: { message: { documentMessage: { mimetype: 'application/pdf', fileName: 'orcamento.pdf', caption: 'segue' } } } } },
    }));
    assert.equal(parsed?.message.text, 'segue');
    assert.equal(parsed?.message.pendingMedia?.kind, 'document');
    assert.equal(parsed?.message.pendingMedia?.fileName, 'orcamento.pdf');
  });

  test('group: group JID as contact, sender phone from SenderAlt', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: '120363000000000000@g.us', fromMe: false, participant: LID, body: 'bom dia',
      _data: { Info: info({ Chat: '120363000000000000@g.us', IsGroup: true, PushName: 'Fulano' }), Message: { conversation: 'bom dia' } },
    }));
    assert.equal(parsed?.message.isGroup, true);
    assert.equal(parsed?.message.externalContactId, '120363000000000000@g.us');
    assert.equal(parsed?.message.senderParticipant, '5521999990000');
    assert.equal(parsed?.message.senderName, 'Fulano');
    assert.equal(parsed?.message.contactName, undefined);
  });

  test('channels, status and control messages are dropped', () => {
    assert.equal(parseWahaMessage(event({ id: 'x', from: '1@newsletter', body: 'news', _data: { Info: info({ Chat: '1@newsletter' }), Message: { conversation: 'news' } } })), null);
    assert.equal(parseWahaMessage(event({ id: 'x', from: 'status@broadcast', body: 's', _data: { Info: info({ Chat: 'status@broadcast' }), Message: { conversation: 's' } } })), null);
    assert.equal(parseWahaMessage(event({ id: 'x', from: LID, body: '', _data: { Info: info(), Message: { protocolMessage: { type: 0 } } } })), null);
    assert.equal(parseWahaMessage(event({ id: 'x', from: LID, body: '', _data: { Info: info(), Message: { conversation: 'x' } } }, 'message')), null, 'only message.any is consumed');
  });

  test('click-to-WhatsApp ad, whatsmeow spelling', () => {
    const parsed = parseWahaMessage(event({
      id: 'x', timestamp: 1, from: LID, fromMe: false, body: 'Olá! Tenho interesse',
      _data: { Info: info(), Message: { extendedTextMessage: { text: 'Olá! Tenho interesse', contextInfo: { externalAdReply: { sourceID: '120200000000000001', title: 'Fita LED', sourceURL: 'https://fb.me/x?ctwa_clid=CL1', sourceType: 'ad', sourceApp: 'instagram' } } } } },
    }));
    assert.deepEqual(parsed?.message.attribution, {
      adId: '120200000000000001', adTitle: 'Fita LED', adUrl: 'https://fb.me/x?ctwa_clid=CL1', adSourceApp: 'instagram', ctwaClid: 'CL1', kind: 'paid_ad',
    });
  });
});

describe('WAHA acks', () => {
  test('our message delivered', () => {
    const s = parseWahaAck(event({ id: `true_${LID}_3EB0AAAA`, from: LID, fromMe: true, ack: 2, ackName: 'DEVICE', _data: { MessageIDs: ['3EB0AAAA'] } }, 'message.ack'));
    assert.deepEqual(s, { channel: 'whatsapp', instance: 'Evelim Oliveira', providerMessageId: '3EB0AAAA', status: 'delivered' });
  });
  test('acks on the customer\'s messages are ignored', () => {
    assert.equal(parseWahaAck(event({ id: 'false_x_Y', fromMe: false, ack: 3 }, 'message.ack')), null);
  });
});

describe('WAHA ids and names', () => {
  test('raw ↔ serialized message ids', () => {
    assert.equal(rawMessageId(`true_${LID}_3EB0AAAA`), '3EB0AAAA');
    assert.equal(rawMessageId('false_120363@g.us_ACBB_111@lid'), 'ACBB');
    assert.equal(rawMessageId('3EB0AAAA'), '3EB0AAAA');
    assert.equal(serializedMessageId(true, '5521999990000@c.us', '3EB0AAAA'), 'true_5521999990000@c.us_3EB0AAAA');
  });
  test('chat ids and phones', () => {
    assert.equal(toChatId('5521999990000'), '5521999990000@c.us');
    assert.equal(toChatId(PHONE), '5521999990000@c.us');
    assert.equal(toChatId('120363@g.us'), '120363@g.us');
    assert.equal(phoneOf('5521988880000:12@s.whatsapp.net'), '5521988880000');
    assert.equal(phoneOf(LID), undefined);
  });
  test('session names WAHA accepts', () => {
    assert.equal(sessionNameFor('Evelim Oliveira'), 'evelim-oliveira');
    assert.equal(sessionNameFor('Stefani IOS'), 'stefani-ios');
    assert.equal(sessionNameFor('João Ção'), 'joao-cao');
    assert.match(sessionNameFor('integra-connect'), /^[a-z0-9_-]+$/);
  });
});

describe('WAHA webhook signature', () => {
  const raw = JSON.stringify(event({ id: 'x' }));
  const good = createHmac('sha512', 's3cret').update(raw).digest('hex');
  test('valid HMAC-SHA512 passes', () => assert.equal(wahaSignatureValid(raw, good, 'sha512', 's3cret'), true));
  test('wrong secret, missing header, other algorithm fail', () => {
    assert.equal(wahaSignatureValid(raw, good, 'sha512', 'other'), false);
    assert.equal(wahaSignatureValid(raw, undefined, 'sha512', 's3cret'), false);
    assert.equal(wahaSignatureValid(raw, good, 'sha256', 's3cret'), false);
    assert.equal(wahaSignatureValid(raw, good, 'sha512', undefined), false);
  });
});
