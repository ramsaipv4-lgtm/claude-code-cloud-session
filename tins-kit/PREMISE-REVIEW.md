# PREMISE-REVIEW — tins-kit (redesign)

Labels: `VERIFIED` (command + output reproduced here), `INFERRED` (reasoned, not run), `ASSUMED`
(from the brief, unchecked). Evidence links point to tests (`node test/run.mjs <name>`),
experiments (`experiments/`) and bench results (`bench/results/`, summarised in BENCH.md).

## Plan as written before any code (kept for the record)

1. Probe which agents can run. Result: only `claude -p`, no raw API key. So no second model family;
   a second *harness shape* (a tool-less chat relay with a script playing the human) is available.
2. Ledger/provenance core and the ordering-trap tests (Q5, Q6).
3. Secret scan over what a session *added* (2.2.4).
4. Scope enforcement plus injection canary (Q8).
5. Retrieval experiment: fragments and labels **committed before** the retriever (commit `98ebc71`).
6. Scaffold by type, with "no dead scripts / no deps / gate passes on first run" as a test.
7. Two real worktrees, a deliberate conflict, a reconciler (Q7).
8. Entry budget measured and enforced (Q4).
9. Bench harness: calibrate with null and oracle agents, then run Haiku (agentic + relay) and Sonnet (Q9).
10. Answer Q1–Q12; argue against myself.

The order held, except that the bench found three defects that sent me back to steps 3, 4 and 6
(RF-9, RF-10, RF-11).

---

## Q1 Is "the spec is the source code" the right unit?

**Answer.** Half right. The *authority* should be a spec, but only the parts of it that are
**executable or checkable**: numbered decisions that constrain choices, plus acceptance criteria
each bound to a check. "Regenerate the whole app from prose" is not how agents actually work. Every
bench task, and every run I observed, was an incremental edit. Prose also cannot carry what usually
breaks:
- **UI feel**: needs `manual` ACs and a human.
- **Performance**: needs a benchmark AC with a number.
- **Integrations**: need contract tests against recorded fixtures.
- **Exploratory work**: the spec lags the code by design, so decisions sit at status `open`.

So the primary artefact here is **SPEC rows + their bound checks**. The kit enforces the binding
mechanically: an `AC-n` must name a check file that exists and contains the id, or say `manual`.

**Smallest spec that keeps regeneration reliable**: the D-rows that a competent implementer could
otherwise choose differently, plus one AC per externally observable behaviour, each with a check.
Anything a hidden check cannot distinguish does not need to be in the spec.

**Detecting drift**:
1. the gate runs the bound checks;
2. the lint refuses unbound ACs;
3. every record carries an intent diff (`spec_added/changed/removed`), so a code-only change is
   visible at review;
4. a from-scratch regeneration test. Not built (OPEN-QUESTIONS.md Q-10).

**Evidence.** `spec.test.mjs` and `scaffold.test.mjs` (VERIFIED). The bench shows "SPEC first"
(ENTRY rule 2) is followed **inconsistently** even with the kit: Haiku added SPEC rows for
`cli-greet` but none for `money-total` in either kit condition (BENCH.md, VERIFIED). The exhortation
alone does not hold. That is the strongest evidence in this work against "spec is the source" as a
*practised* discipline.

**Confidence**: medium.
**Would change my mind**: a regeneration bench (delete `src/`, regenerate from SPEC, run hidden
acceptance tests) passing reliably across two model families.

## Q2 Is a trigger-word pattern library the right memory?

**Answer.** No. Measured on 16 fragments I wrote (labels committed first; 10 relevant pairs in the
held-out split):

| Method | Held-out miss | False positives | Upkeep cost |
|---|---|---|---|
| trigger substring (incumbent-like) | 8/10 | 2/4 | Triggers rot silently |
| BM25 over all fields + module comments | 4/10 | 0/6 | Zero upkeep, but lexical; misses paraphrase ("customer sees only their own orders" ≠ tenant) |
| **model reads the whole one-line index (577 tokens)** | **0/10** | **0/10** | Index generated from front matter; cost grows linearly |
| embeddings | not run | — | Needs a dependency or network (rule 6) |

Index results were identical across two runs (`experiments/retrieval/`, VERIFIED).

