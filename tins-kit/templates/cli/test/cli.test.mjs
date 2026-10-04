import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/cli.mjs';

test('AC-1 --help prints usage and exits 0', () => {
  const r = run(['--help']); assert.equal(r.code, 0); assert.match(r.out, /usage/);
});
test('AC-2 unknown flag exits 2', () => {
  const r = run(['--nope']); assert.equal(r.code, 2); assert.match(r.err, /unknown option/);
});
