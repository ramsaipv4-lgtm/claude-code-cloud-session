import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintSpec, specDiff } from '../src/spec.mjs';
import { violations, overlaps, safeRelative } from '../src/scope.mjs';
import { tmp, write, rm } from './helpers.mjs';

const T = (rows) => `| ID | x | y |\n|---|---|---|\n${rows.join('\n')}\n`;

test('spec lint: duplicates, bad status, untraced AC, unknown supersede', () => {
  const d = tmp();
  try {
    write(d, 't.test.mjs', '// AC-1\n');
    assert.deepEqual(lintSpec(T(['| D-1 | a | locked |', '| AC-1 | b | t.test.mjs |']), d), []);
    const p = lintSpec(T(['| D-1 | a | locked |', '| D-1 | a | maybe |', '| D-2 | c | superseded by D-9 |', '| AC-1 | b | missing.mjs |', '| AC-2 | b | t.test.mjs |', '| AC-3 | b | manual (listen) |']), d);
    assert.ok(p.some((x) => /duplicate id D-1/.test(x)));
    assert.ok(p.some((x) => /D-1: status must be/.test(x)));
    assert.ok(p.some((x) => /superseded by unknown D-9/.test(x)));
    assert.ok(p.some((x) => /missing.mjs does not exist/.test(x)));
    assert.ok(p.some((x) => /does not mention AC-2/.test(x)));
    assert.ok(!p.some((x) => /AC-3/.test(x)), 'manual is allowed');
  } finally { rm(d); }
});

test('intent diff: added / changed / removed rows', () => {
  const a = T(['| D-1 | a | locked |', '| D-2 | b | locked |']);
  const b = T(['| D-1 | a | superseded by D-3 |', '| D-3 | c | locked |']);
  assert.deepEqual(specDiff(a, b), { added: ['D-3'], changed: ['D-1'], removed: ['D-2'] });
});

test('scope rules', () => {
  assert.deepEqual(violations(['src/a.js', 'README.md'], ['src']), ['README.md']);
  assert.deepEqual(violations(['srcx/a.js'], ['src']), ['srcx/a.js'], 'prefix must be a path segment');
  assert.deepEqual(violations(['tins.json', '.tins/kit/x', 'sessions/a.md', 'tasks/t.md', 'a', '.tins/patterns.lock'], null), ['tins.json', '.tins/kit/x', 'sessions/a.md', 'tasks/t.md']);
  assert.deepEqual(violations(['tins.json'], ['tins.json']), [], 'explicit grant');
  assert.deepEqual(violations(['src\\win.js'], ['src']), [], 'backslashes normalised');
  assert.ok(overlaps(['src/a'], ['src'])); assert.ok(!overlaps(['src/a'], ['src/b'])); assert.ok(overlaps(null, ['x']));
  for (const bad of ['../x', '/etc/passwd', 'C:/x', 'a/../../b', '', 'a//b']) assert.ok(!safeRelative(bad), bad);
  assert.ok(safeRelative('src/a.mjs'));
});
