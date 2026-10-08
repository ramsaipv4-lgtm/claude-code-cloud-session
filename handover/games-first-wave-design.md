# Games: the play layer (first wave design, for the owner's review)

**Why this exists.** The owner's requirement (2026-10-08): learners must be *invested*: a prologue,
cutscenes, and real game mechanics that are fun **on their own**, separate from the learning, so
anyone who plays is hooked. SPEC-games.md and the contract proposal describe the *learning* side well,
but each "game" there is a thin skin over an exercise. This document adds the **play layer** for the
first wave (Syntax Drop, Snippet Sniper, Whack-a-Bug, Aftershock) and the shared rules all games
follow. After the owner approves it, it is folded into the contract (§13) before tests are written.

---

## 1. Shared rules (all games)

### 1.1 Two layers, kept apart

| Layer | What it is | Who changes it | Changes per subject? |
|---|---|---|---|
| **Play** | world, story, characters, mechanics, music, progression, rewards | game code + **story data** (`story/<gameId>.json`) | **no** |
| **Learn** | the pack: pieces, snippets, programs, lines, tests, lesson cards | the trainer, by writing packs | **yes** |

- The play layer calls the learning layer only at named **challenge sockets** (e.g. "which slot does
  this piece fit", "which target prints this", "which line is the bug", "which slab comes next").
  A new subject = a new pack; the story, mechanics and rewards stay.
- **Two difficulty dials.** *Action* (speed, aim, timing, reflexes) and *Challenge* (which pack level).
  Assist mode lowers **only Action**. The trainer sets Challenge; the learner may set Action.
- **Two scores.** Every round reports **Skill** (action: timing, accuracy, combos, survival) and
  **Knowledge** (only the answers at challenge sockets). **Only Knowledge mistakes** become cards,
  error-notebook entries and mastery data. A learner with poor aim is never marked as not knowing a
  concept (e.g. missing the right target is an action miss; shooting the wrong target is a knowledge
  mistake).

### 1.2 One universe: the Codeverse

- **Premise:** the Codeverse is a world that runs on code. **The Glitch**, a corruption, is
  spreading; it scrambles syntax, plants bugs, collapses structures and hides inside creatures.
  Each game is a different **front** of the same war, so progress anywhere feels like one story.
- **Cast (recurring across games):**
  - **Ada**, the mentor, who briefs missions and delivers lesson cards *in character*;
  - **the player's avatar** (block-built, customizable);
  - **Null**, the Glitch's voice, who taunts and is the chapter bosses;
  - one local character per front (the Typesetter guild master, the Ridge ranger captain, the
    farmer Mo, the rescue pilot Kit).
- **Prologue** (first launch of the Games arcade, 60–90 s, in-engine):
  1. The Codeverse lit and working.
  2. The Glitch spreads: text scrambles, a tower collapses, a creature distorts.
  3. Ada finds the player.
  4. Avatar creation (3 choices: look, color, name tag).
  5. The map of fronts opens, which is the arcade.
- Each game's **first launch** plays a 30–45 s front intro. Each chapter (pack) ends with a 15–30 s
  cutscene, and its last level is a boss.
- **Cutscenes are in-engine scripts, not video** (keeps D-G2 and the budgets): a list of beats
  (`say`, `move`, `camera`, `wait`, `sfx`, `music`, `shake`, `spawn`, `fade`). Every scene can be
  **skipped** and **replayed** from the pause menu ("Story so far"). The text is in `en.json`
  (translatable). The scene scripts are data (`packages/games/story/*.json`), so a trainer could
  re-theme a front later without code.

### 1.3 Meta progression (why come back tomorrow)

- **Codeverse XP and coins**, earned in any game (Skill and Knowledge both pay).
- Coins buy **cosmetics** (avatar parts, trails, mallet/rifle/hammer skins) and **gear** that changes
  play (sniper scope zoom and stabilizer, whack mallet types, aftershock double-jump and dash, Syntax
  Drop fever length). Gear never answers a question for you.
- **Chapters unlock in order**; the trainer's pack release decides what exists. Bosses give a unique
  cosmetic.
- **Team banners:** a team's combined Codeverse progress shows on the celebration wall (team-level
  only, AC-206).
