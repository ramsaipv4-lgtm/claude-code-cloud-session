import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const p = join(process.argv[2], 'content', '02-song.md'); const fails = [];
if (!existsSync(p)) { console.log('content/02-song.md missing'); process.exit(1); }
const t = readFileSync(p, 'utf8');
if (!/^# \S/.test(t)) fails.push('no title line');
const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
const want = ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus'];
if (JSON.stringify(heads) !== JSON.stringify(want)) fails.push(`sections ${JSON.stringify(heads)}`);
for (const [i, body] of t.split(/^## .+$/m).slice(1).entries()) { const n = body.split('\n').filter((l) => l.trim()).length; if (n < 2 || n > 4) fails.push(`section ${i + 1} has ${n} lines`); }
console.log(fails.length ? fails.join('\n') : 'ok'); process.exit(fails.length ? 1 : 0);
