# Orchestrator queue (one gate-heavy job at a time: 16 GB / 4 CPU; 2 restarts from parallel gates)
Env: export LMS_ACCEPTANCE_DIR=/home/user/tins-lms-tests/acceptance LMS_NODE_MODULES=/home/user/tins-lms/node_modules
1. b7-7: orchestrator sync session 1242bfe6 open (synced with main) -> close, kit merge, push.        [running]
2. b7-5: sync session 5c67c0c3 open, clean -> close, merge, push.
3. b7-6: sync session b11d7ba1 open, 5 dirty files = builder's fix in progress for merged-tree failures
   (2 unit tests, AC-164 trainer sees learner nav). Resume builder ac642eaf1e18ee352 alone.
4. b8-1: builder session b6b87052 open, 1 commit + 4 dirty; rows AC-97, AC-101 claimed. Resume builder ab4920f107f0eacf4 to finish/close.
5. b9-1: session e99463c2 open (close attempt made commit "uncommitted work at close", gate killed). Resume a447ad4d78b4bb5e6 to close.
6. b7-8: closed once (782ee05b); reconcile session 5967c4c5 open (journal E1-E22 + source_refs). Resume a0e27cb3bc155184d to close.
7. b7-9: session 791125a5, 17 dirty, AC-98 only so far. Resume a29539e4509d637d4.
8. For each closed builder task: evidence (finish.sh or extract-only), reconcile, merge (sync with main first if old).
9. b11-1 hardening + integration-notes.md items; AUDIT rows (audit-add.md); CONTINUE.md; AC-153 re-check after b7-6.
10. Rebuild course (SPEC §11), Haiku vs Sonnet report, report to user.
## 18:05 state
Jobs run detached (setsid nohup) under flock gate.lock; progress in jobs.log. q1: merge b7-5, close b7-8, close b9-1. q2: merge b8-1, close+merge b7-6, close+widen+merge b7-7.
Background Bash tasks get killed by the time limit even while waiting -> killed one mid-merge left main mid-merge (aborted by hand). Never run kit merge from a killable background task.
Merged on main so far: core, server, adapters, b7-1..b7-4, b7-2, i-3, i-4, b7-9.
Then: b11-1/b11-2 (briefs in scratchpad; pin @tesseract.js-data/eng 1.0.0 on main first), AUDIT rows (audit-add.md), CONTINUE.md, findings RF-29 (missing trailers from Haiku commits), course.
## 00:45 (Oct 6) state — QUEUE HALTED
Merged on main: core, server, adapters, b7-1..b7-4, b7-2, i-3, i-4, b7-9, b7-8, b7-5, b9-1.
Robustness journey (AC-167, b7-9) kiosk test now blows the test process to 13.6 GB (after b7-5/b7-8 merged) -> every gate since hangs/nearly OOMs. Queue halted; debugging agent acb44fab7a7954743 on /home/user/int-r (main copy). Kill rule: any robustness journey proc > 3 GB.
Open sessions: main 417617a3 (widen b7-7, tasks/b7-7.md change committed as 6e5ef7f "uncommitted work at close"; needs close); i-8 5c4ecec8 (needs close); b7-7 closed (I-6 committed); b7-6 closed (I-5); b8-1 closed (AC-97 only).
To merge after the robustness fix: i-8 (fix lands with it?), b8-1, b7-6, b7-7; then b11-1, b11-2.
Gate should also: kill orphan servers after timeout; print journey error blocks (b11-2 item 7).
- queued after b12-1 finishes: q23 (docs + gate timeout)
- closeout bookkeeping: claim AC-55, AC-56, AC-57 (core tests pass 3/3 on main, never claimed) in build/progress/closeout.json; final CONTINUE.md; push
