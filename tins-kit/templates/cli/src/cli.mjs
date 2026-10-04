#!/usr/bin/env node
// Pure core + thin shell: run() takes argv and returns { code, out, err }; only main touches process.
export function run(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { code: 0, out: 'usage: {{NAME}} [--help]\n', err: '' };
  const unknown = argv.find((a) => a.startsWith('-'));
  if (unknown) return { code: 2, out: '', err: `unknown option ${unknown}\n` };
  return { code: 0, out: '', err: '' };
}

if (process.argv[1]?.endsWith('cli.mjs')) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.out); process.stderr.write(r.err); process.exitCode = r.code;
}
