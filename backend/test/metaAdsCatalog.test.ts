import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { graphTime } from '../src/channels/meta/MetaAdsCatalog.js';

describe('graphTime (ad created_time from the Marketing API)', () => {
  test('Graph offset without colon becomes ISO 8601 UTC', () => {
    assert.equal(graphTime('2026-03-30T13:47:15-0300'), '2026-03-30T16:47:15.000Z');
  });

  test('positive offsets work too', () => {
    assert.equal(graphTime('2026-10-30T15:51:19+0000'), '2026-10-30T15:51:19.000Z');
  });

  test('missing or broken values are null, never a bogus date', () => {
    assert.equal(graphTime(undefined), null);
    assert.equal(graphTime(''), null);
    assert.equal(graphTime('ontem'), null);
  });
});
