// The kit's own tree: drift, entry budget, doctor, upgrade. Runs from any cwd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { kit, tmp, rm, git, sh, KIT } from './helpers.mjs';
import { lintKit, BUDGET, upgradePlan } from '../src/doctor.mjs';

test('kit tree: no drift from KIT-VERSION, budgets met, patterns well-formed, no secret-like text', () => {
  assert.deepEqual(lintKit(), []);
});

test('entry path budget: ENTRY.md and RELAY.md are short enough to quote in a message', () => {
  for (const [f, max] of Object.entries(BUDGET)) assert.ok(readFileSync(join(KIT, f)).length <= max, f);
});

test('drift is detected: editing a stamped file without re-stamping fails lint', () => {
  const d = tmp();
  try {
    cpSync(KIT, d, { recursive: true, filter: (s) => !s.includes('.git') });
    writeFileSync(join(d, 'src', 'gate.mjs'), readFileSync(join(d, 'src', 'gate.mjs'), 'utf8') + '\n// sneaky\n');
    assert.ok(lintKit(d).some((p) => /changed since stamp: src\/gate.mjs/.test(p)));
  } finally { rm(d); }
});

test('doctor: healthy scaffold is ok; tampered vendored kit and a dangling worktree pointer are failures', () => {
  const parent = tmp(); const d = join(parent, 'p');
  try {
    kit(parent, 'new', d, '--type', 'library');
    assert.equal(kit(d, 'doctor').code, 0);
    kit(d, 'task', 'new', 't1', '--paths', 'src');
    const wt = join(parent, 'p.worktrees', 't1');
    writeFileSync(join(wt, '.git'), 'gitdir: /mnt/c/Users/someone/p/.git/worktrees/t1\n'); // as if created from WSL on a Windows path
    const r = sh(process.execPath, [join(d, '.tins/kit/bin/kit.mjs'), 'doctor'], wt);
    assert.notEqual(r.code, 0);
    writeFileSync(join(d, '.tins/kit/src/gate.mjs'), 'export const runGate = () => ({ ok: true, steps: [] });\n');
    const t = kit(d, 'doctor'); assert.equal(t.code, 1); assert.match(t.out, /vendored kit: changed since stamp: src\/gate.mjs/);
  } finally { rm(parent); }
});

test('upgrade: plan flags behavioural files; --apply vendors inside a recorded session', () => {
  const parent = tmp(); const d = join(parent, 'p'); const k2 = join(parent, 'kit2');
  try {
    kit(parent, 'new', d, '--type', 'cli');
    cpSync(KIT, k2, { recursive: true, filter: (s) => !/[\\/]\.git([\\/]|$)/.test(s) });
    writeFileSync(join(k2, 'ENTRY.md'), readFileSync(join(k2, 'ENTRY.md'), 'utf8') + '7. Be brief.\n');
    sh(process.execPath, [join(k2, 'bin/kit.mjs'), 'version', '--write'], k2);
    const plan = upgradePlan(d, k2);
    assert.deepEqual(plan.behavioural, ['ENTRY.md']);
    const r = sh(process.execPath, [join(k2, 'bin/kit.mjs'), 'upgrade', '--from', k2, '--apply'], d);
    assert.equal(r.code, 0, r.out);
    assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /7\. Be brief/);
    assert.equal(JSON.parse(readFileSync(join(d, 'tins.json'), 'utf8')).kit, plan.to);
    assert.match(git(d, 'log', '-1', '--format=%s'), /tins: close session/);
    assert.equal(kit(d, 'doctor').code, 0);
  } finally { rm(parent); }
});