- **No dark patterns:** no random loot boxes, no streak-shaming, no "come back or lose it"; rewards are
  deterministic; a trainer can cap daily play time per class.

### 1.4 Feel ("juice"), required in every game

Hit-stop on success (40–80 ms), screen shake on impacts, particles, satisfying sounds (WebAudio,
synthesized), procedural music that intensifies with combo/stage, readable feedback within 100 ms of
any input, and a visible combo or streak. A short **"one more try"** loop: from failure back to play in
≤ 2 s.

---

## 2. The four first-wave games

### 2.1 Syntax Drop: front "Skyline"

- **Story:** the City of Markup's skyline is drawn from blueprints the Glitch has shredded. You're
  apprenticed to the Typesetters' Guild; every template you complete **rebuilds a building**, which
  rises in the background of the play area and stays there. Chapter boss: **Null's Glitch Tower**,
  where pieces fall to Null's music and the decoys mimic real syntax.
- **Core mechanic (rhythm game):** pieces fall **on the beat** of procedural music (BPM rises by
  stage).
  - Strike mode: hit the key on the beat. Fill mode: drop the piece onto its slot as it crosses the
    line.
  - Timing windows: Perfect / Good / Late.
  - **Combo meter → Fever**: double points, music layers in, the skyline lights up.
  - A **shield bar** instead of lives: action misses chip it, knowledge mistakes crack it.
- **Power-ups** (earned by combos, never answering a question): Slow-mo (3 s), Shield repair, Echo (the
  last placed piece replays its preview).
- **Sockets (Knowledge):** which key or slot a piece belongs to, and letting decoys pass. Timing is
  Skill only.
- **Hook:** the music plus the visible city you rebuilt; Fever; a "Perfect" streak counter.

### 2.2 Snippet Sniper: front "Ridgewatch"

- **Story:** you're a new ranger on the Ridge above Valley Town. Glitch beasts hide among the valley's
  creatures, each carrying a scroll of corrupted code; the town's **bounty board** posts what each
  beast's scroll prints. Ranger Captain Rook trains you; Null sends the **Glitch Colossus** (boss),
  whose armor plates are scrolls. You call shots for a squad pushing up the valley.
- **Core mechanic (sniping):**
  - Scope sway that **breathing** steadies (hold to steady, limited breath).
  - **Wind** (flags in the scene) and bullet drop on far targets: lead and hold over.
  - Targets move along paths and duck behind cover.
  - A **missed** shot alerts the herd, which scatters and hides for a few seconds.
  - Clean-hit bonus.
  - **Binoculars** to read the scrolls (no shooting while using them; a time cost).
- **Gear (coins):** scope zoom levels, a stabilizer (less sway), a suppressor (a miss alerts less),
  range-finder marks.
- **Sockets (Knowledge):** **choosing** the target whose snippet prints the bounty. Shooting a wrong
  target is a knowledge mistake. **Missing** the right target is a Skill miss (ammo spent, no concept
  mistake).
- **Hook:** the tension of the scope, a clean long shot, rank-ups with a cutscene, the Colossus fight.

### 2.3 Whack-a-Bug: front "Bugfield"

- **Story:** Farmer Mo grows programs as crops: each line is a crop row, and the harvest is the
  program's output. Glitch bugs burrow in and rot rows. You defend the field with a mallet; at night
  the **Bug Queen** (boss) sends armored bugs.
- **Core mechanic (arcade defense):**
  - Moles and bugs pop up holding a row's line.
  - A **tap** whacks a normal bug; armored bugs need a **charged smash** (hold, then release on time).
  - Fake-outs: a bug dips and re-emerges elsewhere.
  - Combos; a **golden bug** gives coins.
  - Day/night waves speed up.
  - Rot spreads visibly while the bug survives: the expected-vs-actual output panel is the **harvest
    sign**, and it wilts.
  - Whacking a healthy row **flattens that crop** (the line is deleted, the harvest gets worse).
