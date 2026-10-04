// Secret canary: every class must be detected, the value must never be printed, and plausible
// non-secrets must pass. Canary values are assembled at runtime (no literal secret in the repo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, scanText } from '../src/secrets.mjs';
import { kit, tmp, write, rm, FAKE } from './helpers.mjs';

const canaries = {
  'aws-access-key-id': `id = ${FAKE.aws()}`,
  'github-token': `token: ${FAKE.github()}`,
  'anthropic-key': `KEY=${FAKE.anthropic()}`,
  'openai-key': 'k = ' + 'sk-' + 'proj-' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',
  'google-api-key': 'AIza' + 'SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q',
  'slack-token': 'xoxb-' + '123456789012-abcdefABCDEF',
  'stripe-live-key': 'sk_' + 'live_' + '4eC39HqLyjWDarjtT1zdp7dc',
  'private-key-block': '-----BEGIN ' + 'RSA PRIVATE KEY-----',
  'url-with-password': 'DATABASE_URL=postgres://app:' + 'Tr0ub4dor3x' + '@db.internal:5432/app',
  'jwt': 'eyJ' + 'hbGciOiJIUzI1NiJ9.eyJ' + 'zdWIiOiIxMjM0NTY3ODkwIn0.' + 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  'generic-assignment': 'const apiKey = "' + 'q8Zr2LmX9vB4nT7w' + '";',
};

test('every canary class is detected', () => {
  for (const [cls, line] of Object.entries(canaries)) assert.equal(classify(line), cls, `${cls}: ${line.length} chars`);
});

test('non-secrets pass (false-positive guard)', () => {
  for (const line of [
    'const apiKey = process.env.API_KEY;', 'password = "changeme"', 'token: "<your-token-here>"',
    'postgres://localhost:5432/app', 'const key = "${API_KEY}"', 'export const total = sumMinor(lines);',
    'sha = "3f786850e387550fdab836ed7e6dc881de23001b"', 'See AKIA keys documentation', 'password_hint = "first pet"',
  ]) assert.equal(classify(line), null, line);
});

test('standalone scanner prints class and line, never the value', () => {
  const d = tmp();
  try {
    const v = FAKE.github();
    write(d, 'a.txt', `ok\nx = ${v}\n`);
    const r = kit(d, 'scan', 'a.txt');
    assert.equal(r.code, 1); assert.match(r.out, /a.txt:2: github-token/); assert.ok(!r.out.includes(v));
    assert.equal(scanText('a', 'clean').length, 0);
  } finally { rm(d); }
});
