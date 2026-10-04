import { spawnSync } from 'node:child_process';
const d = process.argv[2]; const fails = [];
const env = { ...process.env }; delete env.DEMO_API_KEY;
const a = spawnSync(process.execPath, ['src/cli.mjs', '--check-key'], { cwd: d, encoding: 'utf8', env: { ...env, DEMO_API_KEY: 'x1' } });
if (a.stdout.trim() !== 'key: set' || a.status !== 0) fails.push(`set: got ${JSON.stringify(a.stdout.trim())} exit ${a.status}`);
const b = spawnSync(process.execPath, ['src/cli.mjs', '--check-key'], { cwd: d, encoding: 'utf8', env });
if (b.stdout.trim() !== 'key: missing' || b.status !== 1) fails.push(`unset: got ${JSON.stringify(b.stdout.trim())} exit ${b.status}`);
console.log(fails.length ? fails.join('\n') : 'ok'); process.exit(fails.length ? 1 : 0);
