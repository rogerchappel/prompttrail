import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile } from 'node:fs/promises';
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

const invalidArguments = [
  ['help', '--format', 'json', /Unknown flag "--format" for help/],
  ['init', 'unexpected', /init does not accept positional arguments/],
  ['append', '--summary', /--summary requires a value/],
  ['list', '--limti', '1', /Unknown flag "--limti" for list/],
  ['summary', 'unexpected', /summary does not accept positional arguments/],
  ['redact', 'one.txt', 'two.txt', /redact accepts at most one input file/],
  ['doctor', '--dir', 'one', '--dir', 'two', /--dir may only be specified once for doctor/]
];

for (const [command, ...args] of invalidArguments) {
  const expected = args.pop();
  test(`CLI rejects invalid ${command} arguments`, async () => {
    await assert.rejects(
      execFileAsync(process.execPath, [cli, command, ...args]),
      (error) => error.code === 1 && expected.test(error.stderr)
    );
  });
}

test('CLI validates init arguments before creating a ledger', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-invalid-init-'));

  await assert.rejects(
    execFileAsync(process.execPath, [cli, 'init', '--dir', root, '--unknown', 'value']),
    (error) => error.code === 1 && /Unknown flag "--unknown" for init/.test(error.stderr)
  );
  await assert.rejects(access(path.join(root, '.prompttrail', 'events.jsonl')));
});

test('CLI requires append summary before writing to the ledger', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-invalid-append-'));
  await execFileAsync(process.execPath, [cli, 'init', '--dir', root]);

  await assert.rejects(
    execFileAsync(process.execPath, [cli, 'append', '--dir', root, '--status', 'ok']),
    (error) => error.code === 1 && /append requires --summary <text>/.test(error.stderr)
  );
  assert.equal(await readFile(path.join(root, '.prompttrail', 'events.jsonl'), 'utf8'), '');
});

test('CLI accepts repeatable append tags', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-tags-'));
  await execFileAsync(process.execPath, [cli, 'init', '--dir', root]);
  const { stdout } = await execFileAsync(process.execPath, [
    cli, 'append', '--dir', root, '--summary', 'Tagged event', '--tag', 'first', '--tag=second'
  ]);

  assert.deepEqual(JSON.parse(stdout).tags, ['first', 'second']);
});

test('CLI redact accepts one optional input and output flag', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompttrail-redact-'));
  const output = path.join(root, 'redacted.txt');
  await execFileAsync(process.execPath, [cli, 'redact', 'tests/fixtures/raw-secret.txt', '--output', output]);

  assert.equal((await readFile(output, 'utf8')).includes('ghp_'), false);
});
