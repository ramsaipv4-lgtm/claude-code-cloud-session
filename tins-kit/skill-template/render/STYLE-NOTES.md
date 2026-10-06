# Style notes — the trainer's UpNote format

Studied: 8 of the 46 UpNote PDF exports (Queue using Two Stacks, Poisonous Plants worked example,
Two Sum worked example, Java Crash Course Day 1 and Day 2 primers, Self-introduction script,
Monotonic stack practice, Snake and Ladder escalation). This file says what the class package
copies from them, so every markdown file and every PDF looks like the trainer's own notes.

## Page and type

| Element | UpNote look | What we reproduce |
|---|---|---|
| Page | A4, white, wide side margins (about 12% each side), no header or footer | A4, 22 mm side margins, no running header, small page number only |
| Body text | Humanist sans (Segoe UI), ~11 pt, dark grey, very airy line height (~1.8) | `Segoe UI, Open Sans, Liberation Sans`, 10.5 pt, line height 1.75, `#222` |
| Title (H1) | Large regular-weight title, **framed above and below by a box-drawing rule** `══════` about half the page wide | H1 at 23 pt, weight 500; a `══════` line before and after it |
| Section (H2) | 17–18 pt, weight 500, no colour; some have a thin grey rule under them | same; thin `#ddd` rule under H2 |
| Labels | Bold run-in labels: **Description:**, **Common mistake:**, **Say while drawing:**, **Poll**, `F1 — …` numbered sections | Bold run-in labels: **Read it:**, **Common mistake:**, **Ask the class:**; numbered sub-steps `①…⑨` per pattern |
| Bracket tags | `[JIT-1: term] … [END JIT-1]`, `[PLATFORM: …]` in bold | `[JIT: term] … [END JIT]` for a just-in-time explanation of a new term |

## Code and output

- Code blocks: light grey fill `#f3f3f3`, 1 px `#ddd` border, 6 px radius, monospace ~9.5 pt,
  generous line height. Syntax colours as UpNote's: keywords/types **purple** (`#a626a4`-ish),
  method names **blue** (`#2a3fd1`), strings **red** (`#c41a16`), comments **green** (`#1e7b1e`),
  numbers dark green.
- Inline code: red text `#c7254e` on a pale grey pill — used for every variable, loop bound and
  formula (`n - i`, `2*i - 1`).
- Plain-text drawings (traces, ASCII boards, patterns) go in the same grey block. We keep them
  monospaced so spaces line up — this matters for patterns.

## Callouts and emphasis

- Emoji-led callouts in bold: 🔍 IN PLAIN ENGLISH, 🌍 REAL-WORLD ANALOGY, ⚡ THE KEY INSIGHT,
  🎯 WHAT AN INTERVIEWER WANTS TO HEAR, ❌ wrong / ✅ right. We use ⚡ (key insight), 🎯 (exam
  angle), ❌/✅ (wrong vs right), 🧑‍🏫 (trainer note), ⏱ (time).
- Blockquotes are rare in UpNote; we render `>` blocks as a soft tinted callout with a left bar,
  so trainer notes stand out from student text.

## Tables

Plain grid: 1 px light-grey borders, bold header row with **no fill**, roomy cell padding,
left-aligned text. Glossary tables are narrow (two columns, ~60% width). We use tables for the
dry runs (`i | x | map after`), recognition cues and the quick-reference tables.

## Density and flow

- One topic per block, introduced by a one-line "what it is" then the example, then the trap.
- Sections are numbered and predictable (F1 … F14 in the trainer's notes). Our pattern lessons open with the
  same three numbered parts (① recognition cue → ② brute force and why it fails → ③ template), then every PDF
  problem follows a fixed order (statement → example → approach → dry run → Java → Python → complexity and edge
  cases → tests → faulty first → recall cards) plus a trainer note, so the trainer always knows where they are.
- Short paragraphs, plenty of white space, no colour bands or sidebars.
- A `══════` divider separates major units (one pattern from the next), as in the trainer's notes.
