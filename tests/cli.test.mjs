import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const cli = path.resolve('dist/run.js');

test('CLI lists checked-in fixture events as markdown', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cli, 'list', '--dir', 'tests/fixtures/sample-ledger']);

  assert.match(stdout, /Asked agent to inspect failing TypeScript check/);
  assert.match(stdout, /Fixture smoke passes/);
});

test('CLI appends and summarizes a local receipt ledger', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-cli-'));
  await execFileAsync(process.execPath, [cli, 'init', '--dir', root]);
  await execFileAsync(process.execPath, [
    cli,
    'append',
    '--dir',
    root,
    '--type',
    'decision',
    '--summary',
    'Use local JSONL receipts',
    '--status',
    'ok'
  ]);

  const { stdout } = await execFileAsync(process.execPath, [cli, 'summary', '--format', 'json', '--dir', root]);
  const summary = JSON.parse(stdout);

  assert.equal(summary.total, 1);
  assert.equal(summary.byType.decision, 1);
});

test('CLI redacts fixture input', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cli, 'redact', 'tests/fixtures/raw-secret.txt']);

  assert.equal(stdout.includes('ghp_'), false);
  assert.equal(stdout.includes('Bearer abc'), false);
});
