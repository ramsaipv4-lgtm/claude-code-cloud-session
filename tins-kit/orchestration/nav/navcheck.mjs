// navcheck.mjs <repo>: which nav labels does each Appendix D nav pattern match? (substring, case-insensitive,
// as the journeys' harness matches; I-7 showed /cards|review/ picking "Daily cards")
// A pattern matching two labels in one space is a collision: a journey clicks whichever comes first.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[2] || '.';
const F = join(root, 'packages/web/src/features');
const strings = JSON.parse(readFileSync(join(root, 'packages/web/src/strings/en.json'), 'utf8'));
const labels = [];
for (const g of readdirSync(F)) {
  const idx = join(F, g, 'index.tsx'); if (!existsSync(idx)) continue;
  const sp = join(F, g, 'strings.en.json'); if (existsSync(sp)) Object.assign(strings, JSON.parse(readFileSync(sp, 'utf8')));
  for (const m of readFileSync(idx, 'utf8').matchAll(/\{(?:[^{}]|\{[^{}]*\})*?path:\s*'([^']+)'(?:[^{}]|\{[^{}]*\})*\}/g)) {
    const e = m[0]; if (/nav:\s*false/.test(e)) continue;
    const space = (e.match(/space:\s*'(\w+)'/) || [])[1]; const key = (e.match(/label:\s*'([^']+)'/) || [])[1];
    const roles = (e.match(/roles:\s*\[([^\]]*)\]/) || [, ''])[1].replace(/'/g, '').trim();
    const order = Number((e.match(/order:\s*([\d.]+)/) || [, 1e9])[1]);
    labels.push({ group: g, path: m[1], space, key, roles, order });
  }
}
for (const l of labels) l.text = strings[l.key] ?? `?${l.key}`;
const spec = readFileSync(join(root, 'SPEC.md'), 'utf8');
const app = spec.slice(spec.indexOf('## Appendix D'), spec.indexOf('## Appendix E'));
let journey = '', bad = 0;
for (const line of app.split('\n')) {
  const j = line.match(/^### (\S+\.journey\.mjs)/); if (j) { journey = j[1]; continue; }
  for (const m of line.matchAll(/((?:learner|trainer|admin|coordinator|coach)\s+)?nav \/([^/]+)\/(?:\s*\((\w+)\))?/g)) {
    const who = (m[1] || m[3] || '').trim();
    const re = new RegExp(m[2], 'i');
    const hits = labels.filter((l) => re.test(l.text));
    const bySpace = {}; for (const h of hits) (bySpace[h.space] ||= []).push(h);
    for (const [space, hs] of Object.entries(bySpace)) if (hs.length > 1) {
      hs.sort((a, b) => a.order - b.order || a.text.localeCompare(b.text));
      bad++; console.log(`COLLISION ${journey} ${who || '(any)'} /${m[2]}/ in ${space}: WINS "${hs[0].text}" (${hs[0].group} ${hs[0].path} order ${hs[0].order}) over ${hs.slice(1).map((h) => `"${h.text}" ${h.group} ${h.path} order ${h.order}${h.roles ? ' [' + h.roles + ']' : ''}`).join(' | ')}`);
    }
    if (!hits.length) console.log(`UNMATCHED ${journey} ${who || '(any)'} /${m[2]}/`);
  }
}
console.log(`${labels.length} nav labels; ${bad} collision(s)`);
