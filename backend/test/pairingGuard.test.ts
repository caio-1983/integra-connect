import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pairingVerdict, phoneDigits } from '../src/channels/evolution/pairingGuard.js';

describe('pairingVerdict (responsible agent re-pairing a number)', () => {
  test('an agent pairing the number on record is accepted', () => {
    assert.equal(pairingVerdict({ enforce: true, expected: '5521986060053' }, '5521986060053'), 'accept');
  });

  test('an agent pairing another phone is rejected', () => {
    assert.equal(pairingVerdict({ enforce: true, expected: '5521986060053' }, '5521999999999'), 'reject');
  });

  test('a number never known accepts the first pairing', () => {
    assert.equal(pairingVerdict({ enforce: true, expected: null }, '5521999999999'), 'accept');
  });

  test('admins and managers may switch the number', () => {
    assert.equal(pairingVerdict({ enforce: false, expected: '5521986060053' }, '5521999999999'), 'accept');
  });
});

describe('phoneDigits', () => {
  test('keeps digits only, as the summary and the record spell numbers differently', () => {
    assert.equal(phoneDigits('+5521986060053'), '5521986060053');
    assert.equal(phoneDigits('5521986060053'), '5521986060053');
  });

  test('empty means unknown', () => {
    assert.equal(phoneDigits(undefined), null);
    assert.equal(phoneDigits(''), null);
    assert.equal(phoneDigits('+'), null);
  });
});
