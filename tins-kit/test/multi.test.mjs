// Multi-agent path with two REAL git worktrees and two concurrently running (scripted) agents.
// Deliberate conflict: both tasks add "AC-2" to SPEC.md at the same place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { kit, tmp, rm, git, sh, KIT_BIN } from './helpers.mjs';

const runAsync = (cwd, args) => new Promise((res) => {
  const p = spawn(process.execPath, [KIT_BIN, ...args], { cwd, env: process.env });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => res({ code, out }));
});

/** A scripted agent: adds an AC row to SPEC.md, a module and its test. */
const agentScript = (name, ac) => `
const fs = require('fs');
const spec = fs.readFileSync('SPEC.md', 'utf8').replace(/\\n$/, '') + '\\n| ${ac} | ${name}() returns "${name}" | test/${name}.test.mjs |\\n';
fs.writeFileSync('SPEC.md', spec);
fs.writeFileSync('src/${name}.mjs', 'export const ${name} = () => "${name}";\\n');
fs.writeFileSync('test/${name}.test.mjs', 'import { test } from "node:test"; import assert from "node:assert"; import { ${name} } from "../src/${name}.mjs";\\ntest("${ac}", () => assert.equal(${name}(), "${name}"));\\n');
`;

test('two worktrees, concurrent agents, deliberate SPEC conflict, reconciler, resolution, final check', async () => {
  const parent = tmp(); const main = join(parent, 'proj');
  try {
    assert.equal(kit(parent, 'new', main, '--type', 'library').code, 0);
    const root = git(main, 'rev-parse', 'HEAD');
    // overlapping scopes are refused unless the planner accepts the risk
    assert.equal(kit(main, 'task', 'new', 'alpha', '--paths', 'SPEC.md,src/alpha.mjs,test/alpha.test.mjs', '-m', 'Add alpha().').code, 0);
    const refused = kit(main, 'task', 'new', 'beta', '--paths', 'SPEC.md,src/beta.mjs,test/beta.test.mjs');
    assert.equal(refused.code, 1); assert.match(refused.out, /overlap open task\(s\) alpha/);
    assert.equal(kit(main, 'task', 'new', 'beta', '--paths', 'SPEC.md,src/beta.mjs,test/beta.test.mjs', '--overlap-ok', '-m', 'Add beta().').code, 0);
    const wtA = join(parent, 'proj.worktrees', 'alpha'); const wtB = join(parent, 'proj.worktrees', 'beta');

    // both agents run at the same time, each in its own worktree, each through kit run
    const [ra, rb] = await Promise.all([
      runAsync(wtA, ['run', '--task', 'alpha', '--', process.execPath, '-e', agentScript('alpha', 'AC-2')]),
      runAsync(wtB, ['run', '--task', 'beta', '--', process.execPath, '-e', agentScript('beta', 'AC-2')]),
    ]);
    assert.equal(ra.code, 0, ra.out); assert.equal(rb.code, 0, rb.out);

    // reconciler: alpha merges; beta conflicts on SPEC.md and is refused cleanly
    const ma = kit(main, 'merge', 'alpha'); assert.equal(ma.code, 0, ma.out);
    const before = git(main, 'rev-parse', 'HEAD');
    const mb = kit(main, 'merge', 'beta');
    assert.equal(mb.code, 3, mb.out); assert.match(mb.out, /conflict in SPEC.md/);
    assert.equal(git(main, 'rev-parse', 'HEAD'), before, 'refused merge leaves integration branch untouched');
    assert.equal(git(main, 'status', '--porcelain'), '', 'and its tree clean');

    // beta's worker resolves in its own worktree, in a new session: merge main, renumber to AC-3
    const branch = git(main, 'rev-parse', '--abbrev-ref', 'HEAD');
    assert.equal(kit(wtB, 'start', '--task', 'beta').code, 0);
    assert.notEqual(sh('git', ['merge', '-q', branch], wtB).code, 0, 'expected a real git conflict');
    const spec = readFileSync(join(wtB, 'SPEC.md'), 'utf8')
      .replace(/<<<<<<< HEAD\n(\| AC-2 \| beta.*\n)=======\n(\| AC-2 \| alpha.*\n)>>>>>>> .*\n/, '$2$1').replace('| AC-2 | beta', '| AC-3 | beta');
    writeFileSync(join(wtB, 'SPEC.md'), spec);
    writeFileSync(join(wtB, 'test/beta.test.mjs'), readFileSync(join(wtB, 'test/beta.test.mjs'), 'utf8').replace('AC-2', 'AC-3'));
    git(wtB, 'add', '-A'); git(wtB, 'commit', '-qm', 'merge main; renumber beta to AC-3'); // no trailer: close heals it (merge commit)
    const cb = kit(wtB, 'close'); assert.equal(cb.code, 0, cb.out);
    const rec = readFileSync(join(wtB, cb.out.match(/-> (sessions\/\S+)/)[1]), 'utf8');
    assert.match(rec, /merged_in: [1-9]/, 'alpha\'s commits came in through the merge');
    assert.match(rec, /spec_changed:\n  - AC-3|spec_added:\n  - AC-3/, 'beta\'s resolution is credited with AC-3');
    assert.doesNotMatch(rec, /spec_added:\n(  - .*\n)*  - AC-2/, 'alpha\'s AC-2 is not attributed to beta');
    assert.doesNotMatch(rec, /src\/alpha\.mjs/, 'alpha\'s files are not attributed to beta');

    const mb2 = kit(main, 'merge', 'beta'); assert.equal(mb2.code, 0, mb2.out);
    // the whole integration history verifies from the scaffold commit
    const all = kit(main, 'check', '--base', root); assert.equal(all.code, 0, all.out);
    assert.match(readFileSync(join(main, 'SPEC.md'), 'utf8'), /AC-2 \| alpha[\s\S]*AC-3 \| beta/);
    assert.match(kit(main, 'task', 'list').out, /alpha\s+merged[\s\S]*beta\s+merged/);
  } finally { rm(parent); }
});

