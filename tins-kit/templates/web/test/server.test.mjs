import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.mjs';

async function withServer(fn) {
  const s = createServer(); await new Promise((r) => s.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${s.address().port}`); } finally { s.close(); }
}
test('AC-1 GET /health', () => withServer(async (u) => {
  const r = await fetch(`${u}/health`); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true });
}));
test('AC-2 GET / returns HTML', () => withServer(async (u) => {
  const r = await fetch(`${u}/`); assert.equal(r.status, 200); assert.match(await r.text(), /<h1>/);
}));
