# {{NAME}} — SPEC

What this is: a web application. Replace this line with one paragraph on its purpose.

## Decisions

| ID | Decision | Status |
|---|---|---|
| D-1 | Node.js built-in http server, no framework, no runtime dependencies (amend this row to add one) | locked |
| D-2 | No database yet; storage is decided by a later D-row (see `kit patterns` for tenant isolation, migrations) | open |

## Acceptance

| ID | Criterion | Check |
|---|---|---|
| AC-1 | GET /health returns 200 and JSON {"ok":true} | test/server.test.mjs |
| AC-2 | GET / returns the HTML home page | test/server.test.mjs |
