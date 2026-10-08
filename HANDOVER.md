# Handover — continue on your own machine (2026-10-08)

Everything below is pushed to GitHub. Nothing you need lives only in the cloud container.
Step-by-step setup on WSL: [`SETUP-WSL.md`](SETUP-WSL.md). Prompts for the next LLM: [`PROMPTS.md`](PROMPTS.md).

## 1. Clone

```bash
mkdir -p ~/work && cd ~/work
git clone https://github.com/ramsaipv4-lgtm/tins-lms.git            # the app (main = v1 complete + games SPEC)
git clone https://github.com/ramsaipv4-lgtm/tins-lms-tests.git      # acceptance suite (134 rows)
git clone -b claude/hopeful-pascal-mxr1a1 https://github.com/ramsaipv4-lgtm/claude-code-cloud-session.git   # tins-kit, skill-template, this note
```

Then follow `tins-lms/README.md` (Node 22.18+, `npm ci`, `npm run build -w packages/web`,
`LMS_TLS=off npm start`; tests in §3). The full acceptance gate takes 30–55 min and wants ~16 GB
RAM; run one gate at a time.

## 2. Where things stand

| Item | State | Where |
|---|---|---|
| tins-lms v1 | **done**: 134/134 automated rows green, rebuild course passes its check | `tins-lms` main, `CONTINUE.md`, `docs/build-journal/` |
| README (local / live / hosting) | done | `tins-lms/README.md` |
| Games design (8 games) | **SPEC written, nothing built yet** | `tins-lms/SPEC-games.md` (build plan in §G7) |
| Product demo videos | **in progress, not merged** | branch `task/d-1` in tins-lms |
| DSA class package + skill-template `dsa-patterns` mode | done (package delivered as a zip; it is premium content and is **not** in any repo) | `claude-code-cloud-session/tins-kit/skill-template/` |
| Orchestration scripts | saved | `claude-code-cloud-session/tins-kit/orchestration/` |

Note: the cloud container was still running the gate to **close** the games-spec session when I
handed over. If it finishes, it pushes one more commit to tins-lms main
(`tins: close session dd27364e …`) — just `git pull`. If it never arrives, nothing is lost: the
SPEC commit (`0623708`) is already on main.

## 3. Finish the demo videos (branch `task/d-1`)

What is on the branch: `demos/run.mjs` + `demos/lib`, `demos/scenes/01…15`, coverage table
generation, `demos/README.md`, README section, journal `docs/build-journal/d-1.md` (includes 10 app
bugs found while recording, with repro). The `.mp4`s are not committed — `node demos/run.mjs`
regenerates them (~20 min) into `demos/out/` with `demos/out/index.md`.

Left to do:

1. **Phone videos (04, 07, 08, 13)**: the last recordings had the app only in the top-left
   360×740 of a 720×1480 grey frame (Playwright records in CSS pixels). The fix is already
   committed but **not yet re-recorded or checked**: `stage.mjs` records phones at `rec` 360×740 and
   `makeMp4` upscales with lanczos. Verify with a full-size frame, e.g.
   `ffmpeg -ss 20 -i demos/out/13-first-run-and-catch-up.mp4 -frames:v 1 x.png`.
2. Captions now wait for the screen's content (commits `1c33d20`, `f86a53b`) — check video 10 around 0:35.
3. In 04 the learner's Quick-learn shows raw instructor markup (`[TYPE]`, `[PAUSE]`, `## **Break…**`):
   decide whether it is the demo fixture (`demos/seed/fixtures/package/…`) or an app bug.
4. Re-record, look at frames at full size, then merge. The branch's commits were made inside a
   cloud kit session that never closed, so **re-record it on a fresh task** (this is how RF-27/29
   cases were handled):

   ```bash
   cd ~/work/tins-lms
   node .tins/kit/bin/kit.mjs task new d-2 --paths demos,docs/build-journal/d-2.md,docs/build-journal/d-2.evidence.md,README.md -m "demo videos"
   cd ../tins-lms.worktrees/d-2
   node .tins/kit/bin/kit.mjs start --task d-2 --paths demos,docs/build-journal/d-2.md,docs/build-journal/d-2.evidence.md,README.md
   git checkout origin/task/d-1 -- demos README.md && git show origin/task/d-1:docs/build-journal/d-1.md > docs/build-journal/d-2.md
   # … fixes, run, commit …
   node .tins/kit/bin/kit.mjs close --why "product demo videos"
   cd ../../tins-lms && node .tins/kit/bin/kit.mjs merge d-2 && git push origin main
   ```

## 4. Build the games (SPEC-games.md)

Order (from §G7):

1. **Acceptance tests first**, written by someone who is not the builder (you, or a separate agent
   that only reads `SPEC-games.md`): `tins-lms-tests/acceptance/games/*` for AC-200 … AC-230,
   plus sample-pack fixtures and the Snek program corpus (AC-208 needs 120 programs with expected
   output). Wire the game rows into the gate the same way the v1 rows are.
2. `g-1` Snek interpreter and `g-2` engine/arcade/results — in parallel.
3. `g-3` Syntax Drop, `g-4` Whack-a-Bug, `g-5` Aftershock, `g-6` Snippet Sniper — in parallel.
4. `g-7` voxel kit + Maze Coder → `g-8` Complexity Garage, `g-9` Breakout slice → `g-10` rest.
5. `g-11` Seal the Beast (classroom raid).

Per task: `kit task new g-N --paths <scope>`, give the builder `tins-kit/orchestration/brief.tpl`
filled in (point it at SPEC-games.md sections instead of SPEC.md), keep one gate at a time
(`orchestration/job.sh`), then close and merge.

Open decisions for you: Java front end for Snek (D-G3, later); games 6–9 (conveyor factory,
pointer train yard, type tower defense, git platformer) after your research.

## 5. Other open items

- **Local test portability (fix first, as integration fix I-13):** `packages/web/test/{tele,board,foundation}.test.mjs`
  look for Chromium in `/opt/pw-browsers` (the cloud path) and crash when it is missing (7 unit-test
  failures on a fresh machine). Workaround: `sudo mkdir -p /opt/pw-browsers` (empty dir → Playwright's
  default browser is used). Fix: fall back to `chromium.launch()` when the folder does not exist, like
  `acceptance/lib/browser.mjs` already does.

- **AC-145**: give a fresh agent only `course/` and see whether it can rebuild v1 (not run yet).
- **Manual rows**: AC-118 (Android alarms, needs a phone build), AC-119 (DuckDNS renewal helper not
  built — README recommends Caddy instead).
- **v1.1 bugs**: stand-up "blocked" is a substring match ("I am not stuck" counts as blocked), plus
  the 10 bugs listed in `docs/build-journal/d-1.md` on `task/d-1` (blank first board page, appeal
  message wrong when score unchanged, phone first-run blank space, day 0/1 numbering, coordinator
  sees substitute buttons, staff 403 on `/api/classroom/my-status`, duplicate "Roster" nav, pair lab
  "pair" of five, imported day package only on File exchange, raw id in Lab results).
- **tins-kit knowledge transfer**: promote RF-21 … RF-31 (`tins-kit/FINDINGS.md`) into the kit and
  add `kit capture` / `kit harvest` so lessons are collected automatically next time.
- **v2 SPEC** (AI features etc.): after a short live trial of v1.

## 6. Not carried over (on purpose)

- The DSA class folder (premium content) — you have the zip.
- The recorded `.mp4` demo files (regenerate), container logs and builder transcripts.
