#!/usr/bin/env node
// Accuracy test for photo scanning, run before switching SCAN_ENABLED on.
// Uses the same model and instructions as supabase/functions/scan-score.
//
//   npm i --no-save @anthropic-ai/sdk
//   ANTHROPIC_API_KEY=... node tools/scan-eval.mjs path/to/photos
//
// The folder holds pairs: minuet.jpg (a phone photo of one printed page) and
// minuet.musicxml (the same page typed in MuseScore, exported as MusicXML: the truth).
// For each pair it scans the photo and scores note by note: a note counts as right
// when the bar, the beat within it and the pitch all match. Passes at 95% or better
// on every photo. Prints the cost per page from the token counts.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { SCAN_MODEL, SCAN_SYSTEM, SCAN_ASK } from '../supabase/functions/_shared/scan-prompt.js';
import { scnToMusicXML } from '../app/js/scnformat.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { normalize, barMap } from '../app/js/score.js';

const PASS = 0.95;
const PRICE = { input: 0.10 / 1e6, output: 0.50 / 1e6 }; // $ per token for the scan model; check current pricing
const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error('usage: node tools/scan-eval.mjs <folder of photo + .musicxml pairs>');
  process.exit(2);
}
const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => {
  console.error('Install the SDK first: npm i --no-save @anthropic-ai/sdk');
  process.exit(2);
});
const client = new Anthropic();
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// "bar|beat-in-bar|midi" for every sounding note (ties already merged by the importer).
function keys(piece) {
  const s = normalize(piece);
  const map = barMap(s);
  return s.notes.filter((n) => !n.tieStop && !n.grace).map((n) => {
    const bar = map.indexAt(n.beat);
    return `${bar}|${Math.round((n.beat - map.starts[bar]) * 8) / 8}|${n.midi}`;
  });
}
function score(truth, got) {
  const pool = new Map();
  for (const k of got) pool.set(k, (pool.get(k) ?? 0) + 1);
  let hit = 0;
  for (const k of truth) if (pool.get(k)) { hit++; pool.set(k, pool.get(k) - 1); }
  const recall = truth.length ? hit / truth.length : 0;
  const precision = got.length ? hit / got.length : 0;
  return { recall, precision, f1: recall + precision ? (2 * recall * precision) / (recall + precision) : 0 };
}

const photos = readdirSync(dir).filter((f) => TYPES[extname(f).toLowerCase()]);
if (!photos.length) { console.error('No photos (.jpg, .png, .webp) in that folder.'); process.exit(2); }
let allPass = true;
let spend = 0;
for (const f of photos) {
  const truthFile = join(dir, `${basename(f, extname(f))}.musicxml`);
  if (!existsSync(truthFile)) { console.log(`skip  ${f}: no ${basename(truthFile)}`); continue; }
  const truth = keys(parseMusicXML(readFileSync(truthFile, 'utf8'), { id: 'truth' }));
  const t0 = Date.now();
  const msg = await client.messages.create({
    model: SCAN_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    system: SCAN_SYSTEM,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: TYPES[extname(f).toLowerCase()], data: readFileSync(join(dir, f)).toString('base64') } },
      { type: 'text', text: SCAN_ASK },
    ] }],
  });
  const cost = msg.usage.input_tokens * PRICE.input + msg.usage.output_tokens * PRICE.output;
  spend += cost;
  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
  let got = [];
  let note = '';
  try {
    got = keys(parseMusicXML(scnToMusicXML(text.slice(Math.max(0, text.indexOf('SCN1')))), { id: 'scan' }));
  } catch (e) {
    note = ` (unreadable: ${e.message})`;
  }
  const r = score(truth, got);
  const pass = r.f1 >= PASS;
  allPass &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${f}: ${(r.f1 * 100).toFixed(1)}% right (found ${(r.recall * 100).toFixed(0)}% of ${truth.length} notes, ${(r.precision * 100).toFixed(0)}% of its ${got.length} correct), ${((Date.now() - t0) / 1000).toFixed(0)} s, $${cost.toFixed(4)}${note}`);
}
console.log(`\nTotal $${spend.toFixed(4)}. ${allPass ? `Every page at ${PASS * 100}%+: safe to set SCAN_ENABLED = true.` : `Not good enough yet: keep SCAN_ENABLED = false.`}`);
process.exit(allPass ? 0 : 1);