- **Gear:** mallet types (wide, heavy, quick), **X-ray goggles** (a timed power-up that shows the
  bug's glow; this *is* the color hint, now earned and limited in hard mode), scarecrow (slows the
  pop-up rate).
- **Sockets (Knowledge):** which row is the bug; whacking a healthy row is a knowledge mistake. A bug
  that ducks away before you hit is Skill.
- **Hook:** the smash feel, the field visibly recovering, the night boss.

### 2.4 Aftershock: front "Faultline"

- **Story:** a quake has split Faultline City. You're on the rescue team with pilot Kit, leading
  trapped survivors to the helicopter on the roof. Building pieces (slabs) fall; the right slabs in
  the right order become a ramp or bridge. Null's aftershocks keep coming; the chapter boss is the
  **Collapse**: a tower falling floor by floor while you build.
- **Core mechanic (action platformer):**
  - Run, jump, later **double-jump** and **dash** (gear).
  - **Dodge falling debris**, which costs health (Skill).
  - Catch a slab; carrying it slows you (weight); place it at an indent (its horizontal offset).
  - Aftershocks shake the screen and knock loose wrongly placed slabs (and can knock *you* down).
  - Survivors follow you once a section is built; finishing plays the escape cutscene.
- **Sockets (Knowledge):** the order and indent of slabs, and rejecting decoy slabs. A finished stack
  that fails its tests is a knowledge mistake; getting hit by debris is Skill.
- **Hook:** movement that feels good, rescues (named survivors thank you), escape cutscenes.

---

## 3. What this changes in the contract (for the test writer)

1. **Status** gains `'story'`: a cutscene or dialogue is playing, and the game clock for play is
   stopped. `state().extra.scene = { id, beat, line } | null`.
2. **Actions:** `next` (advance a dialogue line) and `skip` (end the scene). The orchestrator and test
   writer pick keys that don't clash (Escape stays pause).
3. **Test mode:** `?story=off` skips all story (for the existing rows). Story gets its own rows:
   - the prologue plays on first launch, once per learner, and can be skipped and replayed;
   - a front intro plays on that game's first launch;
   - a chapter-end scene follows the last level of a pack;
   - the skip and replay controls work by keyboard and buttons.
4. **Scoring:** `gameResult` gains `skill` (number) and `knowledgeStars` (0–3). Stars and `mistakes[]`
   count **Knowledge only**. Cards, error notes and mastery use only `mistakes[]`. A new row checks
   that action misses never create cards.
5. **Meta progression:** a `player` document in the person database:
   `{ xp, coins, cosmetics[], gear[], seen: { prologue, intro:{gameId:true}, scenes:{id:true} }, avatar }`.
   Rows check that coins and XP persist across sessions, that gear changes play only (never answers),
   and that purchases are deterministic.
6. **Story data:** `packages/games/story/universe.json` and `story/<gameId>.json` hold scene scripts
   (beats). Text keys live in `en.json`. A story check (in `games check`) validates the scripts.
7. **Budgets (AC-200):** cutscenes and music add code. Proposal: 2D game chunk ≤ 80 KB (was 60), plus
   a shared `games-story` chunk ≤ 30 KB. Still no art or audio files.
8. **Per-game action tables** (13.T5) are redone from §2. Examples: sniper gains `breathe`
   (hold-to-steady) and `binoculars`; aftershock gains `jump` and `dash`; whack-a-bug gains `smash`
   (hold/release); syntax-drop's timing windows appear in `extra`.
9. **A manual row per game, the owner's playtest sign-off:** the owner plays each game for 10 minutes
   and confirms "I wanted to keep playing". **Fun can't be tested automatically, so this row stays
   manual and blocks the game's merge.**

## 4. Suggested build order (changes §G7)

Build **one game as a vertical slice first** (the engine plus story system plus Syntax Drop end to end,
including the prologue), and playtest it with the owner (and ideally 3–5 students) before building the
other three. The play layer is where the risk is; the learning layer is well specified.
