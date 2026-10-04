// Relay calibration agent: reads the packet on stdin (ignored), runs the task's known-good solution in a
// scratch copy of the current directory, and prints the changed files in the RELAY block format.
import { mkdtempSync, cpSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const task = process.argv[2]; readFileSync(0);
const scratch = mkdtempSync(join(tmpdir(), 'oracle-')); cpSync(process.cwd(), scratch, { recursive: true });
spawnSync(process.execPath, [join(task, 'solution.mjs')], { cwd: scratch, stdio: 'ignore' });
spawnSync('git', ['add', '-A', '-N'], { cwd: scratch });
const files = spawnSync('git', ['diff', '--name-only'], { cwd: scratch, encoding: 'utf8' }).stdout.split('\n').filter((f) => f && !f.startsWith('.tins/'));
for (const f of files) process.stdout.write(`=== FILE: ${f} ===\n${readFileSync(join(scratch, f), 'utf8')}=== END FILE ===\n`);
process.stdout.write('=== NOTES ===\noracle solution\n=== END NOTES ===\n');
rmSync(scratch, { recursive: true, force: true });
