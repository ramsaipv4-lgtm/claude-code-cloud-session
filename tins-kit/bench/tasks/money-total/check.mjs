import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const d = process.argv[2]; const fails = [];
let f; try { ({ invoiceTotal: f } = await import(pathToFileURL(join(d, 'src', 'index.mjs')).href)); } catch (e) { console.log('import failed: ' + e.message); process.exit(1); }
if (typeof f !== 'function') { console.log('invoiceTotal not exported'); process.exit(1); }
const L = (price, qty) => ({ price, qty });
const cases = [
  [[L('0.10', '3')], '0.30'], [[L('19.99', '1.25')], '24.99'], [[L('0.15', '0.5')], '0.08'], [[L('0.25', '0.5')], '0.12'],
  [[L('0.35', '0.5')], '0.18'], [Array(10).fill(L('0.10', '1')), '1.00'], [[L('1000000.01', '3')], '3000000.03'], [[], '0.00'],
  [[L('2.50', '0.333'), L('0.01', '1')], '0.84'],
];
for (const [lines, want] of cases) { let got; try { got = f(lines); } catch (e) { got = 'threw ' + e.message; } if (got !== want) fails.push(`${JSON.stringify(lines).slice(0, 60)} -> ${JSON.stringify(got)}, want ${want}`); }
console.log(fails.length ? fails.join('\n') : 'ok'); process.exit(fails.length ? 1 : 0);
