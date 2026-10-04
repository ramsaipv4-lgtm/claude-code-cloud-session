import { writeFileSync } from 'node:fs';
const v = (n) => `## Verse ${n}\nThe tide comes in at number ${n}\nAnd carries salt across the sun\n`;
const c = '## Chorus\nOh sea, oh grey and patient sea\nYou keep the time for you and me\n';
writeFileSync('content/02-song.md', `# Patient Sea\n\n${v(1)}\n${c}\n${v(2)}\n${c}\n${v(3)}\n${c}`);
