// Self-test entry: `node <kit>/test/run.mjs [filter]` from any directory. No network.
// Test files run as parallel processes (each test spawns git/node synchronously, so in-process
// concurrency would not help). Exit code is node --test's.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs') && (!only || f.includes(only))).sort().map((f) => join(here, f));
const t0 = Date.now();
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: here });
console.log(`self-test: ${r.status === 0 ? 'PASS' : 'FAIL'} — ${files.length} files, ${((Date.now() - t0) / 1000).toFixed(1)}s, node ${process.versions.node}, cwd ${process.cwd()}`);
process.exit(r.status ?? 1);