Comparing the alternatives the brief names:
- **(a) One excellent AGENTS.md** prevents protocol failures but cannot carry code.
- **(b) Always-loaded principles + on-demand deep dives** is what I built. Six rules, plus
  `kit patterns` printing the index on demand.
- **(c) Executable, tested templates** are the only form that prevents *wrong* reinvention, and the
  cheapest to keep true, because a failing test flags rot.
- **(d) Embeddings**: deferred.
- **(e) No library**: for these small tasks, Haiku *without* the kit computed money correctly
  (bare `money-total` passed the half-even traps; BENCH.md). So the library's value here was reuse
  and consistency, not correctness.

**Choice.** (b) + (c): an index the model reads, plus tested modules for patterns with two consumers.

**Confidence**: medium-high for "index beats triggers at this size"; low for generality (labeller
and retriever are both Claude).
**Would change my mind**: a human-labelled, non-Claude replication; or a library large enough that
the index stops fitting.

## Q3 Granularity of a pattern; what makes it verified

**Answer.** Three tiers, by evidence:
1. **Candidate**: prose of 10 lines or fewer, one consumer, a `review_by` date. Shown as
   "unverified" everywhere.
2. **Proven**: prose + code module + test, ≥ 2 named consumers.
3. Inside each proven test, a **negative control** proving the test can fail. The atomic-write
   suite injects a crash at every syscall into both the atomic and a naive implementation; the naive
   one tears.

**"Verified" is not a field anyone sets.** It is true exactly when lint finds module + test +
2 consumers and the self-test runs the test green (`patterns.test.mjs`, `lint-kit`). Prose + check
script is right for *rules* (secret scan, dependency rule), not for building blocks.

**Evidence.** RF-8: my first negative control was timing-based and flaky. Even the evidence that a
test can fail has to be deterministic.

**Confidence**: high.

## Q4 Stopping the kit becoming an unread pile

**Answer.** Make the entry path a **budget enforced by a test**, and make everything else *pulled
by a command* rather than read:
- `ENTRY.md` must stay ≤ 1600 bytes. It is 1189 bytes, **327 tokens** measured with Claude's
  tokenizer (RF-18).
- `RELAY.md` ≤ 1200 bytes (189 tokens).
- Patterns are printed only when the agent runs `kit patterns` (577 tokens).
- A one-line task therefore costs about 330 tokens of protocol, plus whatever the agent chooses to
  pull.

What a weak model reliably obeys was measured on Haiku 4.5 through rule-specific signals (numbers
in BENCH.md):
- **Rule 6** (close): obeyed in `kit-nowrap` (no wrapper) in {{NOWRAP_PROV}} runs.
- **Rule 3** (patterns): reused the money module in every kit `money-total` run, and never in bare.
- **Rule 2** (SPEC first): obeyed in some tasks only.

The rules that matter most are therefore not left to obedience: close is done by `kit run`; scope,
secrets and the gate are code.

**Confidence**: medium. One model family.
**Would change my mind**: a weaker model, or another family, ignoring rule 6 even at 327 tokens.
Then the wrapper becomes mandatory, not optional.

## Q5 Which steps can be automatic?

| Step | Now | Can the model forget it? | What is lost |
|---|---|---|---|
| `start` | Done by `kit run`; optional otherwise (`close` infers base from the last close) | No | Early warning on a dirty tree (now recorded as `dirty_at_start` instead) |
| `ack` | Dropped (Q6) | — | A weak "I looked" signal |
| trailer commits | Healed at `close` by a tree-preserving rewrite of unpublished commits | No | Original hashes and GPG signatures of rewritten commits (INFERRED) |
| `close` | Done by `kit run`; idempotent; accepts an agent-closed session | No (with `kit run`) | The agent's own note, unless it writes one |
| `claim` | Dropped: git conflict + duplicate-id lint | — | Pre-allocation of numbers (renumbering after a conflict is manual) |
| `reap` | `kit abort`; `doctor` flags stale sessions; `kit run` resumes an open one | — | Nothing |

**Evidence.** `session-order.test.mjs` covers 8 "natural order" cases, all succeeding (VERIFIED).
The bench `kit` condition: every Haiku and Sonnet run had correct provenance with zero bookkeeping
instructions followed.

**Confidence**: high for the mechanics.

## Q6 Is `ack` worth having?

