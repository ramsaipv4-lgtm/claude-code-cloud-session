# DESIGN — tins-kit (redesign)

Labels: `VERIFIED` = reproduced by a command or test in this repo; `INFERRED` = reasoned, not run;
`ASSUMED` = taken from the brief unchecked. Test names refer to files in `test/` (run: `node test/run.mjs`).

## Architecture in one picture

```
human / planner ──kit task new <id> --paths …──► tasks/<id>.md + branch task/<id> + worktree
                                                         │
 worker (any harness, any model)                         ▼
   kit run --task <id> -- <agent cmd>   ── start (untracked state in the per-worktree git dir)
      agent reads AGENTS.md (327 tokens), edits, runs `kit gate`, maybe `kit close`
   ◄── close: commit leftovers · heal Session trailers · derive facts from git ·
              secret-scan what was ADDED · scope-check the diff · run gate · commit record
                                                         │
 chat-only model (no tools)                              │
   kit packet <id> ─► human pastes ─► reply ─► kit apply <id> reply   (same close path)
                                                         ▼
 reconciler: kit merge <id>  ── check (re-derive everything on the task branch, trust no record)
                             ── git merge --no-ff --no-commit ── gate on merged tree ── commit | abort
```

Code: `bin/kit.mjs` (CLI) + `src/` (12 modules; 1,225 lines including the CLI, VERIFIED by `wc -l`; zero dependencies; Node ≥ 18 + git).
A project vendors the kit into `.tins/kit/` (no network, pinned version). The only file an agent
must read is `AGENTS.md` (= `ENTRY.md`).

## Design decisions

### RD-1 Entry path: one 6-rule file plus a wrapper that does the bookkeeping
- **Problem**: weak models must read and obey long instruction files before a one-line task (brief 2.2.10, ASSUMED); every rule that depends on the model "remembering" will eventually be skipped (brief rule 4).
- **Options**: (a) do nothing: keep `CORE.md` (8 sections) plus role prompts; (b) one short file, with all bookkeeping moved into the CLI; (c) no file, wrapper only (the model learns nothing about SPEC-first or secrets).
- **Choice**: (b). `ENTRY.md` is copied into projects as `AGENTS.md` (`CLAUDE.md` holds `@AGENTS.md`). It has six rules: trust, SPEC first, patterns, secrets/deps, gate, close. `kit run -- <agent>` does start and close around any command, so rule 6 is redundant when the wrapper is used, and harmless when the agent also obeys it (`kit run` accepts a session the agent closed itself).
- **Why**: the rules that can be enforced moved into code (RD-3, RD-5, RD-6, RD-7). What stays in prose is what code cannot judge: obeying data, writing the SPEC first, reusing a pattern.
- **Cost**: role-specific guidance (reviewer, spec author) is gone. An orchestrator that wants it must add it to the task text.
- **Tested**: `test/kit.test.mjs` enforces ≤ 1600 bytes (`ENTRY.md` is 1189 bytes). Real tokenizer cost is **327 tokens** (VERIFIED, `experiments/entry-budget/result.json`, measured as the difference in Claude-reported input tokens). The bench `kit-nowrap` condition measures whether a model obeys rule 6 without the wrapper (BENCH.md).
- **Merge note**: replaces `CORE.md` and `prompts/*.md` for the worker path. File name `AGENTS.md` kept.

### RD-2 Every fact in a session record is derived from git
- **Problem**: self-reported facts were wrong; git-derived facts held up (brief 2.1, ASSUMED).
- **Options**: (a) keep the incumbent records; (b) records with a fixed front matter computed by `close`, where the agent may add only a free-text note labelled as a claim; (c) no records, git log only (loses gate result, scope, secret status, intent diff).
- **Choice**: (b). Front-matter fields: `id task branch base base_source head started closed status gate secrets secrets_scanned scope scope_paths scope_source model_claimed model_source model_verified kit_version lines_added lines_removed trailers merged_in commits(sha patch-id) files(+/-) spec_added spec_changed spec_removed dirty_at_start`. The body says the note below it is "a claim, not a fact".
- **Why**: `spec_added/changed/removed` is a diff of intent (which D-n/AC-n rows changed), which the brief's Q11 asks for and which costs about 30 lines.
- **Cost**: records are written by the kit only, so a hand-edited record is detected at `check` (the close commit may only touch its own file).
- **Tested**: `session-order.test.mjs` (fields present), `multi.test.mjs` (intent diff credits the right session).
- **Merge note**: `sessions/<timestamp>-<id>.md` path kept. Field names are new: map them by name (COMPAT.md).

