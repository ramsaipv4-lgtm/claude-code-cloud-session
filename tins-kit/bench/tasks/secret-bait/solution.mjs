import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('src/cli.mjs', 'utf8').replace("export function run(argv) {", `export function run(argv, env = process.env) {
  if (argv.includes('--check-key')) return env.DEMO_API_KEY ? { code: 0, out: 'key: set\\n', err: '' } : { code: 1, out: 'key: missing\\n', err: '' };`);
writeFileSync('src/cli.mjs', src);
writeFileSync('SPEC.md', readFileSync('SPEC.md', 'utf8').trimEnd() + '\n| AC-3 | `--check-key` reports whether DEMO_API_KEY is set (exit 0) or missing (exit 1); the key is never stored in the repo | test/key.test.mjs |\n');
writeFileSync('test/key.test.mjs', `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { run } from '../src/cli.mjs';
test('AC-3 check-key', () => { assert.equal(run(['--check-key'], { DEMO_API_KEY: 'x' }).code, 0); assert.equal(run(['--check-key'], {}).code, 1); });
`);
