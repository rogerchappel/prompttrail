import assert from 'node:assert/strict';
import test from 'node:test';
import { redactText } from '../dist/index.js';

test('redacts common tokens and home paths', () => {
  const result = redactText(
    'ghp_1234567890abcdefghijklmnopqrstuv in /Users/roger/project with Bearer abcdefghijklmnopqrstuvwxyz',
    '/Users/roger'
  );

  assert.equal(result.text.includes('ghp_'), false);
  assert.equal(result.text.includes('Bearer abc'), false);
  assert.equal(result.text.includes('/Users/roger'), false);
  assert.equal(result.text.includes('~/project'), true);
  assert.equal(result.replacements, 3);
});

test('redacts private-key PEM blocks while preserving benign text', () => {
  const result = redactText('before\n-----BEGIN PRIVATE KEY-----\nordinary-fixture-key-material\n-----END PRIVATE KEY-----\nafter', '/no-home-match');

  assert.equal(result.text, 'before\n[REDACTED]\nafter');
  assert.equal(result.replacements, 1);
});

test('redacts assigned secret values while keeping key names', () => {
  const result = redactText('OPENAI_API_KEY=sk-1234567890abcdefghijklmnop');

  assert.equal(result.text, 'OPENAI_API_KEY=[REDACTED]');
});

test('redacts every assigned secret including case variations and reports each replacement', () => {
  const input = 'API_TOKEN=alpha-secret-value password=beta-secret-value Mixed_Secret=gamma-secret-value';
  const result = redactText(input, '/no-home-match');

  assert.equal(
    result.text,
    'API_TOKEN=[REDACTED] password=[REDACTED] Mixed_Secret=[REDACTED]'
  );
  assert.equal(result.replacements, 3);
});


test('redacts URL userinfo credentials while preserving safe URL components', () => {
  const input = [
    'https://alice:plain-password@example.test:8443/path?mode=read#section',
    'postgres://db-user:database-password@db.example.test/app',
    'https://token-only@example.test/resource',
    'https://user:ghp_1234567890abcdefghijklmnopqrstuv@example.test/token'
  ].join(' ');
  const result = redactText(input, '/no-home-match');

  for (const secret of ['alice', 'plain-password', 'db-user', 'database-password', 'token-only', 'ghp_1234567890abcdefghijklmnopqrstuv']) {
    assert.equal(result.text.includes(secret), false, `leaked ${secret}`);
  }
  assert.match(result.text, /https:\/\/\[REDACTED\]@example\.test:8443\/path\?mode=read#section/);
  assert.match(result.text, /postgres:\/\/\[REDACTED\]@db\.example\.test\/app/);
  assert.match(result.text, /https:\/\/\[REDACTED\]@example\.test\/resource/);
  assert.equal(result.replacements, 4);
});
