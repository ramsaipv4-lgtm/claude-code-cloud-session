# {{NAME}} — SPEC

What this is: a written work (novel, song, lecture, script…). Replace this line with one
paragraph on its purpose and audience.

## Decisions

| ID | Decision | Status |
|---|---|---|
| D-1 | Medium: Markdown files in content/, one file per part, read in file-name order | locked |
| D-2 | Every part starts with a level-1 title line | locked |
| D-3 | Total length at most 5000 words (change this row to change the limit; update checks/content.test.mjs) | locked |

## Acceptance

| ID | Criterion | Check |
|---|---|---|
| AC-1 | Each content/*.md starts with "# " and is not empty | checks/content.test.mjs |
| AC-2 | Total word count is within the D-3 limit | checks/content.test.mjs |
| AC-3 | A human reader judges the tone right for the audience | manual |