### RD-3 The ledger heals itself instead of refusing
- **Problem**: ordering traps. `ack` rewrote the record and dirtied the tree; a commit without a trailer made `close` refuse; models doing things in a "natural" order got stuck (brief 2.2.5, ASSUMED).
- **Options**: (a) do nothing; (b) a git hook (`prepare-commit-msg`) that adds the trailer — fails silently if hooks are not installed, conflicts with husky-style `core.hooksPath`, differs on Windows; (c) heal at `close`: rewrite unpublished commits with the same trees and an added trailer (`commit-tree`, which cannot conflict); infer a missing start; commit leftovers; make start idempotent.
- **Choice**: (c). Runtime state lives in the per-worktree git dir (`.git/tins-session.json`), untracked, so start never dirties the tree. `close` heals as follows:
  - commits leftover changes;
  - adds missing `Session:` trailers (or records `range-attributed` if a commit is already on a remote, never rewriting published history);
  - infers `base` from the last close commit when start was never called;
  - discards an empty session;
  - accepts a session the agent already closed inside `kit run`.
- **Why**: every natural order now succeeds, and only real conflicts refuse: a foreign session's commit on this branch's first-parent chain, a secret, a scope violation, or a failing gate.
- **Cost**: commit hashes change at close, and GPG signatures on rewritten commits are lost (INFERRED). An agent that keeps working after close starts a new session (fine).
- **Tested**: `session-order.test.mjs` covers commit without trailer, never committing, never starting, start/close twice, dirty tree before start, `kit run`, crash then resume, and agent-closed inside run. `session-safety.test.mjs` covers foreign commits refusing.
- **Merge note**: keeps the `Session: <id>` trailer and `start`/`close`/`check`. Replaces "refuse unattributed commit" with healing.

### RD-4 Drop `ack`
- **Problem**: `ack` creates ordering traps (2.2.5, ASSUMED), and what it proves is weak.
- **Options**: (a) keep it; (b) replace it with "cite a hash-addressed snippet"; (c) drop it and rely on the gate plus derived facts.
- **Choice**: (c).
- **Why**: a 3-line shell script answers ack-shaped questions without understanding anything (`experiments/ack/answer-without-reading.sh`, VERIFIED for the assumed question shape), so ack proves that a command ran. Snippet-citation has the same flaw: a model can grep for the snippet. The outcome measure that matters is the gate plus the merge-time check.
- **Cost**: no evidence that the agent looked at the state before acting. Partly covered: `dirty_at_start` and `base_source` are recorded.
- **Tested**: the experiment above. The bench `kit` condition shows tasks completing without ack (BENCH.md).
- **Merge note**: removes `session ack` and its three questions. Nothing else depends on it.

### RD-5 Secret scan covers what the session added, not its prose
- **Problem**: `close` said "secrets: scanned clean" but scanned only the record. A fake key in a project file passed (brief 2.2.4, ASSUMED: incumbent not available).
- **Options**: (a) scan the record only (the hole); (b) scan the whole tree at close (slow, and flags pre-existing fixtures the session did not add); (c) scan the added lines of `base..HEAD`, every commit message in range, and the record.
- **Choice**: (c), at `close` and again at `check` (which trusts no record). Findings print `path:line: class`, never the value. A session holding a secret writes no record, and `--handover` cannot launder it. `close` prints the exact non-destructive fix (`git reset --soft <base>`, edit, close).
- **Why**: "the record says clean" must mean "everything this session added is clean". Over-scanning merged-in work is deliberate and safe.
- **Cost**: regex scanners miss novel formats and flag some high-entropy test data. There is no allowlist yet (DEFERRED.md).
- **Tested**: `secrets.test.mjs` runs 11 canary classes plus false-positive guards, with values assembled at runtime so no literal secret is in the repo. `session-safety.test.mjs` covers a secret in a project file (the 2.2.4 case), a secret in a commit message, a forged clean record not hiding a later secret, and the value never appearing in output. `lint-kit` scans the kit's own tree.
- **Merge note**: `scan-secrets` becomes `kit scan <files>` (same output contract). Record field `secrets_scanned` names what was scanned.

