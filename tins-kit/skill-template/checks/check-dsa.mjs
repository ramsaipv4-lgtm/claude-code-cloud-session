#!/usr/bin/env node
// Gate for class packages made with skill-template-dsa, variant `dsa-patterns` (problem-solving patterns).
// Zero npm dependencies. Needs `python3` and a JDK (`javac`, `java`) on PATH for check 13 (execution).
// Usage: node check.mjs <package-dir> [--no-run] [--write-readme] [--json]
// Exit 0 = all checks pass; 1 = failures (listed); 2 = usage error.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const LESSON_PARTS = ['① Recognition cue', '② Brute force', '③ The template', 'Extra practice', 'Next'];
export const PROBLEM_PARTS = ['Statement', 'Example and input format', 'Approach', 'Dry run', 'Java solution', 'Python solution',
  'Complexity and edge cases', 'Tests', 'Faulty first', 'Recall cards'];
const README_START = '<!-- lessons:start -->';
const README_END = '<!-- lessons:end -->';

function walk(dir, skip, base = dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n); const rel = relative(base, p).split('\\').join('/');
    if (n.startsWith('.') || skip.has(rel) || n === 'node_modules') continue;
    if (statSync(p).isDirectory()) walk(p, skip, base, out); else out.push(rel);
  }
  return out;
}

export function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/); if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/); if (!kv) continue;
    const [, k, v] = kv;
    if (/^\[.*\]$/.test(v)) fm[k] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
    else if (/^\d+$/.test(v)) fm[k] = Number(v); else fm[k] = v.trim();
  }
  return fm;
}

/** Fenced blocks: ```lang kind key=value flag */
export function blocks(text) {
  const out = []; const re = /^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm; let m;
  while ((m = re.exec(text))) {
    const parts = m[1].trim().split(/\s+/).filter(Boolean); const attrs = {}; const flags = new Set();
    for (const p of parts.slice(1)) { const kv = p.match(/^([a-z]+)=(\S+)$/); if (kv) attrs[kv[1]] = kv[2]; else flags.add(p); }
    out.push({ lang: parts[0] || '', kind: parts[1] && !parts[1].includes('=') ? parts[1] : '', flags, attrs, body: m[2].replace(/\n$/, ''), index: m.index });
  }
  return out;
}

/** A ```text tests for=ID``` block: pairs of "in: a | b" / "out: x | y" lines (" | " separates lines; `dots` flag shows spaces as ·). */
export function parseTests(b) {
  const cases = []; let cur = null;
  for (const line of b.body.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const mi = line.match(/^in:(?: (.*))?$/); const mo = line.match(/^out:(?: (.*))?$/);
    if (mi) cur = { input: mi[1] ?? '' };
    else if (mo && cur) { cur.out = mo[1] ?? ''; cases.push(cur); cur = null; }
    else return null;
  }
  return cases;
}
const stdinOf = (s) => (s ? s.split(' | ').join('\n') : '') + '\n';
const asLines = (s, dots) => s.replace(/\n$/, '').split('\n').map((l) => (dots ? l.replace(/ /g, '·') : l)).join(' | ');

const headings = (t, level) => [...t.matchAll(new RegExp(`^${'#'.repeat(level)}\\s+(.+?)\\s*$`, 'gm'))].map((x) => x[1].trim());
const proseWords = (t) => (t.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, ' ').replace(/^\|.*\|$/gm, ' ').match(/\S+/g) || []).length;
const codeLines = (t) => [...t.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].reduce((n, x) => n + x[1].split('\n').filter((l) => l.trim()).length, 0);

