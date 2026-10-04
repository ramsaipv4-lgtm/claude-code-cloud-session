# COMPAT — every Part-1 component mapped to this design

Verdicts: **kept as-is** · **kept with change** · **replaced by X** · **dropped**. "Preserved" lists
names, flags and formats that merge mechanically. Everything else needs a decision. I had no access
to the incumbent's code, so incumbent formats are as described in the brief (ASSUMED).

## Artefacts in a project

| Part 1 item | Verdict | Reason | Preserved (mechanical merge) |
|---|---|---|---|
| `SPEC.md` | kept with change | One numbering system: `D-n` rows (`ID \| Decision \| Status`) and `AC-n` rows (`ID \| Criterion \| Check`). Lint checks unique ids, status in `locked\|open\|superseded by D-n`, AC check file exists and mentions the id, and dependencies named in locked D-rows (RD-8) | file name; "decisions are numbered, locked" |
| `AGENTS.md` | kept with change | It *is* the entry file now (`ENTRY.md`, 6 rules, 327 tokens), RD-1 | file name |
| `HANDOVER.md` | dropped | Replaced by session records plus `kit close --handover` (a record that says why the work is not mergeable). A hand-written handover was the source of a false "gap" claim (2.2.9) | — |
| decision logs (ADR, builder log, client Q&A) | dropped | Four numbering systems became one (RD-8). Narrative goes in commit messages and the record note | — |
| validator `validate.mjs` | replaced by `kit gate` | Spec lint plus `tins.json` `gate` commands. No skip flag; strips `NODE_TEST_*` (RD-18) | "no warn-and-continue" (any problem fails) |
| prompts `prompts/*.md` (spec author, builder, reviewer, maintainer, worker session, kitting) | dropped / replaced by `ENTRY.md` + `RELAY.md` | No evidence role prompts changed outcomes; each costs tokens on the entry path. Re-add only with a bench result (DEFERRED.md D-4) | — |
| scripts (`package.json` scripts) | kept with change | Only `test`, `gate` (and `start` for web). Each script's target file must exist (test) | `npm run gate` |
| library modules `lib/<module>/` | replaced by `patterns/<id>/<module>.mjs` + `<module>.pattern-test.mjs` | Code and its test live next to the prose, so the indexer cannot miss the module (2.2.2.1) | copied into projects under `lib/` |
| pattern front matter | kept with change | Kept: `id`, `solves`, `triggers`, `not_when`, `status`. Dropped: `verified` (computed, RD-10). Added: `consumers`, `license`, `source`, `review_by`, `module`, `test`. `status` is `proven\|candidate` | the 5 kept fields |
| `kit-coverage` | replaced by `kit patterns --spec SPEC.md` | BM25 per spec row, plus `kit patterns` (no argument) prints the full index (RD-9) | output: rows with and without a pattern |

## Session ledger (`session.mjs` → `src/session.mjs`, CLI `kit`)

| Part 1 item | Verdict | Reason | Preserved |
|---|---|---|---|
| `sessions/<timestamp>-<id>.md` | kept with change | Front matter derived from git: field list in RD-2. Timestamp is compact UTC (`20261004T101500`); id is 8 hex | path pattern, one file per session |
| `Session: <id>` trailer | kept as-is | Healed automatically at close (RD-3) | trailer key and format |
| `start` | kept with change | Idempotent (resumes), optional (close infers base), state untracked in the per-worktree git dir | command name; `--model`, `--model-source` flags |
| `ack` | dropped | Ordering traps; a script can pass it (RF-14, RD-4) | — |
| `close` | kept with change | Commits leftovers, heals trailers, scans what the session added, checks scope, runs gate, commits the record. `--handover` records unmergeable work | command name |
| `check` (merge-time) | kept with change | `kit check --base <ref>`: re-derives scope, secrets and gate; trusts no record (RD-7). Accepts `Tins-Merge:` and `Tins-Task:` commits | command name |
| `claim` | dropped | Duplicates caught by lint and by a git conflict on the spec table; migrations use timestamps (RD-8) | — |
| `reap` | replaced by `kit abort` + `kit doctor` | doctor warns about sessions open more than 24 h | — |
| `doctor` | kept with change | Node/git versions, worktree pointer, vendored kit integrity, pattern pins, open session | command name |
| `index` | dropped | Records are plain files. Use `ls sessions/` or `git log --grep 'tins: close'` (DEFERRED.md D-6) | — |
| `--model-source harness\|launcher\|self-reported\|human` | kept with change | Values the kit writes: `launcher` (`kit run --model`), `self-reported`, `human` (relay). Plus `model_verified: false`. `harness` dropped from the kit; the bench records harness-reported `served_model` (RD-17) | flag name, 3 of 4 values |

