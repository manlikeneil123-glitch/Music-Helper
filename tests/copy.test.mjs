// Copy and release hygiene: node tests/copy.test.mjs
// No "…" in anything users read, no emoji (music signs like ♯ ♭ ♮ are notation, not
// emoji), no leftover test code, and one version number everywhere.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { CHANGES } from '../app/js/changelog.js';
import { VERSION } from '../app/js/version.js';

const root = new URL('../app/', import.meta.url);
const files = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
const source = files('').filter((f) => /\.(js|html|webmanifest|json)$/.test(f) && !f.startsWith('samples/'));

// Strip comments so notes for developers can say what they like.
const code = (text, file) => (file.endsWith('.js')
  ? text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')
  : text.replace(/<!--[\s\S]*?-->/g, ''));
const NOTATION = /[♯♭♮𝄪𝄫]/gu;

let n = 0;
const problems = [];
for (const f of source) {
  const raw = readFileSync(new URL(f, root), 'utf8');
  // Leftover markers usually live in comments, so check the raw file.
  raw.split('\n').forEach((line, i) => { if (/TEMP-DEV|devSeed|devBypass/.test(line)) problems.push(`${f}:${i + 1} has leftover test code`); });
  const text = code(raw, f);
  text.split('\n').forEach((line, i) => {
    if (line.includes('…')) problems.push(`${f}:${i + 1} uses "…": ${line.trim().slice(0, 80)}`);
    if (/\p{Extended_Pictographic}/u.test(line.replace(NOTATION, ''))) problems.push(`${f}:${i + 1} has an emoji: ${line.trim().slice(0, 80)}`);
  });
  n++;
}
assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
assert.ok(!existsSync(new URL('js/dev-seed.js', root)), 'dev seed file must not ship');

// One version: changelog top = version.js = service worker cache name.
assert.equal(VERSION, CHANGES[0].version, 'version.js matches the newest changelog entry (run node tools/bump.mjs)');
assert.ok(readFileSync(new URL('sw.js', root), 'utf8').includes(`const VERSION = 'stave-${VERSION}';`), 'service worker cache is named after the version (run node tools/bump.mjs)');
assert.ok(readFileSync(new URL('../CHANGELOG.md', root), 'utf8').includes(`## ${VERSION}:`), 'CHANGELOG.md is up to date (run node tools/bump.mjs)');
assert.ok(CHANGES.every((c) => c.items.every((i) => !/\p{Extended_Pictographic}|…/u.test(i))), 'changelog is plain text');
console.log(`copy: ${n} files clean, version ${VERSION}`);
