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

test('redacts assigned secret values while keeping key names', () => {
  const result = redactText('OPENAI_API_KEY=sk-1234567890abcdefghijklmnop');

  assert.equal(result.text, 'OPENAI_API_KEY=[REDACTED]');
});
