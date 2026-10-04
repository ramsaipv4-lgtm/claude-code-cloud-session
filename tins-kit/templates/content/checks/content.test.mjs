// Mechanical checks for a written work. Add one test per AC row; keep judgement calls as "manual" ACs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const MAX_WORDS = 5000; // D-3
const dir = new URL('../content/', import.meta.url);
const parts = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]);

test('AC-1 every part has a title and a body', () => {
  assert.ok(parts.length > 0, 'no content/*.md files');
  for (const [f, t] of parts) { assert.match(t, /^# \S/, `${f} must start with "# "`); assert.ok(t.split('\n').slice(1).join('').trim(), `${f} has no body`); }
});
test('AC-2 total words within D-3 limit', () => {
  const words = parts.reduce((n, [, t]) => n + (t.match(/\S+/g) || []).length, 0);
  assert.ok(words <= MAX_WORDS, `${words} words > ${MAX_WORDS}`);
});
