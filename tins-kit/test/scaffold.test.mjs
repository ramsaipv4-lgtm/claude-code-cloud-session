// Scaffold by type (brief 2.2.3): gate passes on first run, no deps, no dead scripts, nothing
// web-specific in non-web projects, and the gate demonstrably checks something (mutation).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { kit, tmp, rm, git, write, sh } from './helpers.mjs';

const MUTATE = {
  cli: ['src/cli.mjs', 'export const run = () => ({ code: 0, out: "", err: "" });\n'],
  library: ['src/index.mjs', 'export const version = () => "9";\n'],
  web: ['public/index.html', 'nothing\n'],
  content: ['content/01-opening.md', 'no title\n'],
};

for (const type of Object.keys(MUTATE)) {
  test(`scaffold ${type}: runnable gate, no deps, no dead scripts, gate catches a mutation`, () => {
    const parent = tmp(); const d = join(parent, `p-${type}`);
    try {
      const r = kit(parent, 'new', d, '--type', type);
      assert.equal(r.code, 0, r.out);
      // the vendored kit, not the kit source tree, runs the gate
      const g = sh(process.execPath, ['.tins/kit/bin/kit.mjs', 'gate'], d);
      assert.equal(g.code, 0, g.out); assert.match(g.out, /gate: PASS/);
      for (const bad of ['prisma', 'tsconfig.json', 'node_modules', '.tins/kit/templates']) assert.ok(!existsSync(join(d, bad)), `${type} must not contain ${bad}`);
      if (existsSync(join(d, 'package.json'))) {
        const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
        assert.ok(!pkg.dependencies && !pkg.devDependencies, 'no dependencies');
        for (const [name, cmd] of Object.entries(pkg.scripts)) {
          for (const f of cmd.split(/\s+/).filter((x) => /\.(m?js|ts)$/.test(x))) assert.ok(existsSync(join(d, f)), `script ${name} references missing ${f}`);
        }
      } else assert.equal(type, 'content');
      assert.equal(git(d, 'status', '--porcelain'), '', 'scaffold leaves a clean, committed tree');
      // an end-to-end session in the fresh project
      write(d, 'NOTES.md', 'hello\n');
      const c = sh(process.execPath, ['.tins/kit/bin/kit.mjs', 'close'], d);
      assert.equal(c.code, 0, c.out);
      // mutation: the gate must fail when the thing an AC checks is broken
      writeFileSync(join(d, MUTATE[type][0]), MUTATE[type][1]);
      const m = sh(process.execPath, ['.tins/kit/bin/kit.mjs', 'gate'], d);
      assert.equal(m.code, 1, `gate should fail after mutating ${MUTATE[type][0]}`);
    } finally { rm(parent); }
  });
}

test('pattern add copies module + test into a project and its gate runs the test', () => {
  const parent = tmp(); const d = join(parent, 'lib1');
  try {
    kit(parent, 'new', d, '--type', 'library');
    const r = sh(process.execPath, ['.tins/kit/bin/kit.mjs', 'pattern', 'add', 'money-minor-units'], d);
    assert.equal(r.code, 0, r.out);
    assert.ok(existsSync(join(d, 'lib', 'money.test.mjs')));
    const lock = JSON.parse(readFileSync(join(d, '.tins', 'patterns.lock'), 'utf8'));
    assert.ok(lock['money-minor-units'].hash['money.mjs']);
    const g = sh(process.execPath, ['--test'], d);
    assert.match(g.out, /money: no float drift/, 'the copied pattern test is discovered by the project gate');
    assert.doesNotMatch(g.out, /atomic-write/, 'vendored (not copied) pattern tests are not run by the project');
  } finally { rm(parent); }
});
