// Test helpers: throwaway git repos in the OS temp dir. No network, no global git config needed.
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KIT_BIN = join(KIT, 'bin', 'kit.mjs');
const GIT_ENV = { GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 't@example.invalid', GIT_CONFIG_NOSYSTEM: '1' };
Object.assign(process.env, GIT_ENV);

export function sh(cmd, args, cwd, extra = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...GIT_ENV, ...extra } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '' };
}
export const git = (cwd, ...a) => { const r = sh('git', a, cwd); if (r.code) throw new Error(`git ${a.join(' ')}: ${r.out}`); return r.stdout.trim(); };
export const kit = (cwd, ...a) => sh(process.execPath, [KIT_BIN, ...a], cwd);

export function tmp(prefix = 'tins-') { return mkdtempSync(join(tmpdir(), prefix)); }

export function write(root, rel, text) { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); }
export const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
export const exists = (root, rel) => existsSync(join(root, rel));

/** Minimal TINS project: SPEC with one AC traced to a test, gate = node --test on that file. */
export function miniProject() {
  const d = tmp();
  git(d, 'init', '-q', '-b', 'main');
  write(d, 'SPEC.md', '# Spec\n\n| ID | Decision | Status |\n|---|---|---|\n| D-1 | Greeting is "hi" | locked |\n\n| ID | Criterion | Check |\n|---|---|---|\n| AC-1 | greet() returns "hi" | test/greet.test.mjs |\n');
  write(d, 'tins.json', JSON.stringify({ type: 'library', gate: ['node --test'] }, null, 2));
  write(d, 'src/greet.mjs', 'export const greet = () => "hi";\n');
  write(d, 'test/greet.test.mjs', 'import { test } from "node:test"; import assert from "node:assert"; import { greet } from "../src/greet.mjs";\ntest("AC-1", () => assert.equal(greet(), "hi"));\n');
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'init');
  return d;
}
export const rm = (d) => rmSync(d, { recursive: true, force: true });

/** Fake secrets are assembled at runtime so no source file in this repo contains one. */
export const FAKE = {
  aws: () => 'AKIA' + 'Z7QX4M2N8P6R3T5V',
  github: () => 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8',
  anthropic: () => 'sk-ant-' + 'api03-' + 'Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2Ji1Hg0Fe',
};
