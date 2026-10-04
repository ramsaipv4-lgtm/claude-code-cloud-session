// Measures the token cost of the entry path with a real tokenizer: the difference in reported input
// tokens between a prompt containing the file and a near-empty prompt. Needs `claude` on PATH.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)); const KIT = join(here, '..', '..');
const model = process.argv[2] || 'claude-haiku-4-5-20251001';
const tokens = (prompt) => {
  const r = spawnSync('claude', ['-p', '--model', model, '--tools', '', '--output-format', 'json', '--setting-sources', '', '--no-session-persistence'], { input: prompt, encoding: 'utf8' });
  const u = JSON.parse(r.stdout).usage; return u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
};
const baseline = tokens('Reply OK.');
const out = { model, date: new Date().toISOString(), baseline_tokens: baseline, files: {} };
for (const f of ['ENTRY.md', 'RELAY.md']) {
  const text = readFileSync(join(KIT, f), 'utf8');
  out.files[f] = { bytes: Buffer.byteLength(text), words: text.split(/\s+/).filter(Boolean).length, tokens: tokens(`${text}\n\nReply OK.`) - baseline };
}
const idx = spawnSync(process.execPath, [join(KIT, 'bin', 'kit.mjs'), 'patterns'], { encoding: 'utf8' }).stdout;
out.files['kit patterns (index output)'] = { bytes: Buffer.byteLength(idx), words: idx.split(/\s+/).filter(Boolean).length, tokens: tokens(`${idx}\n\nReply OK.`) - baseline };
writeFileSync(join(here, 'result.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
