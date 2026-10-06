# Variant `dsa-patterns` (exam paper / question bank → pattern lessons for live teaching)

For a trainer who teaches DSA problem-solving patterns live, in one or more days, in the UpNote style
described in `STYLE-NOTES.md`. Built for the HCLTech one-day class (7 Oct 2026); reusable for any topic
whose problems can be grouped by technique.

```
<package>/
├── manifest.json          ← lessons (id, title, technique, file, practice, key, pdf_problems, must, est_minutes),
│                            pdf_problems, pdf_techniques, files{}, teaching_minutes, skip_dirs
├── README.md              ← hand-written, but the lesson table between <!-- lessons:start/end --> is generated
├── STYLE-NOTES.md         ← the look every page and PDF copies
├── 00-day-plan.md         ← timed table "| Clock | Min | Block | … |" (minutes must add up to teaching_minutes ±10%),
│                            must-teach vs if-time, faster/slower lists, diagnostic levels
├── 01-diagnostic.md       ← 6–8 "## Task N", "## Quick version …", "## How to score …"
├── lessons/NN-<pattern>.md      ← templates/dsa_lesson.md
├── practice/NN-<pattern>-practice.md   ← templates/dsa_practice.md (no solutions)
├── answer-keys/NN-<pattern>-key.md     ← templates/dsa_key.md (faulty outputs, extra-practice solutions)
├── answer-keys/01-diagnostic-key.md, mock-round-key.md, homework-key.md
├── mock-round.md · cheat-sheet.md · homework.md
└── pdf/                   ← render/render.mjs output, same paths
```

## Principles kept from v2.0

Answer key for every activity · faulty first · recall cards (`**Q:**` / `**A:**`) · trainer note per teaching
unit · load budget (objectives ≤ 4, new terms ≤ 8, reading load checked against `est_minutes`) · no broken
links · every code fence has a language · dated claims carry "as of" · one gate, no skips.

## What is new

1. **Every program runs.** Solutions are complete programs that read stdin and print the answer, like a
   judge. The checker runs each one against every test with its id, in both languages.
2. **Code-fence conventions** (the checker relies on them):

   | Fence | Meaning | Run? |
   |---|---|---|
   | ` ```java solution id=pdf03 ` / ` ```python solution id=pdf03 ` | the answer | yes, against `tests for=pdf03` |
   | ` ```python faulty id=pdf03-ff ` | the faulty-first attempt | yes, against `tests for=pdf03-ff` (in the key); must differ from the solution |
   | ` ```text tests for=pdf03 ` | `in: a | b` / `out: x | y` pairs; ` | ` separates lines; flag `dots` shows spaces as `·` | — |
   | ` ```java brute `, ` ```java template ` | illustration only | no |

3. **Fixed lesson shape:** `## ① Recognition cue`, `## ② Brute force…`, `## ③ The template`, then one
   `## Problem N — title` per problem with `### Statement`, `### Example and input format`, `### Approach`,
   `### Dry run` (a table), `### Java solution`, `### Python solution`, `### Complexity and edge cases`,
   `### Tests` (≥ 3: the example + edge cases), `### Faulty first`, `### Recall cards`, and a
   `> 🧑‍🏫 **Trainer note** — ⏱ N min.` line; then `## Extra practice` and `## Next`.
4. **Priorities:** every problem is marked `**MUST TEACH**` or `*IF TIME PERMITS*`, matching `manifest.json`.
5. **Coverage:** every problem in `pdf_problems` and every technique in `pdf_techniques` must have a lesson.

## The gate (`checks/check.mjs`)

| # | Check |
|---|---|
| 1 | required files exist (manifest `files`, every lesson / practice / key) |
| 2 | every `.md`/`.json` is listed in the manifest; README lesson table equals the generated one |
| 3 | diagnostic has 6–8 tasks, a quick version and scoring; the key covers every task |
| 4 | day-plan minutes add up to `teaching_minutes` ±10% |
| 5 | no broken relative links |
| 6 | every code fence has a language tag |
| 7 | coverage: each problem once, each technique has a lesson, priorities match the manifest |
| 8 | recall cards parse (matching Q/A) for every problem |
| 9 | lesson and problem sections present and in order; dry-run table; trainer note |
| 10 | exactly one Java and one Python solution per problem; brute force and template in both languages |
| 11 | load budget (objectives, new terms, reading load ≤ 3 × est_minutes) |
| 12 | every program has tests, every test block has a program, faulty-first answered in the key, extra practice solved in the key, no solutions on worksheets |
| 13 | **execution:** every Java and Python program prints exactly the expected output for every test; faulty programs differ from the solution |
| 14 | dated claims carry "as of" |

`node checks/check.mjs <package> [--no-run] [--write-readme] [--json]`. Tests: `node --test checks/check.test.mjs`.

## Sub-variant: printing patterns

The first version of this variant taught *printing* patterns (stars/numbers/letters) with a nine-part
lesson (draw → read → row table → trace → Java → Python → mistakes → faulty first → recall). That package and
its own gate are kept as the day-0 set in `../day-0-printing-patterns/` (`checks/check.mjs` there, which
also compares drawings with the question bank via `--bank`). Use it as the template for warm-up material.
