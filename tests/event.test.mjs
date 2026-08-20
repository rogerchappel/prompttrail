import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendEvent, readEvents } from '../dist/index.js';
import { parseEvent } from '../dist/event.js';

test('appendEvent writes a redacted JSONL receipt', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-event-'));
  const event = await appendEvent({
    type: 'tool',
    summary: 'Ran command with ghp_1234567890abcdefghijklmnopqrstuv',
    tool: 'npm',
    status: 'ok',
    tags: ['build,agent', 'build'],
    metadata: { path: '/Users/roger/private' }
  }, root);

  const events = await readEvents({ root });
  assert.equal(event.type, 'tool');
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Ran command with [REDACTED]');
  assert.deepEqual(events[0].tags, ['agent', 'build']);
});

test('parseEvent rejects impossible calendar timestamps and accepts timezone offsets', () => {
  const event = {
    version: 1,
    id: 'timestamp-event',
    timestamp: '2026-02-30T12:00:00Z',
    type: 'note',
    summary: 'Timestamp validation'
  };

  assert.throws(() => parseEvent(JSON.stringify(event)), /event timestamp must be a valid ISO-8601 instant with a timezone/);
  assert.equal(parseEvent(JSON.stringify({ ...event, timestamp: '2026-02-28T22:00:00+10:00' })).timestamp, '2026-02-28T22:00:00+10:00');
});
