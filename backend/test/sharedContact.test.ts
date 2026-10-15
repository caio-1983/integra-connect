import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseInbound, parseOutboundEcho } from '../src/channels/evolution/inboundParser.ts';

const upsert = (message: Record<string, unknown>, fromMe = false) => ({
  event: 'messages.upsert',
  instance: 'loja',
  data: { key: { id: 'ABC', remoteJid: '5511888887777@s.whatsapp.net', fromMe }, message },
});

const VCARD = 'BEGIN:VCARD\nVERSION:3.0\nN:;Ricardo;;;\nFN:Ricardo\nitem1.TEL;waid=5511987654321:+55 11 98765-4321\nitem1.X-ABLabel:Celular\nEND:VCARD';

describe('shared contact cards', () => {
  test('a single card is kept, with its WhatsApp id, instead of being dropped', () => {
    const msg = parseInbound(upsert({ contactMessage: { displayName: 'Ricardo', vcard: VCARD } }));
    assert.equal(msg?.text, '📇 Ricardo\n+55 11 98765-4321');
    assert.deepEqual(msg?.contacts, [{ name: 'Ricardo', phones: [{ number: '+55 11 98765-4321', wa_id: '5511987654321' }] }]);
  });

  test('several cards at once, including one with only a waid', () => {
    const msg = parseInbound(upsert({
      contactsArrayMessage: {
        displayName: '2 contatos',
        contacts: [
          { displayName: 'Marina', vcard: 'TEL;type=CELL:+55 21 99812-3344' },
          { displayName: '', vcard: 'TEL;waid=5531988887777:' },
        ],
      },
    }));
    assert.deepEqual(msg?.contacts, [
      { name: 'Marina', phones: [{ number: '+55 21 99812-3344' }] },
      { name: '', phones: [{ number: '+5531988887777', wa_id: '5531988887777' }] },
    ]);
    assert.equal(msg?.text, '📇 Marina\n+55 21 99812-3344\n\n📇 Contato\n+5531988887777');
  });

  test('a card the team sends from the phone comes through as an echo', () => {
    const echo = parseOutboundEcho(upsert({ contactMessage: { displayName: 'Ricardo', vcard: VCARD } }, true));
    assert.equal(echo?.contacts?.[0].name, 'Ricardo');
  });
});
