#!/usr/bin/env node
// Markdown → UpNote-style PDF. No new dependencies: uses `marked` and `playwright` from tins-lms/node_modules
// and the Chromium already installed under /opt/pw-browsers (never runs `playwright install`).
// Usage: node render.mjs <package-dir> [--out <pdf-dir>] [--skip dirA,dirB] [--only file.md] [--batch 8]
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// marked (markdown) and @playwright/test (PDF) are resolved from TINS_NODE_MODULES, else ./node_modules of the current folder.
const NODE_MODULES = process.env.TINS_NODE_MODULES || join(process.cwd(), 'node_modules');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const require = createRequire(join(NODE_MODULES, 'noop.js'));
const { marked } = await import(pathToFileURL(join(NODE_MODULES, 'marked/lib/marked.esm.js')).href);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, 'upnote.css'), 'utf8');

const args = process.argv.slice(2); const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const root = resolve(args.find((a, i) => !a.startsWith('--') && !['--out', '--skip', '--only', '--batch'].includes(args[i - 1])) || '.');
const outDir = resolve(opt('--out', join(root, 'pdf')));
const skip = new Set(['pdf', 'node_modules', ...(opt('--skip', '') || '').split(',').filter(Boolean)]);
const only = opt('--only', null); const BATCH = Number(opt('--batch', 8));

// ───── tiny syntax highlighter (Java / Python), UpNote colours ─────
const KW = {
  java: 'abstract boolean break byte case catch char class continue default do double else extends final finally float for if implements import int interface long new null package private protected public return short static super switch this throw throws try void while true false var',
  python: 'and as break class continue def del elif else except False finally for from global if import in is lambda None not or pass raise return True try while with yield print range len int str list dict set map input sorted min max sum enumerate zip reversed float',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlight(code, lang) {
  if (!KW[lang]) return esc(code);
  const kw = new Set(KW[lang].split(' '));
  const re = lang === 'java'
    ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')|\b(\d+(?:\.\d+)?L?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/g
    : /(#[^\n]*)|(f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/g;
  let out = ''; let last = 0; let m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index)); last = re.lastIndex;
    if (m[1]) out += `<span class="c">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="s">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="n">${esc(m[3])}</span>`;
    else if (m[4]) {
      const w = m[4]; const call = m[5] || '';
      if (kw.has(w)) out += `<span class="k">${w}</span>${esc(call)}`;
      else if (call) out += `<span class="f">${w}</span>${esc(call)}`;
      else if (/^[A-Z]/.test(w) && lang === 'java') out += `<span class="t">${w}</span>`;
      else out += w;
    }
  }
  return out + esc(code.slice(last));
}

const LABEL = { java: 'Java', python: 'Python 3' };
const KIND = { solution: '', faulty: 'faulty first — ', brute: 'brute force — ', template: 'template — ', run: '' };
marked.use({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const parts = (lang || '').trim().split(/\s+/); const l = parts[0] || 'text'; const kind = parts[1] && !parts[1].includes('=') ? parts[1] : '';
      let label = '';
      if (LABEL[l]) label = (KIND[kind] || '') + LABEL[l];
      else if (kind === 'tests') label = parts.some((p) => p.startsWith('for=') && p.endsWith('-ff')) ? 'What it really prints' : 'Tests — input lines separated by “ | ”';
      else if (kind === 'pattern' || kind === 'dots' || kind === 'output') label = 'Output';
      let body = LABEL[l] ? highlight(text, l) : esc(text);
      if (kind === 'tests') body = body.replace(/^(in:|out:)/gm, '<span class="io">$1</span>');
      const cls = kind === 'faulty' ? ' faulty' : kind === 'template' || kind === 'brute' ? ' muted' : '';
      return `<div class="code${cls}">${label ? `<div class="label ${l}">${label}</div>` : ''}<pre><code>${body}</code></pre></div>`;
    },
  },
});

function toHtml(md, title, compact) {
  md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  let html = marked.parse(md);
  html = html.replace(/<p>(═{8,})<\/p>/g, '<div class="rule">$1</div>');
  html = html.replace(/<blockquote>\s*<p>🧑‍🏫/g, '<blockquote class="trainer"><p>🧑‍🏫');
  html = html.replace(/<a href="([^"]+)\.md(#[^"]*)?"/g, (m, p, h) => (/^https?:/.test(p) ? m : `<a href="${p}.pdf${h || ''}"`));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body class="${compact ? 'compact' : ''}">${html}</body></html>`;
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n); const rel = relative(root, p).split('\\').join('/');
    if (n.startsWith('.') || skip.has(rel) || skip.has(n)) continue;
    if (statSync(p).isDirectory()) walk(p, out); else if (n.endsWith('.md')) out.push(rel);
  }
  return out;
}

const files = only ? [only] : walk(root).sort();
let done = 0;
for (let i = 0; i < files.length; i += BATCH) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  for (const rel of files.slice(i, i + BATCH)) {
    const md = readFileSync(join(root, rel), 'utf8');
    const title = (md.match(/^# (.+)$/m) || [, basename(rel, '.md')])[1];
    await page.setContent(toHtml(md, title, /cheat-sheet/.test(rel)), { waitUntil: 'load' });
    const target = join(outDir, rel.replace(/\.md$/, '.pdf'));
    mkdirSync(dirname(target), { recursive: true });
    await page.pdf({ path: target, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '20mm', right: '20mm' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#9a9a9a;text-align:center;font-family:Segoe UI,Liberation Sans,sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
    done++; console.log(`pdf ${relative(root, target)}`);
  }
  await browser.close();
}
console.log(`${done} PDF(s) written to ${relative(process.cwd(), outDir) || '.'}`);
