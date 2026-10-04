// Ledger tests (safety): gate, secrets, scope, foreign commits, forged records.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { miniProject, kit, git, write, read, rm, FAKE, exists, KIT_BIN, sh } from './helpers.mjs';

const lastRecord = (d) => {
  // the record of the most recent close commit (file names sort by second + random id, so not by time)
  const c = git(d, 'log', '-1', '--format=%H', '--grep=^tins: close session');
  return c ? read(d, git(d, 'show', '--name-only', '--format=', c)) : '';
};

test('failing gate: close refuses, session stays open, work is committed not lost; --handover records but check refuses', () => {
  const d = miniProject();
  try {
    kit(d, 'start');
    write(d, 'src/greet.mjs', 'export const greet = () => "bye";\n');
    const r = kit(d, 'close');
    assert.equal(r.code, 1); assert.match(r.out, /gate failed/); assert.match(r.out, /stays OPEN/);
    assert.match(kit(d, 'status').out, /"id"/);
    assert.equal(git(d, 'status', '--porcelain'), '');
    const h = kit(d, 'close', '--handover');
    assert.equal(h.code, 1); assert.match(h.out, /HANDOVER/);
    const c = kit(d, 'check', '--base', 'HEAD~2');
    assert.equal(c.code, 1); assert.match(c.out, /status is handover/);
  } finally { rm(d); }
});

test('secret in a project file (not the record) is caught by close — the 2.2.4 hole — and the value is never printed', () => {
  const d = miniProject();
  try {
    kit(d, 'start');
    const key = FAKE.aws();
    write(d, 'src/config.mjs', `export const key = "${key}";\n`);
    git(d, 'add', '-A'); git(d, 'commit', '-qm', 'config');
    const r = kit(d, 'close');
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/config.mjs:1: aws-access-key-id/);
    assert.ok(!r.out.includes(key), 'value must not be printed');
    assert.ok(!exists(d, 'sessions'), 'no record is written for a session holding a secret');
    const h = kit(d, 'close', '--handover');
    assert.equal(h.code, 1, 'handover cannot launder a secret');
  } finally { rm(d); }
});

test('secret in a commit message is caught', () => {
  const d = miniProject();
  try {
    kit(d, 'start');
    write(d, 'src/x.mjs', 'export const x = 1;\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', `use token ${FAKE.github()}`);
    const r = kit(d, 'close');
    assert.equal(r.code, 1); assert.match(r.out, /message:1: github-token/);
  } finally { rm(d); }
});

test('scope: change outside allowed paths refuses close; protected paths need explicit grant', () => {
  const d = miniProject();
  try {
    kit(d, 'start', '--paths', 'src');
    write(d, 'README.md', 'x\n');
    const r = kit(d, 'close');
    assert.equal(r.code, 1); assert.match(r.out, /scope: README.md/);
    kit(d, 'abort');
    git(d, 'reset', '-q', '--hard', 'HEAD~1');
    kit(d, 'start'); // default scope = repo minus protected
    write(d, 'tins.json', JSON.stringify({ type: 'library', gate: [] }));
    const r2 = kit(d, 'close');
    assert.equal(r2.code, 1); assert.match(r2.out, /scope: tins.json/, 'an agent cannot weaken its own gate');
  } finally { rm(d); }
});

test('two sessions on one branch: close refuses with a clear reason instead of misattributing', () => {
  const d = miniProject();
  try {
    write(d, 'src/x.mjs', '1\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'x', '-m', 'Session: deadbeef');
    kit(d, 'start'); git(d, 'reset', '-q', '--soft', 'HEAD~1'); git(d, 'commit', '-qm', 'x', '-m', 'Session: deadbeef');
    // simulate: base predates the foreign commit
    const st = JSON.parse(read(d, '.git/tins-session.json')); st.base = git(d, 'rev-parse', 'HEAD~1');
    write(d, '.git/tins-session.json', JSON.stringify(st));
    const r = kit(d, 'close');
    assert.equal(r.code, 1); assert.match(r.out, /belongs to session deadbeef/);
  } finally { rm(d); }
});

test('check re-derives: a forged "clean" record does not hide a secret', () => {
  const d = miniProject();
  try {
    const base = git(d, 'rev-parse', 'HEAD');
    kit(d, 'start');
    write(d, 'src/ok.mjs', 'export const ok = 1;\n');
    assert.equal(kit(d, 'close').code, 0);
    // later, someone commits a secret with a copied trailer, never closing a session
    const id = lastRecord(d).match(/^id: (\w+)/m)[1];
    write(d, 'src/leak.mjs', `const t = "${FAKE.anthropic()}";\n`);
    git(d, 'add', '-A'); git(d, 'commit', '-qm', 'leak', '-m', `Session: ${id}`);
    const c = kit(d, 'check', '--base', base);
    assert.equal(c.code, 1); assert.match(c.out, /src\/leak.mjs:1: anthropic-key/);
  } finally { rm(d); }
});

test('gate is not fooled by an inherited NODE_TEST_CONTEXT (nested node --test exits 0 on failure otherwise)', () => {
  const d = miniProject();
  try {
    write(d, 'src/greet.mjs', 'export const greet = () => "bye";\n');
    const r = sh(process.execPath, [KIT_BIN, 'gate'], d, { NODE_TEST_CONTEXT: 'child-v8' });
    assert.equal(r.code, 1, r.out);
  } finally { rm(d); }
});

test('SPEC-first is mechanical: behaviour change without a SPEC row refuses close; a SPEC row or a recorded --why passes (RD-20)', () => {
  const d = miniProject();
  try {
    write(d, 'tins.json', JSON.stringify({ type: 'library', gate: ['node --test'], behaviour_paths: ['src'] }));
    git(d, 'add', '-A'); git(d, 'commit', '-qm', 'behaviour paths');
    kit(d, 'start');
    write(d, 'src/extra.mjs', 'export const e = 1;\n');
    const r = kit(d, 'close');
    assert.equal(r.code, 1); assert.match(r.out, /changed src\/extra.mjs but no D-n\/AC-n row/);
    const w = kit(d, 'close', '--why', 'internal helper, no observable behaviour');
    assert.equal(w.code, 0, w.out);
    assert.match(read(d, w.out.match(/-> (sessions\/\S+)/)[1]), /spec_waiver: "internal helper, no observable behaviour"/);
    kit(d, 'start');
    write(d, 'src/more.mjs', 'export const m = 1;\n');
    write(d, 'SPEC.md', read(d, 'SPEC.md').replace('| D-1 |', '| D-2 | more() exists | locked |\n| D-1 |'));
    assert.equal(kit(d, 'close').code, 0, 'a SPEC row satisfies it');
  } finally { rm(d); }
});
