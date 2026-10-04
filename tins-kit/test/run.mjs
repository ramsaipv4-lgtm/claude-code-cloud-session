// Self-test entry: `node <kit>/test/run.mjs` from any directory. No network.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
for (const f of readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort()) {
  if (!only || f.includes(only)) await import(pathToFileURL(join(here, f)).href);
}
