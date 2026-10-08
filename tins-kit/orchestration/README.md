# Orchestration helpers (as used for the tins-lms v1 build)

These are the small scripts the orchestrator used to run many builder tasks against one machine.
Paths default to `$WORK=$HOME` (repos at `$WORK/tins-lms`, `$WORK/tins-lms-tests`, task worktrees
at `$WORK/tins-lms.worktrees/<id>`) and `$ORCH_DIR=$HOME/tins-orch` (lock file and logs). Create
`$ORCH_DIR` first. They are reference material, not a polished tool.

| File | What |
|---|---|
| `job.sh close <task> "<why>"` / `job.sh merge <task>` | close a task session or merge a task branch into main under one global `flock` (only one gate runs at a time — two parallel gates restarted the 16 GB machine); merge also pushes main; exits non-zero on failure |
| `newtask.sh <id> <step> "<msg>"` | `kit task new` with scope paths read from the TASKS.md row, and links `node_modules` + `acceptance` into the worktree |
| `brief.tpl` | the builder brief template (fill `{ID}`, `{PATHS}`, …); the rules in it are the ones that worked |
| `widen.sh` | bookkeeping when a task's scope had to grow |
| `evidence.py <transcript.jsonl>` | pulls failing commands (and any read of hidden acceptance tests) out of a builder transcript into `docs/build-journal/<id>.evidence.md` |
| `finish.sh` | evidence → close → merge chain for one task |
| `fullsuite.mjs` | runs the whole acceptance suite one file at a time |
| `nav/navcheck.mjs` | nav-name collision check (now also `scripts/navcheck.mjs` in tins-lms) |
| `memguard.sh` | kills any process above 4 GB RSS (runaway test processes); run detached |
| `QUEUE.md` | the last state of the v1 merge queue (historical) |

Lessons that shaped them are in `../FINDINGS.md` (RF-21 … RF-31).
