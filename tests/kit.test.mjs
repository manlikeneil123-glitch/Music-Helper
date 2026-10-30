// Recording kit pipeline: synthetic takes → labelled .zip → evaluate → tune.
// node tests/kit.test.mjs
import assert from 'node:assert/strict';
import { KIT_STEPS, truthFor } from '../app/js/kiteval.js';
import { zip, unzipStored } from '../app/js/zip.js';
import { encodeWav, THRESHOLDS } from '../app/js/micanalysis.js';
import { timeline } from '../app/js/score.js';
import { PIECES } from '../app/js/pieces.js';
import { SR, setSeed, gauss, synth } from './helpers/synth.mjs';
import { loadKit, evaluate, tune, decodeWav } from '../tools/evaluate-kit.mjs';

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };
setSeed(11);

// What the kit asks for is concrete and checkable.
const odeTl = timeline(PIECES.find((p) => p.id === 'ode-to-joy'));
const wrong = truthFor(KIT_STEPS.find((s) => s.id === 'ode-wrong'), odeTl);
ok(wrong.intended.filter((x) => x.kind === 'wrong').length === 2 && /Bar 2, beat 3: play F4 instead of E4/.test(wrong.instructions[0]), `wrong-note instructions name the notes (${wrong.instructions[0]})`);
const chordTl = timeline(PIECES.find((p) => p.id === 'chords-c'));
const cw = truthFor(KIT_STEPS.find((s) => s.id === 'chords-wrong'), chordTl);
ok(/rest of the chord/.test(cw.instructions[0]), 'chord mistake changes the middle note only');

// Every deliberate mistake in the kit points at a real note.
for (const step of KIT_STEPS.filter((s) => s.errors && PIECES.some((p) => p.id === s.piece))) {
  const tl = timeline(PIECES.find((p) => p.id === step.piece));
  const made = truthFor(step, tl).intended.filter((x) => x.kind !== 'correct').length;
  ok(made === step.errors.length, `${step.id}: all ${step.errors.length} mistakes land on a note (${made})`);
}

// Play the takes on the synthetic piano exactly as instructed.
const OFFSET = 0.5;
const steps = ['scale-slow', 'ode', 'ode-wrong', 'ode-skip', 'chords-wrong'].map((id) => KIT_STEPS.find((s) => s.id === id));
const files = [];
const takes = [];
for (const [k, step] of steps.entries()) {
  const piece = PIECES.find((p) => p.id === step.piece);
  const tl = timeline(piece);
  const { intended } = truthFor(step, tl);
  const mpb = 60000 / step.bpm;
  const jit = {};
  const notes = tl.map((x, i) => {
    const want = intended[i];
    if (want.kind === 'skip') return null;
    jit[x.event] ??= gauss() * 15;
    return { midi: want.play, on: (x.beat * mpb + jit[x.event]) / 1000, off: ((x.beat + x.beats * 0.95) * mpb) / 1000, vel: 0.6 };
  }).filter(Boolean);
  const dur = tl.reduce((a, x) => Math.max(a, ((x.beat + x.beats) * mpb) / 1000), 0);
  const samples = synth(notes, dur, { offsetSec: OFFSET });
  const file = `${String(k + 1).padStart(2, '0')}-${step.id}.wav`;
  files.push({ name: file, data: new Uint8Array(await encodeWav(samples, SR).arrayBuffer()) });
  takes.push({ step: step.id, file, piece: step.piece, bpm: step.bpm, beat0Sec: OFFSET, sampleRate: SR, intended });
}
const labels = { made: 'test', device: 'synthetic', calibration: { latencyMs: 0, tuningCents: 0 }, takes };
files.unshift({ name: 'labels.json', data: new TextEncoder().encode(JSON.stringify(labels)) });
const blob = zip(files);
const unzipped = unzipStored(new Uint8Array(await blob.arrayBuffer()));
if (process.env.KIT_OUT) (await import('node:fs')).writeFileSync(process.env.KIT_OUT, new Uint8Array(await blob.arrayBuffer()));
ok(unzipped.length === files.length && unzipped[0].name === 'labels.json', 'the zip round-trips');
ok(decodeWav(unzipped[1].data).samples.length > SR, 'wav round-trips');

const kit = loadKit(unzipped);
const ev = evaluate(kit);
const t = ev.total;
ok(t.right > 60 && t.mistakes === 5, `counts right notes and the 5 deliberate mistakes (${t.right}, ${t.mistakes})`);
ok(t.acceptRate >= 0.9, `synthetic right notes are accepted (${t.acceptRate.toFixed(2)})`);
ok(t.catchRate >= 0.8, `deliberate mistakes are caught (${t.catchRate.toFixed(2)})`);
ok(t.falseFlagRate <= 0.05, `few false alarms (${t.falseFlagRate.toFixed(3)})`);

// Tuning never makes things worse and stays within the search ranges.
const tuned = tune(kit, { rounds: 1, keys: ['present', 'wrongRatio'] });
ok(tuned.objective >= tuned.start, 'tuning does not get worse');
ok(tuned.thresholds.present >= 0.18 && tuned.thresholds.present <= 0.42 && tuned.thresholds.absent < tuned.thresholds.present, 'tuned thresholds stay sane');
ok(Object.keys(tuned.thresholds).length === Object.keys(THRESHOLDS).length, 'all thresholds reported');
console.log(`kit: ${n} checks passed (accepted ${Math.round(t.acceptRate * 100)}%, caught ${Math.round(t.catchRate * 100)}%, false alarms ${Math.round(t.falseFlagRate * 100)}%)`);
