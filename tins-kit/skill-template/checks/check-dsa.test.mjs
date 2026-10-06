// Tests for the dsa-patterns gate: a valid one-lesson package passes; each planted defect fails its check.
// Run: node --test checks/check.test.mjs   (needs python3 and a JDK)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { check, lessonTable } from './check-dsa.mjs';

const JAVA = 'import java.util.*;\npublic class Add {\n    public static void main(String[] a) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(sc.nextInt() + sc.nextInt());\n    }\n}';
const PY = 'a, b = map(int, input().split())\nprint(a + b)';
const FAULTY = 'a, b = map(int, input().split())\nprint(a - b)';
const fence = (info, body) => '```' + info + '\n' + body + '\n```';

function lesson(o = {}) {
  return `---\nid: L01\ntitle: Adding\ntechnique: T\npdf_problems: [1]\nmust: [1]\nest_minutes: 20\nobjectives: 2\nnew_terms: 2\nnext: end\n---\n# Lesson 1 — Adding\n\n` +
    `## ① Recognition cue\n\n| a | b |\n|---|---|\n| x | y |\n\n## ② Brute force\n\n${fence('java brute', '// x')}\n\n${fence('python brute', '# x')}\n\n` +
    `## ③ The template\n\n${fence('java template', '// t')}\n\n${fence('python template', '# t')}\n\n` +
    `## Problem 1 — Add two numbers\n\n**MUST TEACH**\n\n### Statement\n\nAdd.\n\n### Example and input format\n\n1 2 → 3\n\n### Approach\n\nPlus.\n\n### Dry run\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n` +
    `### Java solution\n\n${o.noJava ? '' : fence('java solution id=p1', JAVA)}\n\n### Python solution\n\n${fence('python solution id=p1', o.py || PY)}\n\n` +
    `### Complexity and edge cases\n\nO(1).\n\n### Tests\n\n${fence('text tests for=p1', 'in: 1 2\nout: 3\nin: -1 1\nout: 0\nin: 0 0\nout: 0')}\n\n` +
    `### Faulty first\n\n${fence('python faulty id=p1-ff', o.faulty || FAULTY)}\n\n### Recall cards\n\n**Q:** q  \n**A:** a\n\n> 🧑‍🏫 **Trainer note** — ⏱ 5 min. Ask.\n\n` +
    `## Extra practice\n\n### X1 — Same\n\n${fence('text tests for=x1', 'in: 2 2\nout: 4')}\n\n## Next\n\nEnd.\n`;
}
function makePkg(o = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsa-')); const m = {
    title: 'Fixture', teaching_minutes: 20, pdf_problems: [1], pdf_techniques: ['T'],
    lessons: [{ id: 'L01', title: 'Adding', technique: 'T', file: 'lessons/01.md', practice: 'practice/01.md', key: 'keys/01.md', pdf_problems: [1], must: [1], est_minutes: 20 }],
    files: { readme: 'README.md', day_plan: 'plan.md' } };
  const key = o.noKey ? '# Key\n' : `# Key\n\n${fence('text tests for=p1-ff', 'in: 1 2\nout: -1')}\n\n${fence('java solution id=x1', JAVA)}\n\n${fence('python solution id=x1', PY)}\n`;
  const files = { 'manifest.json': JSON.stringify(m), 'README.md': `# R\n\n${lessonTable(m)}\n`, 'plan.md': '| Clock | Min |\n|---|---|\n| 9:00 | 20 |\n',
    'lessons/01.md': lesson(o), 'practice/01.md': '# Practice\n', 'keys/01.md': key };
  for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), t); }
  return dir;
}
const checksOf = (dir) => { const r = check(dir); rmSync(dir, { recursive: true, force: true }); return r.fails.map((f) => f.check); };

test('a valid package passes', () => assert.deepEqual(checksOf(makePkg()), []));
test('a wrong Python solution fails execution (13)', () => assert.ok(checksOf(makePkg({ py: 'print(0)' })).includes(13)));
test('a missing Java solution fails (10)', () => assert.ok(checksOf(makePkg({ noJava: true })).includes(10)));
test('a "faulty" program that is actually correct fails (13)', () => {
  const dir = makePkg({ faulty: PY }); // key says it prints -1, it prints 3 → mismatch
  assert.ok(checksOf(dir).includes(13));
});
test('a missing answer key fails (12)', () => assert.ok(checksOf(makePkg({ noKey: true })).includes(12)));