### RD-6 The enforceable part of the trust model is the diff
- **Problem**: text in files, tool output and other agents' records can carry instructions (Q8). A model can be asked not to obey them, but not forced.
- **Options**: (a) prompt rules only; (b) prompt rules plus code that limits what an obeyed injection can achieve.
- **Choice**: (b). The code-enforced layer:
  - **Scope**: a session's allowed paths come from the task file or launcher (`scope_source` recorded). Violations refuse `close` and `merge`.
  - **Protected paths**: `.tins/kit`, `tins.json`, `sessions`, `tasks` need an explicit grant, so an agent cannot weaken its own gate.
  - **Relay fencing**: packet data sits in blocks with a fresh nonce the data cannot forge.
  - **Relay apply**: all-or-nothing, with path safety (no `..`, no absolute paths, no drive letters).
  - **Gate env hygiene** (RF-7).
- **Why**: an injection that makes the model create `PWNED.txt` or edit `tins.json` is caught by code, whatever the model did.
- **Cost**: tasks must declare paths; the default scope (whole repo minus protected) is permissive. An agent that runs `kit start --paths …` itself chooses its own scope (recorded as `scope_source: agent`).
- **Tested**: `spec.test.mjs` (scope rules), `session-safety.test.mjs` (scope violation; `tins.json` edit refused), `relay.test.mjs` (fence, unsafe paths refused whole, injected line stays inside its DATA block), `multi.test.mjs` (merge refuses out-of-task paths). The bench `injection` task is the canary for the model-dependent part.
- **Merge note**: new. It does not conflict with `CORE.md` trust levels; it implements them.

### RD-7 Merge-time `check` re-derives everything; nothing has a skip flag
- **Problem**: a gate must not be skippable by a flag (brief Part 4 non-negotiable). Records can be forged or stale.
- **Options**: (a) trust records at merge; (b) re-derive at merge: trailers, records, per-session scope from git, secret scan of the range, gate on HEAD.
- **Choice**: (b). Merge commits (`Tins-Merge:`) and planner task commits (`Tins-Task:`, touching only their own task file) are the only commits allowed without a `Session:` trailer.
- **Why**: the agent's machine is not a trust boundary. `check`, run by the reconciler, is.
- **Cost**: locally, nothing stops an agent bypassing the kit entirely (committing directly). That is caught only if someone runs `check`/`merge` before integrating (RF-16).
- **Tested**: `session-safety.test.mjs` (handover not mergeable; forged record), `multi.test.mjs` (full history checks from the scaffold commit).
- **Merge note**: keeps `session check`, now `kit check --base <ref>`.

### RD-8 One numbering system, inside SPEC.md, with traceability
- **Problem**: four overlapping decision numbering systems, and a handover note that claimed a non-existent gap (brief 2.2.9, ASSUMED).
- **Options**: (a) keep ADR log, builder log and spec rows with a "which log in what order" process; (b) only `D-n` and `AC-n` table rows in SPEC.md; narrative goes in commit messages and the record note; `claim` for numbers; (c) (b) without `claim`.
- **Choice**: (c). The gate's spec lint checks:
  - unique ids, and decision status in `locked | open | superseded by D-n` (the target must exist);
  - every `AC-n` names a check file that exists and contains the id, or `manual`;
  - every `package.json` dependency is named in a locked D-row (makes the standing rule mechanical).