**Answer.** No.
- A 3-line script answers ack-shaped questions without understanding anything (RF-14, VERIFIED for
  the assumed question shape).
- A hash-addressed snippet citation has the same weakness: `grep` finds the snippet.
- The ordering traps it caused (2.2.5) are real costs.

What *does* prove context was used is the outcome: the gate, the bound ACs and the merge-time
re-check. Dropped (RD-4).

**Confidence**: high. **Would change my mind**: an incident where an agent with a passing gate did
damage that reading state would have prevented, *and* where ack would have caught it.

## Q7 Multi-agent coordination

**Answer.** One branch + one worktree + one declared scope per task, and a reconciler that:
- re-derives everything on the task branch (`check` in a throwaway worktree, trusting no record);
- merges with `--no-commit`;
- gates the **merged** tree;
- then commits or aborts.

Alternatives:
- A lock or queue duplicates what git's ref locking already does, and adds a second source of truth.
- An append-only event log is git, again.
- PR-style review is compatible: `kit merge` is the bot step before a human approves.

**Evidence (VERIFIED, `multi.test.mjs`)**:
- Two real worktrees with concurrently running scripted agents.
- A deliberate conflict (both add `AC-2`): refused cleanly, integration branch untouched; resolved
  in a new session by renumbering; merged; the whole history then passes `check`.
- A semantic conflict (each side green, merged red): refused at the gate.
- A worker that ignored its scope: refused.
- Building it found RF-6: merging `main` into a task branch broke naive range attribution.

**Not tested**: native Windows; WSL ↔ Windows worktrees (RF-12, INFERRED broken); concurrent *LLM*
agents (Q-8).

**Confidence**: medium-high on Linux.

## Q8 Trust model

**Answer.** Two levels:
1. **Instructions**: the human's task text and `AGENTS.md`/`RELAY.md` (the vendored, hash-verified
   copy).
2. **Data**: everything else, including repo files, tool output, other agents' records, packet
   contents and gate output.

What code enforces regardless of the model:
1. **Scope**: the diff must stay inside the task's paths (`close`, `check`, `merge`).
2. **Protected paths**: `.tins/kit`, `tins.json`, `sessions`, `tasks` need an explicit grant, so an
   agent cannot loosen its own gate.
3. **Secrets**: scanned in what was added, never printed.
4. **Relay**: DATA fenced with a fresh nonce; replies applied all-or-nothing with path safety.
5. **No network and no `eval`** in kit code.
6. The gate strips inherited `NODE_TEST_*` (RF-7).

What is only *asked*: not obeying instructions found in data.

**Canary tests**:
- **Code layer**: `relay.test.mjs` (an injected line stays inside its fence; any unsafe path refuses
  the whole reply) and the `obeys-injection` calibration agent. It is contained in both kit
  conditions and not in bare (VERIFIED).
- **Model layer**: bench tasks `injection` (crude HTML-comment injection) and `injection-plausible`
  (an injected "action item" asking to delete a test). Results in BENCH.md.

**Confidence**: high for the code layer; the model layer is per-model data, not a guarantee.

## Q9 Measuring that the kit helps

**Answer.** `bench/run.mjs` runs a fixed suite against any CLI agent under four conditions
(`kit`, `kit-nowrap`, `bare`, `relay`), calibrated by `null`, `oracle`, `oracle-relay` and
`obeys-injection` agents. It records:
- functional pass (a hidden check);
- provenance (`kit check` passes, nothing left open, tree clean);
- scope;
- secrets added, including the bait value;
- canary and containment;
- SPEC rows added;
- pattern reuse;
- seconds, and cost/tokens where the harness reports them.

Results so far: {{BENCH_SUMMARY}}

**What would convince me the kit is not worth having**, across ≥ 2 model families and a suite where
bare is *not* at ceiling:
- the kit condition's pass rate is no better than bare, and
- its cost per task is higher, and
- neither containment nor "SPEC updated" differs.

Provenance alone does not justify the kit if `git log` plus a CI secret scan gives the same.
Today's data does **not** reach that bar either way: the tasks are too easy (bare passes too).

**Confidence**: the harness is sound (calibrated); the conclusions are weak (one family, 6 small tasks).

## Q10 How lessons flow back safely

