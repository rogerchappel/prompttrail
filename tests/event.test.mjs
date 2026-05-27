import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendEvent, readEvents } from '../dist/index.js';

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