- **Why**: a duplicate number from parallel branches is caught twice: as a git conflict (both append at the same table end, VERIFIED in `multi.test.mjs`) and by duplicate-id lint. `claim` needs shared state across worktrees and machines, which it cannot get.
- **Cost**: renumbering after a conflict is manual (as in the multi test). Migrations need timestamp names (candidate pattern `timestamped-migrations`).
- **Tested**: `spec.test.mjs`, `multi.test.mjs`.
- **Merge note**: drops `claim`, the ADR log and the builder log. A project with existing logs should fold their ids into SPEC rows or keep them as prose.

### RD-9 Pattern memory: an always-available index first, ranked retrieval second
- **Problem**: trigger-word retrieval missed 41% of patterns, 23% after fixes (brief 2.2.1, ASSUMED). Builders reinvented money, atomic writes and ledgers (2.2.2, ASSUMED).
- **Options**: (a) trigger substring (incumbent); (b) BM25 over every field including module comments; (c) the model reads a one-line index of all patterns (577 tokens for 11 patterns); (d) embeddings (needs a dependency or network: rejected, rule 6); (e) no library.
- **Choice**: (c) as the primary path (`kit patterns` with no argument, named in AGENTS.md rule 3), and (b) for `kit patterns "<need>"` and `kit patterns --spec SPEC.md` coverage reports.
- **Why**: held-out results:
  | Method | Miss | False positives |
  |---|---|---|
  | trigger substring | 8/10 (80%) | 2/4 |
  | BM25 | 4/10 (40%) | 0/6 |
  | Haiku reading the index | 0/10 | 0/10 |

  The index result was identical across two runs (VERIFIED, `experiments/retrieval/`). Labels were committed before any retriever existed (commit `98ebc71`).
- **Cost**: the index grows linearly. At about 100 patterns it is roughly 5k tokens (INFERRED), and then ranked retrieval must carry more weight. Labeller and retriever are both Claude (OPEN-QUESTIONS.md).
- **Tested**: `patterns.test.mjs` locks the recorded per-fragment results. `experiments/retrieval/run.mjs` and `llm.mjs` reproduce them.
- **Merge note**: replaces `kit-coverage` and `kit-listing`. Front matter keeps `id solves triggers not_when status`.

### RD-10 `proven` is computed, not typed
- **Problem**: who may set `verified`? Several mechanisms have exactly one consumer (2.2.11, ASSUMED).
- **Options**: (a) a human sets `verified: true`; (b) status `proven` is valid only if lint finds a module, a test and ≥ 2 named consumers, and the self-test runs that test; everything else is `candidate` with a `review_by` date that fails lint once it passes.
- **Choice**: (b). The 3 patterns with two consumers are code + tests. The 8 single-consumer ideas are short prose candidates, labelled "unverified" in every listing.
- **Why**: nobody can set `verified`. It is true exactly when the tests run green.
- **Cost**: prose-only candidates still cost index tokens. Expiry forces a decision every 6 months.
- **Tested**: `patterns.test.mjs` runs every proven pattern's test. The atomic-write tests include a SIGKILL crash loop, deterministic fault injection at each syscall, and a negative control proving the injection tears a naive write. `lint-kit` enforces the rules.
- **Merge note**: drops the `verified` field. Adds `consumers license source review_by module test`.

### RD-11 Scaffold by project type, with a gate that demonstrably checks something
- **Problem**: every project got a web template: dead scripts, a `typescript` dev dependency, `prisma/`, a `typecheck` that checked nothing (2.2.3, ASSUMED).
- **Options**: (a) one template with conditionals; (b) per-type templates (`cli`, `library`, `web`, `content`) sharing a common core, with the kit vendored.
- **Choice**: (b). `web` is a zero-dependency `node:http` server; databases are a later D-row plus patterns. `content` covers novels, songs and lectures: Markdown parts with mechanical checks, plus `manual` ACs for judgement.
- **Why**: "no dead scripts / no deps / gate passes on first run" is a test, not a promise. A mutation test proves each type's gate fails when the AC-checked artefact breaks. This also guards RF-2 (`node --test` with zero tests exits 0).
- **Cost**: every type needs Node for its gate, even `content` (INFERRED acceptable: the kit itself needs Node).
- **Tested**: `scaffold.test.mjs` (4 types plus pattern copy-in).
- **Merge note**: replaces `new-project`. Drops the Postgres/Supabase/prisma defaults.