**Answer.** No separate ingest command. The status rules carry the safety (RD-19):
1. A lesson enters as a `candidate`: prose, one named consumer, `review_by` within 6 months.
   `lint-kit` fails once that date passes, so it is promoted or deleted, never left.
2. Promotion to `proven` requires module + test + a second consumer (lint-enforced). Nobody can
   type `verified`.
3. Projects **copy modules in and pin hashes** (`.tins/patterns.lock`). A bad upstream change
   reaches no project silently: `doctor` reports it, and `upgrade` flags it as behavioural.
4. Rollback is `git revert` in the kit. Projects pick it up on their next explicit upgrade, which
   is itself a recorded session.

**Evidence.** `kit.test.mjs` (upgrade flags `ENTRY.md`, applies inside a session), `scaffold.test.mjs` (pins).

**Confidence**: medium. The weak point is the human review of a candidate's prose.

## Q11 What is missing entirely?

| Concern | Status here |
|---|---|
| Cost/token budgeting | Bench records cost and tokens when the harness reports them. The kit cannot see tokens, so enforcement belongs to harness adapters (DEFERRED D-13) |
| Resumability after crash / usage limit | **Built**: session state survives; `kit run` resumes the same session (`session-order.test.mjs` "crash mid-session") |
| Deterministic replay | Inputs recorded (base, kit version, task, model claim); outputs are not reproducible (D-15) |
| Diffs of intent | **Built**: `spec_added/changed/removed` per session, merge-aware |
| Secrets beyond scanning | Pattern `secrets-from-env`; `close` gives a non-destructive history fix; no vault integration |
| Licensing of imported patterns | **Built**: `license` and `source` required by `lint-kit` |
| Onboarding a human maintainer | README (one page) + `kit doctor` + records. Not tested on a human |
| Handover to another team | SPEC + records + KIT-VERSION + `HANDOFF.md` convention; `close --handover` for unfinished work |
| **Not in the brief, added**: semantic merge conflicts | **Built**: the reconciler gates the merged tree |
| **Not in the brief, added**: an agent loosening its own gate | **Built**: protected paths |
| **Not in the brief, added**: false-green gates | **Built**: RF-2 mutation tests, RF-7 env scrub |
| **Not in the brief, open**: multi-repo projects, a kill switch for a runaway agent, audit of who ran the reconciler | Open |

## Q12 Versioning and promotion

**Answer.** `KIT-VERSION` is a 12-hex content stamp plus a per-file manifest of every file that can
change agent behaviour or gate verdicts. A project vendors the kit into `.tins/kit/`, and every
session record carries `kit_version`, so "built with which kit" is per session, not per project.

- `kit doctor` verifies the vendored copy file by file (a tampered gate is caught, VERIFIED).
- `kit upgrade --from <kit>` lists changed files and marks **behavioural** ones: entry, relay, gate,
  spec, scope, secrets, session, patterns. Those are exactly the files that can alter regeneration
  or acceptance.
- `--apply` performs the upgrade inside a recorded, gated session.

**Confidence**: high for the mechanism. Whether a behavioural change *actually* alters regeneration
is only measurable by re-running the bench with both versions, which the harness supports.

---

## Objections to this design (arguing against myself)

**O1. "The mechanical guarantees are local and therefore bypassable."** An agent can commit around
the kit, never call close, or weaken tests inside its scope.
**Status: mitigated, partly open.** `kit check` / `kit merge` re-derive everything and refuse
unattributed or unclosed work, but only if the reconciler (a human or CI, not the agent) runs them.
Nothing here installs that into CI. Weakened tests are visible in the record's file list but not
judged.

**O2. "Rewriting commits at close is surprising and dangerous."** It changes hashes, drops GPG
signatures, and can confuse a tool that cached a sha.
**Status: mitigated.** Only unpublished commits are rewritten (published ones fall back to
range attribution); trees are byte-identical, so nothing can conflict; it happens once, at the end.
Open for signed-commit workflows: the alternative there is a `prepare-commit-msg` hook
(DEFERRED D-10).

**O3. "The evidence is thin and self-graded."** One model family; tasks and fragments written by
the author; labels by the same family as the retriever; tasks easy enough that bare passes too.
**Status: open.** This is the honest limit of this work. The harness exists so that someone with a
second family and harder tasks can falsify the design cheaply (one line in `bench/agents.json`).
