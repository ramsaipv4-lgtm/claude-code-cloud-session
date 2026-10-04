# HANDOFF

1. **Run first:** `node tins-kit/test/run.mjs` (55 tests, about 14 s, any cwd, no network), then `node tins-kit/bench/run.mjs --agent oracle --conditions kit,bare,kit-nowrap` (calibration, about 15 s).
2. **Read first:** `ENTRY.md` (the whole agent protocol, 327 tokens), then the RD list in `DESIGN.md`, then `COMPAT.md` for the merge.
3. **Least sure of:** whether any of this holds for a non-Claude model family or on native Windows (OPEN-QUESTIONS Q-1, Q-2). The bench is one line away from answering the first: add the agent to `bench/agents.json`.
4. **Second-least sure of:** commit rewriting at `close` (RD-3) in teams that sign commits, and whether "SPEC first" can ever be more than a request (Q1; Haiku skipped it in the money task).
5. **No incumbent access:** `COMPARE.md` was not written. COMPAT's "Preserved" column is from the brief, not the code; check it against the fork before merging.
