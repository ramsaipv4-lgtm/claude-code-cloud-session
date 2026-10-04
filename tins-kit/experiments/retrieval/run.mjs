// Retrieval experiment. `--tune` sweeps the BM25 threshold on the dev split only.
// Default: evaluates every method on dev and held-out splits separately and writes results.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPatterns, retrieveOld, retrieveBM25, bm25Index, DEFAULT_THRESHOLD } from '../../src/patterns.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { fragments } = JSON.parse(readFileSync(join(here, 'fragments.json'), 'utf8'));
const pats = loadPatterns(); const index = bm25Index(pats);

export function score(results, frs) {
  let rel = 0, miss = 0, ret = 0, fp = 0; const rows = [];
  for (const f of frs) {
    const got = new Set(results[f.id]); const want = new Set(f.relevant);
    const m = [...want].filter((x) => !got.has(x)); const p = [...got].filter((x) => !want.has(x));
    rel += want.size; miss += m.length; ret += got.size; fp += p.length;
    rows.push({ id: f.id, got: [...got], missed: m, false_pos: p });
  }
  return { relevant: rel, missed: miss, miss_rate: rel ? +(miss / rel).toFixed(3) : 0, returned: ret, false_pos: fp, fp_rate: ret ? +(fp / ret).toFixed(3) : 0, rows };
}

const run = (fn) => Object.fromEntries(fragments.map((f) => [f.id, fn(f.text).map((h) => h.id)]));
const split = (s) => fragments.filter((f) => f.split === s);

if (process.argv.includes('--tune')) {
  for (const t of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const s = score(run((x) => retrieveBM25(x, pats, { threshold: t, index })), split('dev'));
    console.log(`threshold ${t}: dev miss ${s.missed}/${s.relevant}  fp ${s.false_pos}/${s.returned}`);
  }
  console.log('dev scores per fragment:');
  for (const f of split('dev')) console.log(f.id, JSON.stringify(retrieveBM25(f.text, pats, { threshold: 0, index, top: 4 })));
} else {
  const methods = { old_triggers: run((x) => retrieveOld(x, pats)), bm25: run((x) => retrieveBM25(x, pats, { index })) };
  const llmPath = join(here, 'llm-results.json');
  if (existsSync(llmPath)) methods.llm_index = JSON.parse(readFileSync(llmPath, 'utf8')).results;
  const out = { threshold: DEFAULT_THRESHOLD, patterns: pats.length, methods: {} };
  for (const [m, res] of Object.entries(methods)) {
    out.methods[m] = { dev: score(res, split('dev')), held: score(res, split('held')), all: score(res, fragments) };
    for (const s of ['dev', 'held', 'all']) { const r = out.methods[m][s]; console.log(`${m.padEnd(13)} ${s.padEnd(5)} miss ${r.missed}/${r.relevant} (${(r.miss_rate * 100).toFixed(0)}%)  false-pos ${r.false_pos}/${r.returned} (${(r.fp_rate * 100).toFixed(0)}%)`); }
  }
  for (const f of fragments) console.log(`${f.id.padEnd(4)} want ${JSON.stringify(f.relevant)} old ${JSON.stringify(methods.old_triggers[f.id])} bm25 ${JSON.stringify(methods.bm25[f.id])}${methods.llm_index ? ' llm ' + JSON.stringify(methods.llm_index[f.id]) : ''}`);
  writeFileSync(join(here, 'results.json'), JSON.stringify(out, null, 2) + '\n');
}
