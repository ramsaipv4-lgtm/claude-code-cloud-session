// Runs every proven pattern's own test (this is what makes `status: proven` true) and checks retrieval
// on the three cases the brief says the old method missed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { loadPatterns, retrieveBM25, retrieveOld } from '../src/patterns.mjs';

const pats = loadPatterns();
for (const p of pats.filter((x) => x.test)) await import(pathToFileURL(join(p.dir, p.test)).href);

test('every proven pattern has module + test on disk; candidates have review_by', () => {
  for (const p of pats) {
    if (p.status === 'proven') { assert.ok(p.module && existsSync(join(p.dir, p.module)), p.id); assert.ok(p.test && existsSync(join(p.dir, p.test)), p.id); }
    else { assert.equal(p.status, 'candidate', p.id); assert.match(p.review_by || '', /^\d{4}-\d{2}-\d{2}$/, p.id); }
    for (const k of ['id', 'solves', 'triggers', 'not_when', 'license', 'source', 'consumers']) assert.ok(p[k], `${p.id}: ${k}`);
  }
});

test('retrieval: brief example found; recorded experiment results are reproduced exactly (regression lock)', async () => {
  assert.ok(retrieveBM25('store money as integer paise', pats).some((h) => h.id === 'money-minor-units'));
  const { readFileSync } = await import('node:fs');
  const here = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'experiments', 'retrieval');
  const { fragments } = JSON.parse(readFileSync(join(here, 'fragments.json'), 'utf8'));
  const rec = JSON.parse(readFileSync(join(here, 'results.json'), 'utf8')).methods;
  const rows = (m) => Object.fromEntries(rec[m].all.rows.map((r) => [r.id, r.got]));
  const [bm, old] = [rows('bm25'), rows('old_triggers')];
  for (const f of fragments) {
    assert.deepEqual(retrieveBM25(f.text, pats).map((h) => h.id), bm[f.id], `bm25 ${f.id}`);
    assert.deepEqual(retrieveOld(f.text, pats).map((h) => h.id), old[f.id], `old ${f.id}`);
  }
});
