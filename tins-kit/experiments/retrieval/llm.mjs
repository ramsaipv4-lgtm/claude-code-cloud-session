// Method "llm_index": a model reads the full one-line pattern index (what `kit patterns` prints with
// no argument) plus one spec fragment, and names the relevant ids. Needs `claude` on PATH.
// Usage: node llm.mjs [model]   (default claude-haiku-4-5-20251001). Writes llm-results.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadPatterns, indexLines } from '../../src/patterns.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const model = process.argv[2] || 'claude-haiku-4-5-20251001';
const { fragments } = JSON.parse(readFileSync(join(here, 'fragments.json'), 'utf8'));
const pats = loadPatterns(); const ids = new Set(pats.map((p) => p.id));
const index = indexLines(pats).join('\n');

const ask = (f) => new Promise((res) => {
  const prompt = `Here is an index of reusable implementation patterns:\n\n${index}\n\nA project specification contains this requirement:\n\n"${f.text}"\n\nWhich patterns would an implementer of THIS requirement need? Only include a pattern if the requirement cannot be met correctly without solving the problem that pattern solves. Answer with only a JSON array of pattern ids, e.g. ["a","b"] or [].`;
  const p = spawn('claude', ['-p', '--model', model, '--tools', '', '--setting-sources', '', '--no-session-persistence'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stdin.end(prompt);
  p.on('close', () => { const m = out.match(/\[[^\]]*\]/); let got = []; try { got = m ? JSON.parse(m[0]) : []; } catch {} res(got.filter((x) => ids.has(x))); });
});

const results = {};
for (let i = 0; i < fragments.length; i += 4) {
  const batch = fragments.slice(i, i + 4);
  const got = await Promise.all(batch.map(ask));
  batch.forEach((f, j) => { results[f.id] = got[j]; console.log(f.id, JSON.stringify(got[j])); });
}
writeFileSync(join(here, 'llm-results.json'), JSON.stringify({ model, index_chars: index.length, date: new Date().toISOString(), results }, null, 2) + '\n');
