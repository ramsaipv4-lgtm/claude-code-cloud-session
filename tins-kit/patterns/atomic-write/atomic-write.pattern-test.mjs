import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileAtomic } from './atomic-write.mjs';

const MOD = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'atomic-write.mjs')).href;

test('atomic-write: replaces content, leaves no temp files', () => {
  const d = mkdtempSync(join(tmpdir(), 'aw-'));
  try {
    const p = join(d, 'state.json');
    writeFileAtomic(p, '{"v":1}'); writeFileAtomic(p, '{"v":2}');
    assert.equal(readFileSync(p, 'utf8'), '{"v":2}');
    assert.deepEqual(readdirSync(d), ['state.json']);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('atomic-write: process killed mid-write never leaves a torn file (crash test)', { skip: process.platform === 'win32' && 'SIGKILL semantics differ on Windows' }, async () => {
  const d = mkdtempSync(join(tmpdir(), 'aw-'));
  const p = join(d, 'state.json');
  writeFileSync(p, JSON.stringify({ n: -1, pad: 'x'.repeat(200000) }));
  try {
    for (let round = 0; round < 8; round++) {
      const child = spawn(process.execPath, ['--input-type=module', '-e',
        `import { writeFileAtomic } from ${JSON.stringify(MOD)}; for (let n = 0; ; n++) writeFileAtomic(${JSON.stringify(p)}, JSON.stringify({ n, pad: 'x'.repeat(200000 + (n % 997)) }));`]);
      await new Promise((r) => setTimeout(r, 40 + round * 15));
      child.kill('SIGKILL');
      await new Promise((r) => child.on('exit', r));
      const v = JSON.parse(readFileSync(p, 'utf8')); // throws if torn
      assert.ok(Number.isInteger(v.n));
    }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('atomic-write: the naive approach DOES tear (proves the crash test can fail)', { skip: process.platform === 'win32' }, async () => {
  const d = mkdtempSync(join(tmpdir(), 'aw-'));
  const p = join(d, 'state.json');
  let torn = 0;
  try {
    for (let round = 0; round < 8 && !torn; round++) {
      const child = spawn(process.execPath, ['-e',
        `const fs=require('fs'); for (let n=0;;n++) fs.writeFileSync(${JSON.stringify(p)}, JSON.stringify({ n, pad: 'x'.repeat(2000000) }));`]);
      await new Promise((r) => setTimeout(r, 60 + round * 20));
      child.kill('SIGKILL'); await new Promise((r) => child.on('exit', r));
      try { JSON.parse(readFileSync(p, 'utf8')); } catch { torn++; }
    }
    assert.ok(torn > 0, 'expected at least one torn file from plain writeFileSync');
  } finally { rmSync(d, { recursive: true, force: true }); }
});
