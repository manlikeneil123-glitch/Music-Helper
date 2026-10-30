#!/usr/bin/env node
// Make the top entry of app/js/changelog.js the current version: writes app/js/version.js,
// the service worker's cache name, and CHANGELOG.md. Add the changelog entry first.
//   node tools/bump.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { CHANGES } from '../app/js/changelog.js';

const root = new URL('..', import.meta.url);
const { version } = CHANGES[0];
writeFileSync(new URL('app/js/version.js', root), `// Written by tools/bump.mjs from app/js/changelog.js. Don't edit by hand.\nexport const VERSION = '${version}';\n`);
const swUrl = new URL('app/sw.js', root);
writeFileSync(swUrl, readFileSync(swUrl, 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = 'stave-${version}';`));
const md = ['# Changelog', '', 'What changed in each version of Stave, in plain words. Written from `app/js/changelog.js`.', ''];
for (const c of CHANGES) md.push(`## ${c.version}: ${c.title} (${c.date})`, '', ...c.items.map((i) => `- ${i}`), '');
writeFileSync(new URL('CHANGELOG.md', root), md.join('\n'));
console.log(`Version ${version}`);
