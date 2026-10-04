import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// with the kit: copy the proven pattern in; without it (bare condition) the oracle copies the same module
try { execFileSync(process.execPath, ['.tins/kit/bin/kit.mjs', 'pattern', 'add', 'money-minor-units'], { stdio: 'ignore' }); }
catch { mkdirSync('lib', { recursive: true }); copyFileSync(`${process.env.TINS_KIT_ROOT}/patterns/money-minor-units/money.mjs`, 'lib/money.mjs'); }
writeFileSync('src/index.mjs', readFileSync('src/index.mjs', 'utf8') + `import { parse, multiply, sum, format } from '../lib/money.mjs';
export const invoiceTotal = (lines) => format(sum(lines.map((l) => multiply(parse(l.price), l.qty, 'half-even'))));
`);
writeFileSync('SPEC.md', readFileSync('SPEC.md', 'utf8').trimEnd() + '\n| D-2 | Money is integer paise (pattern money-minor-units) | locked |\n| AC-2 | invoiceTotal rounds each line half-even to the paisa and sums exactly | test/invoice.test.mjs |\n');
writeFileSync('test/invoice.test.mjs', `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { invoiceTotal } from '../src/index.mjs';
test('AC-2 invoice total', () => { assert.equal(invoiceTotal([{ price: '0.15', qty: '0.5' }]), '0.08'); assert.equal(invoiceTotal([]), '0.00'); });
`);
