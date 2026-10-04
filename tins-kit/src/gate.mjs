// The gate: SPEC.md lint + the project's own commands from tins.json. No skip flag exists, by design.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintSpec } from './spec.mjs';

export function loadConfig(root) {
  const p = join(root, 'tins.json');
  if (!existsSync(p)) throw new Error(`no tins.json in ${root} — not a TINS project (run "kit new")`);
  const c = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(c.gate)) throw new Error('tins.json: "gate" must be an array of shell commands');
  return c;
}

export function runGate(root, { quiet = false } = {}) {
  const steps = [];
  const say = (s) => { if (!quiet) process.stdout.write(s + '\n'); };
  let cfg;
  try { cfg = loadConfig(root); } catch (e) { say(`gate: FAIL config — ${e.message}`); return { ok: false, steps: [{ name: 'config', ok: false }] }; }
  const specPath = join(root, 'SPEC.md');
  const problems = existsSync(specPath) ? lintSpec(readFileSync(specPath, 'utf8'), root) : ['SPEC.md missing'];
  steps.push({ name: 'spec', ok: problems.length === 0 });
  for (const p of problems) say(`  spec: ${p}`);
  for (const cmd of cfg.gate) {
    const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', timeout: (cfg.gate_timeout_s || 600) * 1000, env: { ...process.env, FORCE_COLOR: '0' } });
    const ok = r.status === 0;
    steps.push({ name: cmd, ok, code: r.status });
    if (!ok) {
      const tail = `${r.stdout || ''}${r.stderr || ''}`.split(/\r?\n/).slice(-25).join('\n');
      say(`  ${cmd}: exit ${r.status}${r.error ? ' (' + r.error.code + ')' : ''}\n${tail.replace(/^/gm, '    | ')}`);
    }
  }
  const ok = steps.every((s) => s.ok);
  say(`gate: ${ok ? 'PASS' : 'FAIL'} (${steps.map((s) => `${s.name}=${s.ok ? 'ok' : 'fail'}`).join(', ')})`);
  return { ok, steps };
}
