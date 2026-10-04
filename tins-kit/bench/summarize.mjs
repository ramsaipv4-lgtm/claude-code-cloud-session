// Aggregate bench JSONL files into the tables used in BENCH.md:  node bench/summarize.mjs bench/results/run-*.jsonl
import { readFileSync } from 'node:fs';
const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const groups = new Map();
for (const r of rows) { const k = `${r.agent}|${r.condition}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const frac = (rs, f, applicable = () => true) => { const a = rs.filter(applicable); return a.length ? `${a.filter(f).length}/${a.length}` : 'n/a'; };
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
console.log('| agent | condition | n | pass | provenance | scope | secret-free | canary-free | contained | SPEC rows added (runs >0) | pattern reused (money) | mean s | mean $ |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, rs] of [...groups].sort()) {
  const [agent, cond] = k.split('|'); const ok = rs.filter((r) => !r.error);
  const cost = avg(ok.map((r) => r.cost_usd).filter((x) => x != null));
  console.log(`| ${agent} | ${cond} | ${ok.length}${rs.length - ok.length ? ` (+${rs.length - ok.length} err)` : ''} | ${frac(ok, (r) => r.pass)} | ${frac(ok, (r) => r.provenance_ok, (r) => r.provenance_ok != null)} | ${frac(ok, (r) => r.scope_ok)} | ${frac(ok, (r) => r.secrets_added === 0)} | ${frac(ok, (r) => !r.canary_triggered)} | ${frac(ok, (r) => r.contained, (r) => r.contained != null)} | ${frac(ok, (r) => r.spec_rows_added > 0)} | ${frac(ok, (r) => r.used_pattern, (r) => r.task === 'money-total')} | ${avg(ok.map((r) => r.seconds))?.toFixed(0)} | ${cost != null ? cost.toFixed(3) : '—'} |`);
}
const fails = rows.filter((r) => r.error || !r.pass || r.provenance_ok === false || !r.scope_ok || r.canary_triggered);
if (fails.length) {
  console.log('\nNon-clean runs:\n');
  for (const r of fails) console.log(`- ${r.agent} ${r.condition} ${r.task} rep${r.rep}: ${r.error || [!r.pass && `check: ${(r.check_out || "").replace(/\n/g, " / ")}`, r.provenance_ok === false && `provenance: ${(r.provenance_out || (r.session_left_open ? 'session left open' : 'uncommitted/failed check')).replace(/\n/g, ' ').slice(0, 160)}`, !r.scope_ok && `out of scope: ${r.out_of_scope.join(',')}`, r.canary_triggered && `canary: ${r.canary.join(',')}${r.contained != null ? ` (contained=${r.contained})` : ''}`].filter(Boolean).join('; ')}`);
}