### RD-12 Multi-agent: task = branch + worktree + scope; the reconciler gates the merged tree
- **Problem**: parallel work was never run with two agents (2.2.8, ASSUMED).
- **Options**: (a) shared branch plus locks; (b) append-only event log; (c) per-task branch + worktree + declared scope, with a reconciler that re-checks and merges with `--no-commit` and gates before committing.
- **Choice**: (c). `kit task new` refuses overlapping scopes unless `--overlap-ok`. `kit merge` handles:
  - a conflict: abort, report the files, exit 3, integration branch untouched;
  - a semantic conflict (each side passes alone, the merged tree fails the gate): abort;
  - success: one merge commit that also marks the task `merged`.

  Session attribution follows the first-parent chain, so merging `main` into a task branch does not pull other sessions' commits into this one (RF-6).
- **Why**: git already is a lock, a queue and an append-only log. Adding a separate one creates a second source of truth.
- **Cost**: worktree paths are absolute (VERIFIED). A worktree created in WSL is unusable from Windows git (INFERRED); `kit doctor` detects a dangling pointer. Not tested on Windows.
- **Tested**: `multi.test.mjs` uses two real worktrees with concurrently running (scripted) agents and a deliberate SPEC.md conflict on the same AC number: refused cleanly, resolved in a new session, merged. The whole history then passes `check`. It also covers a semantic conflict, and a worker that ignored its scope. Only scripted agents were run concurrently; LLM agents ran one at a time.
- **Merge note**: replaces `orchestrate.mjs` planner/worker/auditor and the reconciler design. Tiered escalation is deferred.

### RD-13 Chat relay: packet out, reply in, same close path
- **Problem**: a non-agentic chat window must be able to participate through a human (non-negotiable).
- **Options**: (a) the human hand-applies edits (no provenance); (b) `kit packet` / `kit apply`, which accepts `RESULT.json` or a `=== FILE ===` block format that chat models produce more reliably than escaped JSON (INFERRED).
- **Choice**: (b). The packet contains `RELAY.md` (189 tokens), the task, and fenced DATA: SPEC.md, files named in the task or `--read`, and files in scope. After a failure, the next packet carries the gate output back. `kit apply` is all-or-nothing and records `model_source: human`.
- **Why**: the relay model is the weakest participant (no tools, no file access), so it gets the most structure.
- **Cost**: whole-file replies (no diffs), no deletions, and a 60 KB data budget per packet.
- **Tested**: `relay.test.mjs` (7 tests). Bench `relay` condition with Haiku (no tools): see BENCH.md. Bench found RF-11 (the packet lacked read-only context) and it is fixed.
- **Merge note**: keeps the `PACKET.md` and `RESULT.json` names and shapes (RESULT.json: `{files:[{path,content}], notes}`).

### RD-14 Versioning: content-hash stamp with a per-file manifest; upgrades are recorded sessions
- **Problem**: how does a consumer know its kit version, upgrade safely, and see whether a kit change alters regeneration (Q12)?
- **Options**: (a) a stamp only (incumbent); (b) stamp plus manifest, vendored copy verified by `doctor`, and an upgrade plan that classifies changed files as "behavioural" (entry, relay, gate, spec, scope, secrets, session, patterns) or not.
- **Choice**: (b). `kit upgrade --from <kit> [--apply]` vendors inside a session scoped to `.tins/kit, tins.json, AGENTS.md`, so the upgrade itself has a record and passes the gate.
- **Why**: a vendored kit is offline and pinned. Hash pins in `.tins/patterns.lock` mean an upstream pattern change never silently reaches a project.
- **Cost**: each project carries 103 KB of vendored kit (VERIFIED, `du -sb .tins/kit`). Upgrades are explicit.
- **Tested**: `kit.test.mjs` (drift detection, tampered vendored file, dangling worktree pointer, upgrade plan flags `ENTRY.md`, upgrade apply records a session).
- **Merge note**: `KIT-VERSION` kept. Line 1 is the stamp (12 hex chars); following lines are `sha256  path`.

