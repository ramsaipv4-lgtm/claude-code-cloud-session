# PREMISE-REVIEW — tins-kit (redesign)

Status: SKELETON. Written before any code, as the brief requires. Each section is filled in
as experiments complete. Labels: `VERIFIED` (command + output reproduced in this repo),
`INFERRED` (reasoned, not run), `ASSUMED` (taken from the brief unchecked).

## Plan (order of work, what is tested first)

1. Probe the environment: which agents can I actually run? (Done: only `claude -p`; no raw API key.
   So "a second model family" is not available; a second *harness shape* is: a tool-less chat
   relay driven by a script playing the human.)
2. Ledger/provenance core (`kit start/close/run/check`), then the ordering-trap tests (Q5, Q6)
   — first because the brief says provenance is the property that held up and must not regress.
3. Secret scan over what a session *added* (diff + commit messages), with a runtime-built canary (2.2.4).
4. Scope enforcement (allowed paths) + injection canary — the only parts of the trust model code can enforce (Q8).
5. Retrieval experiment: write spec fragments and ground-truth labels and COMMIT THEM before
   writing the retriever; measure old method vs new on held-out fragments (Q2).
6. Scaffold by project type, with "no dead scripts / no deps / gate passes on first run" as a test.
7. Two real worktrees, two sessions, deliberate conflict, reconciler (Q7).
8. Entry path budget measured and enforced by test (Q4).
9. Benchmark harness; calibrate with a null agent and a scripted agent, then run a real weaker model
   (Haiku via `claude -p`) through two harness shapes (agentic CLI, and tool-less chat relay) (Q9).
10. Fill in Q1–Q12, objections, findings.

## Q1 Is "the spec is the source code" the right unit?
## Q2 Is a trigger-word pattern library the right memory?
## Q3 Granularity of a pattern; who sets `verified`
## Q4 Stopping the kit becoming an unread pile
## Q5 Which protocol steps can be automatic
## Q6 Is `ack` worth having
## Q7 Multi-agent coordination
## Q8 Trust model
## Q9 Measuring that the kit helps
## Q10 Lesson intake
## Q11 What is missing
## Q12 Versioning and promotion
## Objections to this design
