import assert from 'node:assert/strict';
import test from 'node:test';
import { doctor, readEvents } from '../dist/index.js';

test('reads checked-in fixture ledger deterministically', async () => {
  const events = await readEvents({ root: 'tests/fixtures/sample-ledger' });

  assert.equal(events.length, 4);
  assert.equal(events[0].type, 'prompt');
  assert.equal(events.at(-1).type, 'verification');
});

test('filters fixture ledger by type and limit', async () => {
  const events = await readEvents({ root: 'tests/fixtures/sample-ledger', type: 'tool', limit: 1 });

  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Ran npm run check');
});

test('doctor validates the fixture ledger', async () => {
  const result = await doctor('tests/fixtures/sample-ledger');

  assert.equal(result.ok, true);
  assert.equal(result.events, 4);
  assert.deepEqual(result.invalidLines, []);
});
