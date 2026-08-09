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

test('CLI accepts a complete positive integer limit token', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cli,
    'list',
    '--dir',
    'tests/fixtures/sample-ledger',
    '--limit',
    '2',
    '--format',
    'json'
  ]);

  assert.equal(JSON.parse(stdout).length, 2);
});

test('CLI rejects a partially numeric limit token', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cli, 'list', '--limit', '2oops']),
    (error) => error.code === 1 && /--limit must be a positive integer/.test(error.stderr)
  );
});

for (const command of ['list', 'summary', 'doctor']) {
  test(`CLI rejects an unsupported ${command} output format`, async () => {
    await assert.rejects(
      execFileAsync(process.execPath, [
        cli,
        command,
        '--dir',
        'tests/fixtures/sample-ledger',
        '--format',
        'yaml'
      ]),
      (error) => error.code === 1 && /--format must be markdown or json/.test(error.stderr)
    );
  });
}