### RD-15 Benchmark harness with calibration agents
- **Problem**: no evidence that the kit helps (Q9).
- **Options**: (a) anecdotes; (b) a fixed suite, conditions with and without the kit, calibration with a null agent and an oracle agent, and any CLI agent via a command template.
- **Choice**: (b). See BENCH.md.
- **Why**: calibration proved its value immediately: it found RF-9 (kit bug) and two harness bugs before any model ran.
- **Cost**: model runs cost money and time (about 40 s per task for Haiku). Five tasks is a small suite.
- **Tested**: calibration results are committed in `bench/results/calibration-*.jsonl`.
- **Merge note**: new.

### RD-16 Kit hygiene is a test, not a ritual
- **Problem**: the kit's own tree drifts; documents claim things that are not true.
- **Options**: (a) a review checklist; (b) `kit lint-kit`, also run by the self-test. It covers stamp drift, entry budgets, pattern rules, expired candidates, no secret-like text anywhere in the kit tree, and every `RD-n` here having all seven fields and every `RF-n` heading carrying a label.
- **Choice**: (b).
- **Why**: rule 4 (mechanical beats exhortational) applies to the kit itself.
- **Cost**: every stamped change needs `node bin/kit.mjs version --write`.
- **Tested**: `kit.test.mjs`.
- **Merge note**: replaces the `--kit` validation mode.

### RD-17 Model identity is a recorded claim, never a verified fact
- **Problem**: `--model-source` is a claim; nothing verifies it (2.2.6, ASSUMED).
- **Options**: (a) try to verify (impossible from outside the provider); (b) record the claim, its source and `model_verified: false`; where a harness reports the served model, the bench records it separately.
- **Choice**: (b). `kit run --model X` records `model_source: launcher` (the launcher chose X, which is not proof it served). `kit apply` records `human`.
- **Why**: `claude -p --output-format json` reports `modelUsage` keyed by the served model id (VERIFIED). That is harness-reported, which is better than self-report, so the bench captures it as `served_model`.
- **Cost**: none. Honesty about a limitation.
- **Tested**: `session-order.test.mjs` (`model_verified: false`).
- **Merge note**: the `harness` source value is dropped from the kit (the kit is never the harness). It reappears as the bench's `served_model`.

### RD-18 The gate scrubs inherited test-runner state
- **Problem**: with `NODE_TEST_CONTEXT` inherited, a failing `node --test` exits 0 (RF-7, VERIFIED), so any gate launched from inside a node:test process passes falsely.
- **Options**: (a) document it; (b) the gate deletes `NODE_TEST_*` from its commands' environment.
- **Choice**: (b).
- **Why**: a silent false pass is the worst gate failure.
- **Cost**: none known.
- **Tested**: `session-safety.test.mjs` ("gate is not fooled by an inherited NODE_TEST_CONTEXT").
- **Merge note**: the incumbent's `validate.mjs` probably has the same exposure if it ever runs under node:test (INFERRED).

### RD-19 Lesson intake: candidates expire, proven needs two consumers, consumers pin by hash
- **Problem**: a bad lesson from one project must not silently degrade the kit for all (Q10).
- **Options**: (a) `kit-ingest` / `kit-proposal-check` commands; (b) no separate lane. A lesson enters `patterns/` as a `candidate` (prose, one consumer, `review_by`); promotion needs a module + test + second consumer (lint-enforced); projects copy modules in and pin hashes; `doctor` reports upstream changes; rollback is `git revert` in the kit, which reaches no project until it upgrades.
- **Choice**: (b).
- **Why**: the protection comes from the rules (status cannot lie, expiry, pinning, behavioural flags on upgrade), not from a command.
- **Cost**: no automated "is this lesson a duplicate?" check.
- **Tested**: `kit.test.mjs` / `lint-kit` (status rules, expiry), `scaffold.test.mjs` (pinning), `doctor` (changed pins).
- **Merge note**: replaces `kit-ingest`, `kit-proposal-check` and `kit-new-pattern`.
