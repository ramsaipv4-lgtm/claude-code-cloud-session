# tins-kit (redesign)

A small, zero-dependency toolkit (Node ≥ 18 + git) for projects where **SPEC.md is the authority**
and AI agents, possibly weak, in any harness, or a chat window relayed by a human, do the work.

**What it is**
- **The entry path**: one file, `AGENTS.md` (= `ENTRY.md`), 6 rules, 327 tokens.
- **A CLI** that does the bookkeeping, so the model cannot forget it. `kit run -- <agent>` starts a
  session, runs the agent, then closes. Closing commits leftovers, adds trailers, derives every
  fact from git, secret-scans what was *added*, checks the diff against the task's scope, runs the
  gate, and commits a record.
- **A gate**: SPEC lint + the project's own commands. No skip flag.
- **Pattern memory**: 3 tested modules plus 8 prose candidates, found by reading a 577-token index.
- **A scaffold**: `cli`, `library`, `web`, `content` project types.
- **Multi-agent**: task = branch + worktree + scope. A reconciler gates the merged tree.
- **Chat relay**: `kit packet` / `kit apply`.
- **A benchmark harness** for any CLI agent.

It is the result of a sceptical redesign. Start with `PREMISE-REVIEW.md` (the answers to Q1–Q12),
`DESIGN.md` (decisions RD-1…RD-20), `COMPAT.md` (merge map) and `FINDINGS.md` (RF-1…).

## Use

```sh
node tins-kit/bin/kit.mjs new myproj --type cli      # or library | web | content
cd myproj
node .tins/kit/bin/kit.mjs gate                      # passes on first run
node .tins/kit/bin/kit.mjs run -- <your agent command, e.g. claude -p "…" / codex exec "…">
node .tins/kit/bin/kit.mjs task new add-x --paths SPEC.md,src,test -m "Add x."   # parallel work
node .tins/kit/bin/kit.mjs merge add-x               # reconcile (check → merge --no-commit → gate → commit)
node .tins/kit/bin/kit.mjs packet add-x > PACKET.md  # chat relay: paste into any chat model …
node .tins/kit/bin/kit.mjs apply add-x reply.txt     # … and apply its reply (all-or-nothing)
```

## Self-test

`node tins-kit/test/run.mjs` runs from any directory, with no network. Output from two working
directories, this commit:

```
$ cd /tmp && node /home/user/claude-code-cloud-session/tins-kit/test/run.mjs
# tests 58
# pass 58
# fail 0
self-test: PASS — 9 files, 14.4s, node 22.22.0, cwd /tmp
$ cd /home/user/claude-code-cloud-session/tins-kit/templates && node /home/user/claude-code-cloud-session/tins-kit/test/run.mjs
# tests 58
# pass 58
# fail 0
self-test: PASS — 9 files, 15.3s, node 22.22.0, cwd /home/user/claude-code-cloud-session/tins-kit/templates
```

Kit tree drift: `node tins-kit/bin/kit.mjs lint-kit` (also part of the self-test).

## Benchmark

```sh
node tins-kit/bench/run.mjs --agent oracle --conditions kit,bare,kit-nowrap   # calibration, seconds
node tins-kit/bench/run.mjs --agent haiku  --conditions kit,kit-nowrap,bare --reps 2
node tins-kit/bench/run.mjs --agent haiku-relay                              # tool-less chat model via relay
node tins-kit/bench/summarize.mjs tins-kit/bench/results/run-*.jsonl
```

Add any CLI agent as one line in `bench/agents.json`. Results and their limits are in `BENCH.md`.

## What is verified (and what is not)

**VERIFIED** (by tests or committed experiment output in this repo):
- The ordering traps of the old ledger all self-heal (8 cases).
- A secret in a project file is caught at close and never printed (the 2.2.4 hole).
- Scope and protected paths stop an agent editing its own gate.
- Two real worktrees with a deliberate conflict reconcile correctly.
- Each scaffold type has a gate that fails when its artefact is broken.
- Atomic write survives SIGKILL and per-syscall fault injection.
- Retrieval: on held-out fragments, trigger-substring misses 8/10, BM25 4/10, a model reading the index 0/10.
- Entry path cost is 327 tokens.
- A gate run from inside a node:test process would silently pass (RF-7); now fixed.
- Haiku 4.5 and Sonnet 5.5 complete all six bench tasks with correct provenance through `kit run`.
- Making SPEC-first a close-time rule (RD-20) raised Haiku's SPEC-update rate on code tasks from 9/12 to 12/12.
- The core claim "the kit makes agents more correct" is **not** shown: bare passes too (BENCH.md).

**Not verified:**
- Any non-Claude model or harness.
- Native Windows and WSL ↔ Windows.
- Node 18/20.
- git < 2.43.
- Concurrent LLM agents (scripted agents only).
- From-scratch regeneration from SPEC.

See `OPEN-QUESTIONS.md`.

## Course generator (`skill-template/`)

`tins-kit/skill-template/` is the course-package skill (v2.1) with three modes: `day` (teaching days from a
syllabus), `case-study` (a micro-step course built from a codebase or build, as in the tins-lms rebuild course)
and `dsa-patterns` (one lesson per problem-solving technique, solutions in Java and Python that the gate runs
against their tests, UpNote-style PDF rendering). Start with `skill-template/SKILL.md`.