## Protocol, delegation, safety

| Part 1 item | Verdict | Reason | Preserved |
|---|---|---|---|
| `CORE.md` (8 sections) | replaced by `ENTRY.md` (6 rules) | Trust levels collapse to two (instructions = human task + this file; everything else = data). First and last actions are automatic under `kit run` | trust model intent |
| `orchestrate.mjs` | replaced by `kit task new/list` + `kit merge` | Task = branch + worktree + scope; reconciler gates the merged tree (RD-12) | — |
| `PACKET.md` | kept with change | Produced by `kit packet <task> [--out PACKET.md]`: `RELAY.md` + task + fenced DATA (nonce delimiters) + previous-attempt feedback | name, role |
| `RESULT.json` | kept with change | Accepted by `kit apply` as `{ "files": [{ "path", "content" }], "notes" }`; also a `=== FILE: p ===` block format | name, JSON shape (if the incumbent's matches; ASSUMED) |
| auditor | replaced by `kit check` + gate | — | — |
| tiered escalation | dropped (deferred) | No evidence; DEFERRED.md D-3 | — |
| chat-only relay mode | kept with change | `kit packet` / `kit apply`; tested with a tool-less Haiku | — |
| `scan-secrets` | kept with change | `kit scan <files>`; also runs on session additions at close/check (RD-5) | "refuses; prints class and line, never the value" |
| task-independence checks | replaced by scope-overlap refusal in `kit task new` | `--overlap-ok` to accept the risk | — |
| docs guardian | dropped | No failure evidence in the brief; DEFERRED.md D-7 | — |
| migration runner | dropped from core | Web-specific; candidate pattern `timestamped-migrations` | — |

## Kit hygiene

| Part 1 item | Verdict | Reason | Preserved |
|---|---|---|---|
| `kit-version` / `KIT-VERSION` | kept with change | Line 1 is a 12-hex stamp; then `sha256  path` per stamped file. A vendored copy carries the subset; `doctor` verifies it (RD-14) | file name, content-hash idea |
| `kit-listing` | replaced by `kit patterns` | — | — |
| `kit-new-pattern` | dropped | A pattern is a folder. `lint-kit` validates it | — |
| `kit-ingest`, `kit-proposal-check` | replaced by candidate/proven rules + expiry + hash pins (RD-19) | — | — |
| self-test | kept with change | `node test/run.mjs`: 9 files, 55 tests, about 14 s on 4 cores, any cwd, no network | — |
| `--kit` validation mode | replaced by `kit lint-kit` | Drift, budgets, pattern rules, secret-free tree, doc-ID format | — |

## Standing rules

| Rule | Verdict | How it is held now |
|---|---|---|
| never edit generated code to fix a defect | kept, **now mechanical with a recorded escape** | `close` refuses a session that changed `behaviour_paths` without touching a D-n/AC-n row, unless `--why` is given (recorded as `spec_waiver`), RD-20 |
| never add a dependency without amending the spec | kept, **now mechanical** | Gate fails if a `package.json` dependency is not named in a locked D-row |
| never add a schema change without a migration | dropped from core | Web-specific. Belongs in a web project's own gate commands |
| never store money as float | kept, via pattern | `money-minor-units` module refuses float quantities. Not lint-enforced (DEFERRED.md D-8) |
| audit log is append-only | kept, via pattern | `append-only-ledger`; session records themselves are append-only (check refuses close commits touching other files) |
| hardcoded credentials are a build break | kept, **mechanical** | Secret scan at close and check |
| record every decision (spec row → narrative → build record) | kept with change | Spec row (human/agent) → commit message (narrative) → session record (derived) |
| a superseded document is moved, not left to rot | replaced | `superseded by D-n` status on the row, lint-checked |

## New names a merger will meet

`tins.json` (`type`, `gate[]`, `behaviour_paths[]`, `kit`, optional `gate_timeout_s`) · `.tins/kit/` (vendored kit) ·
`.tins/patterns.lock` · `tasks/<id>.md` (front matter `id paths read base status`) · trailers
`Tins-Task:` and `Tins-Merge:` · branch `task/<id>` · worktree `<repo>.worktrees/<id>` ·
untracked state `.git/tins-session.json` and `.git/tins-relay-feedback.txt` · exit codes:
0 ok, 1 refused/failed, 2 usage, 3 merge conflict.
