# {{NAME}} — SPEC

What this is: a command-line tool. Replace this line with one paragraph on its purpose.

## Decisions

| ID | Decision | Status |
|---|---|---|
| D-1 | Node.js ESM, no runtime dependencies | locked |
| D-2 | Exit codes: 0 success, 1 domain failure, 2 usage error | locked |

## Acceptance

| ID | Criterion | Check |
|---|---|---|
| AC-1 | `--help` prints usage and exits 0 | test/cli.test.mjs |
| AC-2 | An unknown flag prints an error and exits 2 | test/cli.test.mjs |
