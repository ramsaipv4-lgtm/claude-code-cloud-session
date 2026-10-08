// fullsuite.mjs <repo> <out.tap>: runs the acceptance files for every claimed row, like scripts/gate.mjs, keeping full TAP.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const [root, out] = process.argv.slice(2);
const spec = readFileSync(join(root, 'SPEC.md'), 'utf8');
const want = new Set();
for (const f of readdirSync(join(root, 'build/progress')).filter((x) => x.endsWith('.json'))) { const t = readFileSync(join(root, 'build/progress', f), 'utf8').trim(); if (t) for (const g of JSON.parse(t).green) want.add(g); }
const files = new Set();
for (const l of spec.split('\n')) {
  const m = l.match(/^\| (AC-\d+) \|.*\|\s*`?(acceptance\/[^`|]+?)`?\s*\|\s*$/);
  if (m && want.has(m[1])) for (const f of m[2].split(/[,\s]+/).map((x) => x.replace(/`/g, '')).filter(Boolean)) files.add(f);
}
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', timeout: 2400000, maxBuffer: 1 << 28 });
writeFileSync(out, `# files: ${[...files].length}\n` + (r.stdout || '') + (r.stderr || ''));
