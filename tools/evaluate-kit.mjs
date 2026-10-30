#!/usr/bin/env node
// Score a recording kit from a real piano, and (with --tune) search for microphone
// thresholds that work better on it.
//
//   node tools/evaluate-kit.mjs mic-kit-2026-11-02.zip          # how the current settings do
//   node tools/evaluate-kit.mjs mic-kit-2026-11-02.zip --tune   # and what to change
//
// Accepts the .zip the app downloads, or a folder with labels.json and the .wav files.
// Tune on several kits (different pianos and phones) before changing THRESHOLDS in
// app/js/micanalysis.js: one piano can mislead.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipStored } from '../app/js/zip.js';
import { scoreTake, summariseTakes } from '../app/js/kiteval.js';
import { analyseAudio, THRESHOLDS } from '../app/js/micanalysis.js';
import { analyse } from '../app/js/analysis.js';
import { timeline } from '../app/js/score.js';
import { PIECES } from '../app/js/pieces.js';
import { parseMusicXML } from '../app/js/musicxml.js';

const here = new URL('..', import.meta.url);
const library = () => [
  ...PIECES,
  parseMusicXML(readFileSync(new URL('app/scores/octave-study.musicxml', here), 'utf8'), { id: 'octave-study' }),
];

/** 16-bit PCM WAV (as the app writes) → { samples: Float32Array, sampleRate }. */
export function decodeWav(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(...bytes.subarray(o, o + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
  let p = 12;
  let rate = 44100;
  let channels = 1;
  while (p + 8 <= bytes.length) {
    const id = tag(p);
    const size = v.getUint32(p + 4, true);
    if (id === 'fmt ') {
      channels = v.getUint16(p + 10, true);
      rate = v.getUint32(p + 12, true);
    } else if (id === 'data') {
      const n = Math.floor(size / 2 / channels);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let c = 0; c < channels; c++) s += v.getInt16(p + 8 + (i * channels + c) * 2, true);
        out[i] = s / channels / 32768;
      }
      return { samples: out, sampleRate: rate };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error('WAV has no data');
}

/** Read a kit from a .zip path, a folder path, or [{ name, data }] already in memory. */
export function loadKit(source) {
  let files;
  if (Array.isArray(source)) files = source;
  else if (statSync(source).isDirectory()) {
    const labels = JSON.parse(readFileSync(join(source, 'labels.json'), 'utf8'));
    files = [{ name: 'labels.json', data: new TextEncoder().encode(JSON.stringify(labels)) }, ...labels.takes.map((t) => ({ name: t.file, data: readFileSync(join(source, t.file)) }))];
  } else files = unzipStored(readFileSync(source));
  const byName = new Map(files.map((f) => [f.name, f.data]));
  const labels = JSON.parse(new TextDecoder().decode(byName.get('labels.json')));
  const pieces = library();
  const takes = labels.takes.filter((t) => t.piece).map((t) => {
    const piece = pieces.find((p) => p.id === t.piece);
    if (!piece) throw new Error(`Unknown piece ${t.piece}`);
    return { ...t, piece, tl: timeline(piece), audio: decodeWav(byName.get(t.file)) };
  });
  const silence = labels.takes.find((t) => t.step === 'silence');
  return { labels, takes, silence: silence ? decodeWav(byName.get(silence.file)) : null };
}

export function evaluate(kit, thresholds = THRESHOLDS) {
  const cal = kit.labels.calibration ?? {};
  const results = kit.takes.map((t) => {
    const msPerBeat = 60000 / t.bpm;
    const mic = analyseAudio({ samples: t.audio.samples, sampleRate: t.audio.sampleRate, expected: t.tl, msPerBeat, beat0Sec: t.beat0Sec, latencyMs: cal.latencyMs ?? 120, tuningCents: cal.tuningCents ?? 0, thresholds });
    const r = analyse({ expected: t.tl, played: mic.played, unclear: mic.unclear, spread: mic.spread, msPerBeat, beatsPerBar: t.piece.beatsPerBar, source: 'mic', score: t.piece });
    return { step: t.step, ...scoreTake(r.notes, t.intended) };
  });
  return { results, total: summariseTakes(results) };
}

// One threshold at a time, a few rounds, keeping whatever scores best: far cheaper than
// a full grid, and the thresholds barely interact.
const SEARCH = {
  present: [0.18, 0.21, 0.24, 0.27, 0.3, 0.33, 0.36, 0.39, 0.42],
  absent: [0.06, 0.09, 0.12, 0.15, 0.18],
  wrongNeighbour: [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6],
  wrongRatio: [1.8, 2.2, 2.6, 3.0, 3.4],
  minTonal: [2.5, 3, 4, 5, 6],
  minSustain: [0.04, 0.06, 0.08, 0.12, 0.16],
};
export function tune(kit, { rounds = 2, keys = Object.keys(SEARCH) } = {}) {
  let best = { ...THRESHOLDS };
  let bestScore = evaluate(kit, best).total.objective;
  const start = bestScore;
  for (let round = 0; round < rounds; round++) {
    let improved = false;
    for (const key of keys) {
      for (const value of SEARCH[key]) {
        if (value === best[key]) continue;
        const trial = { ...best, [key]: value };
        if (trial.absent >= trial.present) continue;
        const score = evaluate(kit, trial).total.objective;
        if (score > bestScore + 1e-9) {
          best = trial;
          bestScore = score;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return { thresholds: best, objective: bestScore, start };
}

const pct = (x) => `${Math.round(x * 100)}%`;
function report(kit, ev, title) {
  const lines = [`## ${title}`, '', '| Take | Right notes accepted | False alarms | Mistakes caught |', '|---|---|---|---|'];
  for (const r of ev.results) lines.push(`| ${r.step} | ${r.accepted}/${r.right} | ${r.falseFlags}${r.flagged.length ? ` (${r.flagged.slice(0, 3).join('; ')})` : ''} | ${r.mistakes ? `${r.caught}/${r.mistakes}` : '–'} |`);
  const t = ev.total;
  lines.push('', `**Overall:** accepted ${pct(t.acceptRate)}, false alarms ${pct(t.falseFlagRate)}, unclear ${t.unclear}, mistakes caught ${pct(t.catchRate)}.`);
  return lines.join('\n');
}

async function main() {
  const [path, ...flags] = process.argv.slice(2);
  if (!path) {
    console.log('Usage: node tools/evaluate-kit.mjs <mic-kit.zip | folder> [--tune]');
    process.exit(1);
  }
  const kit = loadKit(path);
  console.log(`# Recording kit: ${kit.labels.made ?? '?'}\n\nDevice: ${kit.labels.device ?? '?'}\nCalibration: ${JSON.stringify(kit.labels.calibration ?? null)}\nTakes: ${kit.takes.length}`);
  if (kit.silence) {
    const s = kit.silence.samples;
    const rms = Math.sqrt(s.reduce((a, x) => a + x * x, 0) / Math.max(1, s.length));
    console.log(`Room noise: ${(20 * Math.log10(Math.max(rms, 1e-9))).toFixed(1)} dBFS`);
  }
  console.log(`\n${report(kit, evaluate(kit), 'With the current thresholds')}`);
  if (flags.includes('--tune')) {
    const t = tune(kit, { rounds: 3 });
    console.log(`\n${report(kit, evaluate(kit, t.thresholds), 'With tuned thresholds')}\n\nSuggested THRESHOLDS (objective ${t.start.toFixed(3)} → ${t.objective.toFixed(3)}):\n\n${JSON.stringify(t.thresholds, null, 2)}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
