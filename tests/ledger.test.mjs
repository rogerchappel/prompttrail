import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { doctor, readEvents } from '../dist/index.js';

async function writeLedger(lines) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-ledger-'));
  const trailDir = path.join(root, '.prompttrail');
  await mkdir(trailDir);
  await writeFile(path.join(trailDir, 'events.jsonl'), lines.join('\n') + '\n');
  return root;
}

const validEvent = {
  version: 1,
  id: 'valid-event',
  timestamp: '2026-08-09T04:35:00.000Z',
  type: 'note',
  summary: 'Valid event',
  status: 'ok',
  tags: ['test'],
  metadata: { source: 'fixture' }
};

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

test('filters timestamps as normalized instants with inclusive bounds', async () => {
  const events = await readEvents({
    root: 'tests/fixtures/sample-ledger',
    since: '2026-05-17T02:04:00+02:00',
    until: '2026-05-16T20:08:00-04:00'
  });

  assert.deepEqual(events.map((event) => event.id), ['evt_decision_001', 'evt_verify_001']);
});

test('rejects invalid and reversed timestamp bounds before reading a ledger', async () => {
  await assert.rejects(readEvents({ root: 'does-not-exist', since: '2026-02-30T00:00:00Z' }), /--since must be a valid ISO-8601 instant/);
  await assert.rejects(readEvents({ root: 'does-not-exist', until: 'not-a-date' }), /--until must be a valid ISO-8601 instant/);
  await assert.rejects(
    readEvents({ since: '2026-05-18T00:00:00Z', until: '2026-05-17T00:00:00Z' }),
    /--since must be earlier than or equal to --until/
  );
});

test('doctor validates the fixture ledger', async () => {
  const result = await doctor('tests/fixtures/sample-ledger');

  assert.equal(result.ok, true);
  assert.equal(result.events, 4);
  assert.deepEqual(result.invalidLines, []);
});

test('doctor reports malformed event fields with their JSONL line numbers', async () => {
  const invalidEvents = [
    { ...validEvent, id: 'bad-timestamp', timestamp: 'not-a-date' },
    { ...validEvent, id: 'bad-status', status: 'definitely-not-valid' },
    { ...validEvent, id: 'bad-tags', tags: 'not-an-array' },
    { ...validEvent, id: 'bad-metadata', metadata: [] }
  ];
  const root = await writeLedger([
    JSON.stringify(validEvent),
    ...invalidEvents.map((event) => JSON.stringify(event))
  ]);

  const result = await doctor(root);

  assert.equal(result.ok, false);
  assert.equal(result.events, 1);
  assert.deepEqual(result.invalidLines.map(({ line }) => line), [2, 3, 4, 5]);
  assert.match(result.invalidLines[0].error, /timestamp/i);
  assert.match(result.invalidLines[1].error, /status/i);
  assert.match(result.invalidLines[2].error, /tags/i);
  assert.match(result.invalidLines[3].error, /metadata/i);
});

test('readEvents rejects a malformed ledger entry with its JSONL line number', async () => {
  const root = await writeLedger([
    JSON.stringify(validEvent),
    JSON.stringify({ ...validEvent, id: 'bad-summary', summary: { text: 'wrong shape' } })
  ]);

  await assert.rejects(readEvents({ root }), /line 2.*summary/i);
});