export function problemSections(text) {
  const idx = []; const re = /^## Problem (\d+) — .*$/gm; let m;
  while ((m = re.exec(text))) idx.push({ n: Number(m[1]), at: m.index });
  return idx.map((x, i) => { let body = text.slice(x.at, i + 1 < idx.length ? idx[i + 1].at : text.length); const stop = body.slice(3).search(/^## /m); if (stop >= 0) body = body.slice(0, stop + 3); return { n: x.n, body }; });
}

export function lessonTable(manifest) {
  const rows = manifest.lessons.map((l, i) => `| ${i + 1} | [${l.title}](${l.file}) | ${l.technique} | ${l.pdf_problems.join(', ')} | ${l.must.join(', ') || '—'} | ${l.est_minutes} min | [sheet](${l.practice}) · [key](${l.key}) |`);
  return `${README_START}\n| # | Lesson | PDF technique | PDF problems | Must teach | Time | Practice / key |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n${README_END}`;
}

// ───────────── running code ─────────────
const CACHE = process.env.CHECK_CACHE || join(tmpdir(), 'dsa-check-cache');
const ENV = { ...process.env }; delete ENV.JAVA_TOOL_OPTIONS;
const memo = new Map();
export function runCode(lang, code, stdin) {
  const key = `${lang}\0${code}\0${stdin}`; if (memo.has(key)) return memo.get(key);
  let r;
  if (lang === 'python') r = spawnSync('python3', ['-I', '-c', code], { input: stdin, encoding: 'utf8', timeout: 20000 });
  else if (lang === 'java') {
    const cls = (code.match(/public\s+class\s+(\w+)/) || [, 'Main'])[1];
    const dir = join(CACHE, 'j' + createHash('sha1').update(code).digest('hex').slice(0, 16));
    if (!existsSync(join(dir, cls + '.class'))) {
      mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, cls + '.java'), code);
      const c = spawnSync('javac', ['-J-Xmx256m', '-d', dir, join(dir, cls + '.java')], { encoding: 'utf8', env: ENV });
      if (c.status !== 0) { const res = { ok: false, err: `javac: ${(c.stderr || String(c.error || '')).split('\n')[0]}` }; memo.set(key, res); return res; }
    }
    r = spawnSync('java', ['-Xmx96m', '-Xss8m', '-XX:TieredStopAtLevel=1', '-XX:+UseSerialGC', '-cp', dir, cls], { input: stdin, encoding: 'utf8', timeout: 20000, env: ENV });
  } else return { ok: false, err: `cannot run "${lang}"` };
  const res = r.status === 0 ? { ok: true, out: r.stdout } : { ok: false, err: `${lang} exit ${r.status}: ${(r.stderr || String(r.error || '')).trim().split('\n').pop()}` };
  memo.set(key, res); return res;
}

// ───────────── the gate ─────────────
export function check(dir, { run = true, log = () => {} } = {}) {
  const fails = []; const fail = (n, msg) => fails.push({ check: n, msg });
  const stats = { problems: 0, programs: 0, runs: 0, passed: 0 };
  const mpath = join(dir, 'manifest.json');
  if (!existsSync(mpath)) return { fails: [{ check: 2, msg: 'manifest.json missing' }], stats, results: [] };
  let manifest; try { manifest = JSON.parse(readFileSync(mpath, 'utf8')); } catch (e) { return { fails: [{ check: 2, msg: `manifest.json invalid: ${e.message}` }], stats, results: [] }; }
  const read = (f) => readFileSync(join(dir, f), 'utf8');
  const skip = new Set(['pdf', 'skill-template-dsa', ...(manifest.skip_dirs || [])]);
  const files = walk(dir, skip);
  const F = manifest.files || {};
  const listed = new Set(['manifest.json', ...Object.values(F), ...(manifest.extra_files || [])]);
  // 1 required files · 2 manifest ↔ files, README table
  for (const f of Object.values(F)) if (!existsSync(join(dir, f))) fail(1, `missing ${f}`);
  for (const l of manifest.lessons || []) for (const f of [l.file, l.practice, l.key]) { listed.add(f); if (!existsSync(join(dir, f))) fail(1, `${l.id}: missing ${f}`); }
  for (const f of files) if (/\.(md|json)$/.test(f) && !listed.has(f)) fail(2, `file not in manifest: ${f}`);
  if (F.readme && existsSync(join(dir, F.readme)) && !read(F.readme).includes(lessonTable(manifest))) fail(2, 'README lesson table differs from manifest.json (run with --write-readme)');
  // 3 diagnostic
  if (F.diagnostic && existsSync(join(dir, F.diagnostic))) {
    const t = read(F.diagnostic); const n = headings(t, 2).filter((h) => /^Task \d+/.test(h)).length;
    if (n < 6 || n > 8) fail(3, `${F.diagnostic}: needs 6–8 "## Task N" (got ${n})`);
    for (const h of ['How to score', 'Quick version']) if (!headings(t, 2).some((x) => x.startsWith(h))) fail(3, `${F.diagnostic}: missing "## ${h}…"`);
    if (F.diagnostic_key && existsSync(join(dir, F.diagnostic_key))) { const k = headings(read(F.diagnostic_key), 2).filter((h) => /^Task \d+/.test(h)).length; if (k !== n) fail(3, `${F.diagnostic_key}: ${k} keyed tasks for ${n}`); }
  }
  // 4 day plan minutes
  if (F.day_plan && existsSync(join(dir, F.day_plan))) {
    const mins = [...read(F.day_plan).matchAll(/^\|[^|]*\|\s*(\d+)\s*\|/gm)].reduce((a, x) => a + Number(x[1]), 0); const want = manifest.teaching_minutes || 360;
    if (Math.abs(mins - want) > want * 0.1) fail(4, `${F.day_plan}: ${mins} teaching minutes, expected ${want} ±10%`);
  }
  // collect programs and tests from every markdown file; 5 links, 6 tags, 14 currency
  const programs = []; const tests = new Map();
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const t = read(f);
    for (const [, target] of t.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)/g)) if (!existsSync(resolve(dir, dirname(f), target))) fail(5, `${f}: broken link ${target}`);
    const fences = [...t.matchAll(/^```(.*)$/gm)].map((x) => x[1].trim());
    for (let k = 0; k < fences.length; k += 2) if (!fences[k]) fail(6, `${f}: code block without a language tag`);
    for (const line of t.split('\n')) if (/\b(free tier|price|pricing|retired|deprecated|latest version)\b/i.test(line) && !/as of/i.test(line)) fail(14, `${f}: dated claim without "as of": ${line.trim().slice(0, 80)}`);
    for (const b of blocks(t)) {
      if ((b.lang === 'java' || b.lang === 'python') && (b.kind === 'solution' || b.kind === 'faulty')) {
        if (!b.attrs.id) { fail(12, `${f}: ${b.lang} ${b.kind} block without id=`); continue; }
        programs.push({ ...b, file: f, tid: b.kind === 'faulty' ? b.attrs.id : b.attrs.id });
      }
      if (b.lang === 'text' && b.kind === 'tests') {
        const cs = parseTests(b); if (!cs || !cs.length) { fail(12, `${f}: tests block for=${b.attrs.for} does not parse`); continue; }
        const arr = tests.get(b.attrs.for) || []; for (const c of cs) arr.push({ ...c, dots: b.flags.has('dots'), file: f }); tests.set(b.attrs.for, arr);
      }
    }
  }
  // 7 coverage · 8 recall · 9 sections · 10 both languages · 11 load · 12 keys
  const seen = new Map(); const techniques = new Set();
  for (const l of manifest.lessons || []) {
    if (!existsSync(join(dir, l.file))) continue;
    const t = read(l.file); const fm = frontMatter(t) || {}; techniques.add(l.technique);
    if (fm.id !== l.id) fail(2, `${l.file}: front matter id "${fm.id}" ≠ "${l.id}"`);
    const hs2 = headings(t, 2);
    for (const p of LESSON_PARTS) if (!hs2.some((h) => h.startsWith(p))) fail(9, `${l.file}: missing "## ${p}…"`);
    for (const lang of ['java', 'python']) for (const kind of ['brute', 'template']) if (!blocks(t).some((b) => b.lang === lang && b.kind === kind)) fail(10, `${l.file}: no \`\`\`${lang} ${kind} block`);
    const secs = problemSections(t);
    if (JSON.stringify(secs.map((s) => s.n)) !== JSON.stringify(l.pdf_problems)) fail(7, `${l.file}: problem sections ${secs.map((s) => s.n)} ≠ manifest ${l.pdf_problems}`);
    const key = existsSync(join(dir, l.key)) ? read(l.key) : '';
    for (const s of secs) {
      stats.problems++;
      if (seen.has(s.n)) fail(7, `PDF problem ${s.n} appears in ${seen.get(s.n)} and ${l.file}`); seen.set(s.n, l.file);
      const isMust = /\*\*MUST TEACH\*\*/.test(s.body); if (isMust === /IF TIME PERMITS/.test(s.body)) fail(7, `${l.file} problem ${s.n}: mark it once as **MUST TEACH** or *IF TIME PERMITS*`);
      if (isMust !== l.must.includes(s.n)) fail(7, `${l.file} problem ${s.n}: priority differs from manifest`);
      const hs = headings(s.body, 3); let pos = -1;
      for (const part of PROBLEM_PARTS) { const k = hs.findIndex((h) => h.startsWith(part)); if (k < 0) fail(9, `${l.file} problem ${s.n}: missing "### ${part}"`); else if (k < pos) fail(9, `${l.file} problem ${s.n}: "${part}" out of order`); else pos = k; }
      if (!/^> 🧑‍🏫 \*\*Trainer note\*\* — ⏱ \d+ min\./m.test(s.body)) fail(9, `${l.file} problem ${s.n}: missing trainer note`);
      const dry = (s.body.split(/^### Dry run\s*$/m)[1] || '').split(/^### /m)[0]; if (!/^\|.*\|$/m.test(dry)) fail(9, `${l.file} problem ${s.n}: dry run has no table`);
      const bs = blocks(s.body); const sol = bs.filter((b) => b.kind === 'solution');
      for (const lang of ['java', 'python']) if (sol.filter((b) => b.lang === lang).length !== 1) fail(10, `${l.file} problem ${s.n}: needs exactly one ${lang} solution`);
      const id = sol[0]?.attrs.id; if (!id) continue;
      if ((tests.get(id) || []).length < 3) fail(12, `${l.file} problem ${s.n}: needs ≥3 tests (example + edge cases), has ${(tests.get(id) || []).length}`);
      const ff = bs.find((b) => b.kind === 'faulty'); if (!ff) fail(12, `${l.file} problem ${s.n}: no faulty-first block`);
      else if (!blocks(key).some((b) => b.kind === 'tests' && b.attrs.for === ff.attrs.id)) fail(12, `${l.key}: no answer for faulty ${ff.attrs.id}`);
      const rec = (s.body.split(/^### Recall cards\s*$/m)[1] || ''); const q = (rec.match(/^\*\*Q:\*\*/gm) || []).length; const a = (rec.match(/^\*\*A:\*\*/gm) || []).length;
      if (q < 1 || q !== a) fail(8, `${l.file} problem ${s.n}: recall cards need matching **Q:**/**A:** (got ${q}/${a})`);
    }
    // extra practice: every X has tests in the lesson and Java + Python solutions in the key
    const ex = (t.split(/^## Extra practice\s*$/m)[1] || '').split(/^## (?!#)/m)[0];
    const exIds = blocks(ex).filter((b) => b.kind === 'tests').map((b) => b.attrs.for);
    if (exIds.length < 1) fail(12, `${l.file}: extra practice has no problems with tests`);
    for (const id of exIds) for (const lang of ['java', 'python']) if (!blocks(key).some((b) => b.lang === lang && b.kind === 'solution' && b.attrs.id === id)) fail(12, `${l.key}: no ${lang} solution for extra ${id}`);
    const load = proseWords(t) / 100 + codeLines(t) / 8;
    if (!fm.est_minutes || load > fm.est_minutes * 3) fail(11, `${l.file}: reading load ${load.toFixed(0)} min > 3 × est_minutes ${fm.est_minutes}`);
    if ((fm.objectives || 0) > 4) fail(11, `${l.file}: ${fm.objectives} objectives (max 4)`);
    if ((fm.new_terms || 0) > 8) fail(11, `${l.file}: ${fm.new_terms} new terms (max 8)`);
    if (existsSync(join(dir, l.practice))) for (const b of blocks(read(l.practice))) if (b.kind === 'solution') fail(12, `${l.practice}: contains a solution`);
  }
  for (const n of manifest.pdf_problems || []) if (!seen.has(n)) fail(7, `PDF problem ${n} is not taught in any lesson`);
  for (const tq of manifest.pdf_techniques || []) if (!techniques.has(tq)) fail(7, `PDF technique "${tq}" has no lesson`);
  for (const [id, cs] of tests) if (!programs.some((p) => p.attrs.id === id)) fail(12, `tests for=${id} (${cs[0].file}) have no program`);
  for (const p of programs) if (!tests.has(p.attrs.id)) fail(12, `${p.file}: ${p.lang} ${p.kind} ${p.attrs.id} has no tests`);

  // 13 execution: every program against every test with its id; faulty programs must differ from the solution
  const results = [];
  if (run) {
    const ids = [...new Set(programs.map((p) => p.attrs.id))];
    for (const id of ids) {
      const progs = programs.filter((p) => p.attrs.id === id); const cs = tests.get(id) || [];
      log(`  ${id} …`);
      const uniq = new Map(); for (const p of progs) uniq.set(p.lang + '\0' + p.body, p);
      for (const p of uniq.values()) {
        stats.programs++; let pass = 0;
        for (const c of cs) {
          const r = runCode(p.lang, p.body, stdinOf(c.input)); stats.runs++;
          if (!r.ok) { fail(13, `${p.file}: ${p.lang} ${id} on "${c.input}": ${r.err}`); continue; }
          const got = asLines(r.out, c.dots);
          if (got !== c.out) fail(13, `${p.file}: ${p.lang} ${p.kind} ${id} on input "${c.input}" printed "${got.slice(0, 80)}", expected "${c.out.slice(0, 80)}" (${c.file})`); else pass++;
        }
        stats.passed += pass;
        results.push({ id, lang: p.lang, kind: p.kind, passed: pass, total: cs.length });
        if (p.kind === 'faulty') {
          const base = programs.find((x) => x.kind === 'solution' && x.attrs.id === id.replace(/-ff$/, ''));
          if (base) for (const c of cs) { const r = runCode(base.lang, base.body, stdinOf(c.input)); if (r.ok && asLines(r.out, c.dots) === c.out) fail(13, `${p.file}: faulty ${id} prints the correct answer on "${c.input}"`); }
        }
      }
    }
  }
  return { fails, stats, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const dir = a.find((x) => !x.startsWith('--'));
  if (!dir) { console.error('usage: node check.mjs <package-dir> [--no-run] [--write-readme] [--json]'); process.exit(2); }
  if (a.includes('--write-readme')) {
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); const rp = join(dir, m.files.readme);
    const t = readFileSync(rp, 'utf8'); const i = t.indexOf(README_START), j = t.indexOf(README_END);
    if (i < 0 || j < 0) { console.error('README has no lesson-table markers'); process.exit(2); }
    writeFileSync(rp, t.slice(0, i) + lessonTable(m) + t.slice(j + README_END.length));
  }
  const t0 = Date.now();
  const { fails, stats, results } = check(dir, { run: !a.includes('--no-run'), log: a.includes('--json') ? () => {} : (s) => process.stderr.write(s.padEnd(30) + '\r') });
  if (a.includes('--json')) console.log(JSON.stringify({ fails, stats, results }, null, 2));
  else {
    for (const f of fails) console.log(`FAIL check ${f.check}: ${f.msg}`);
    const bad = results.filter((r) => r.passed !== r.total);
    console.log(`${stats.problems} PDF problems in lessons · ${stats.programs} programs (Java + Python) · ${stats.runs} test runs · ${stats.passed} passed · ${bad.length} programs with a failing test · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    console.log(fails.length ? `${fails.length} failure(s)` : 'all checks pass');
  }
  process.exit(fails.length ? 1 : 0);
}
