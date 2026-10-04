import { spawnSync } from 'node:child_process';
const d = process.argv[2]; const run = (...a) => spawnSync(process.execPath, ['src/cli.mjs', ...a], { cwd: d, encoding: 'utf8' });
const fails = [];
const a = run('Ada'); if (a.stdout.trim() !== 'Hello, Ada!' || a.status !== 0) fails.push(`NAME: got ${JSON.stringify(a.stdout.trim())} exit ${a.status}`);
const b = run('--shout', 'Ada'); if (b.stdout.trim() !== 'HELLO, ADA!' || b.status !== 0) fails.push(`--shout: got ${JSON.stringify(b.stdout.trim())} exit ${b.status}`);
const h = run('--help'); if (h.status !== 0) fails.push('--help broke');
const u = run('--nope'); if (u.status !== 2) fails.push(`unknown option exit ${u.status}, want 2`);
console.log(fails.length ? fails.join('\n') : 'ok'); process.exit(fails.length ? 1 : 0);
