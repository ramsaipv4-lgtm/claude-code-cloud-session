// Ledger tests (ordering traps). The "natural order" cases are the ordering traps from brief 2.2.5: each must
// either succeed or self-heal; none may leave the agent stuck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { miniProject, kit, git, write, read, rm, FAKE, exists, KIT_BIN, sh } from './helpers.mjs';

const lastRecord = (d) => {
  // the record of the most recent close commit (file names sort by second + random id, so not by time)
  const c = git(d, 'log', '-1', '--format=%H', '--grep=^tins: close session');
  return c ? read(d, git(d, 'show', '--name-only', '--format=', c)) : '';
};

test('happy path: start, commit with no trailer, close -> trailer healed, record committed, tree clean', () => {
  const d = miniProject();
  try {
    assert.equal(kit(d, 'start').code, 0);
    write(d, 'src/extra.mjs', 'export const x = 1;\n');
    git(d, 'add', '-A'); git(d, 'commit', '-qm', 'add extra'); // agent forgot the trailer
    const r = kit(d, 'close');
    assert.equal(r.code, 0, r.out);
    const rec = lastRecord(d);
    assert.match(rec, /trailers: healed:1/);
    assert.match(rec, /gate: pass/);
    assert.match(rec, /src\/extra.mjs \+1 -0/);
    assert.equal(git(d, 'status', '--porcelain'), '');
    const msgs = git(d, 'log', '--format=%B%x00', 'HEAD~2..HEAD');
    assert.equal((msgs.match(/Session: [0-9a-f]{8}/g) || []).length, 2, 'both the work commit and the record commit carry the trailer');
    assert.equal(kit(d, 'check', '--base', 'HEAD~2').code, 0);
  } finally { rm(d); }
});

test('agent never commits: close commits the work itself', () => {
  const d = miniProject();
  try {
    kit(d, 'start');
    write(d, 'src/extra.mjs', 'export const y = 2;\n');
    const r = kit(d, 'close');
    assert.equal(r.code, 0, r.out);
    assert.match(git(d, 'log', '--format=%s', '-2'), /uncommitted work at close/);
  } finally { rm(d); }
});

test('agent never calls start: close infers the base from the last close (or root) and succeeds', () => {
  const d = miniProject();
  try {
    write(d, 'src/a.mjs', 'export const a = 1;\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'a');
    const r = kit(d, 'close');
    assert.equal(r.code, 0, r.out);
    assert.match(lastRecord(d), /base_source: inferred-last-close/);
    // second unstarted session must start from the previous close, not re-claim old commits
    write(d, 'src/b.mjs', 'export const b = 1;\n');
    assert.equal(kit(d, 'close').code, 0);
    const rec = lastRecord(d);
    assert.match(rec, /src\/b.mjs/); assert.doesNotMatch(rec, /src\/a.mjs/);
  } finally { rm(d); }
});

test('start twice resumes; close twice is harmless', () => {
  const d = miniProject();
  try {
    const a = kit(d, 'start').out.match(/session (\w+)/)[1];
    const b = kit(d, 'start').out.match(/session (\w+)/)[1];
    assert.equal(a, b);
    write(d, 'src/c.mjs', 'export const c = 1;\n');
    assert.equal(kit(d, 'close').code, 0);
    const second = kit(d, 'close');
    assert.equal(second.code, 1); assert.match(second.out, /nothing to record/);
    kit(d, 'abort');
  } finally { rm(d); }
});

test('dirty tree before start is attributed but flagged', () => {
  const d = miniProject();
  try {
    write(d, 'src/pre.mjs', 'export const p = 1;\n');
    kit(d, 'start');
    assert.equal(kit(d, 'close').code, 0);
    assert.match(lastRecord(d), /dirty_at_start:\n  - src\/pre.mjs/);
  } finally { rm(d); }
});

test('kit run wraps any command: model cannot forget start/close', () => {
  const d = miniProject();
  try {
    const agent = `require('fs').writeFileSync('src/run.mjs','export const r = 1;\\n')`;
    const r = kit(d, 'run', '--model', 'demo-model', '--', process.execPath, '-e', agent);
    assert.equal(r.code, 0, r.out);
    const rec = lastRecord(d);
    assert.match(rec, /model_claimed: demo-model/); assert.match(rec, /model_source: launcher/); assert.match(rec, /model_verified: false/);
    assert.match(rec, /agent command exit: 0/);
  } finally { rm(d); }
});

test('crash mid-session: kit run again resumes the same session', () => {
  const d = miniProject();
  try {
    const crash = `require('fs').writeFileSync('src/greet.mjs','broken('); process.exit(3)`;
    const r1 = kit(d, 'run', '--', process.execPath, '-e', crash);
    assert.equal(r1.code, 1);
    const id = JSON.parse(read(d, '.git/tins-session.json')).id;
    const fix = `require('fs').writeFileSync('src/greet.mjs','export const greet = () => "hi";\\n')`;
    const r2 = kit(d, 'run', '--', process.execPath, '-e', fix);
    assert.equal(r2.code, 0, r2.out); assert.match(r2.out, new RegExp(`resuming open session ${id}`));
  } finally { rm(d); }
});

test('kit run where the agent already ran close itself: success, no duplicate record', () => {
  const d = miniProject();
  try {
    const agent = `require('fs').writeFileSync('src/z.mjs','export const z = 1;\\n'); require('child_process').execFileSync(process.execPath, [${JSON.stringify(KIT_BIN)}, 'close'], { stdio: 'inherit' })`;
    const r = kit(d, 'run', '--', process.execPath, '-e', agent);
    assert.equal(r.code, 0, r.out);
    assert.equal(git(d, 'ls-files', 'sessions').split('\n').filter(Boolean).length, 1);
  } finally { rm(d); }
});
