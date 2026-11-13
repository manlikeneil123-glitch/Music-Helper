// The offline list: node tests/sw.test.mjs
// A duplicate makes Cache.addAll reject, so the app never works offline; a missing module breaks offline start-up.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const src = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
const list = [...src.slice(src.indexOf('SHELL'), src.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f.includes('.'));
const fails = [];
const dups = list.filter((f, i) => list.indexOf(f) !== i);
if (dups.length) fails.push(`listed twice: ${dups.join(', ')}`);
const missing = readdirSync(new URL('../app/js/', import.meta.url)).map((f) => `js/${f}`).filter((f) => !list.includes(f));
if (missing.length) fails.push(`not cached for offline: ${missing.join(', ')}`);
const gone = list.filter((f) => !existsSync(new URL(`../app/${f}`, import.meta.url)));
if (gone.length) fails.push(`listed but missing: ${gone.join(', ')}`);
fails.forEach((f) => console.log('FAIL ', f));
if (fails.length) process.exit(1);
console.log(`sw: ${list.length} files, no duplicates, every module cached`);
