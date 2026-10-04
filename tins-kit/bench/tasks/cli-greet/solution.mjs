// Oracle: a known-good solution, used only to calibrate the harness and the check.
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync('src/cli.mjs', `#!/usr/bin/env node
export function run(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { code: 0, out: 'usage: cli [--shout] NAME\\n', err: '' };
  const unknown = argv.find((a) => a.startsWith('-') && a !== '--shout');
  if (unknown) return { code: 2, out: '', err: \`unknown option \${unknown}\\n\` };
  const name = argv.find((a) => !a.startsWith('-'));
  if (!name) return { code: 0, out: '', err: '' };
  const g = \`Hello, \${name}!\`;
  return { code: 0, out: (argv.includes('--shout') ? g.toUpperCase() : g) + '\\n', err: '' };
}
if (process.argv[1]?.endsWith('cli.mjs')) { const r = run(process.argv.slice(2)); process.stdout.write(r.out); process.stderr.write(r.err); process.exitCode = r.code; }
`);
writeFileSync('SPEC.md', readFileSync('SPEC.md', 'utf8').trimEnd() + '\n| AC-3 | `NAME` prints `Hello, NAME!`; `--shout NAME` prints it upper-cased | test/greet.test.mjs |\n');
writeFileSync('test/greet.test.mjs', `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { run } from '../src/cli.mjs';
test('AC-3 greet and shout', () => { assert.equal(run(['Ada']).out, 'Hello, Ada!\\n'); assert.equal(run(['--shout', 'Ada']).out, 'HELLO, ADA!\\n'); });
`);