test('reconciler refuses a task whose worker ignored its scope (ran without --task)', () => {
  const parent = tmp(); const main = join(parent, 'proj');
  try {
    kit(parent, 'new', main, '--type', 'library');
    kit(main, 'task', 'new', 'gamma', '--paths', 'src/gamma.mjs');
    const wt = join(parent, 'proj.worktrees', 'gamma');
    const r = kit(wt, 'run', '--', process.execPath, '-e', "require('fs').writeFileSync('src/gamma.mjs','export const g=1;\\n'); require('fs').writeFileSync('README.md','hijack\\n')");
    assert.equal(r.code, 0, 'default scope allows README.md, so the worker\'s own close passes');
    const m = kit(main, 'merge', 'gamma');
    assert.equal(m.code, 1); assert.match(m.out, /README.md is outside task gamma's paths/);
  } finally { rm(parent); }
});

test('reconciler refuses when each side passes alone but the merged tree fails the gate', () => {
  const parent = tmp(); const main = join(parent, 'proj');
  try {
    kit(parent, 'new', main, '--type', 'library');
    kit(main, 'task', 'new', 'v2', '--paths', 'src/index.mjs,test/index.test.mjs');
    kit(main, 'task', 'new', 'extra', '--paths', 'test/extra.test.mjs');
    const w1 = join(parent, 'proj.worktrees', 'v2'); const w2 = join(parent, 'proj.worktrees', 'extra');
    // v2 changes version to 0.2.0 (and its own test); extra adds a test pinning 0.1.0 — semantic, not textual, conflict
    assert.equal(kit(w1, 'run', '--task', 'v2', '--', process.execPath, '-e', "const fs=require('fs'); fs.writeFileSync('src/index.mjs', fs.readFileSync('src/index.mjs','utf8').replace('0.1.0','0.2.0')); fs.writeFileSync('test/index.test.mjs', fs.readFileSync('test/index.test.mjs','utf8').replace('0.1.0','0.2.0'))").code, 0);
    assert.equal(kit(w2, 'run', '--task', 'extra', '--', process.execPath, '-e', "require('fs').writeFileSync('test/extra.test.mjs', 'import {test} from \"node:test\"; import a from \"node:assert\"; import {version} from \"../src/index.mjs\"; test(\"pin\", ()=>a.equal(version(), \"0.1.0\"));\\n')").code, 0);
    assert.equal(kit(main, 'merge', 'v2').code, 0);
    const before = git(main, 'rev-parse', 'HEAD');
    const m = kit(main, 'merge', 'extra');
    assert.equal(m.code, 1); assert.match(m.out, /REFUSED at gate/);
    assert.equal(git(main, 'rev-parse', 'HEAD'), before); assert.equal(git(main, 'status', '--porcelain'), '');
  } finally { rm(parent); }
});
