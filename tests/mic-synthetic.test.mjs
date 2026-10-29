import { analyseAudio, measureLatency, estimateTuning, firstOnsetSec } from '../app/js/micanalysis.js';
import { analyse } from '../app/js/analysis.js';
import { PIECES as BUILT_IN, timeline } from '../app/js/pieces.js';
const PIECES = [...BUILT_IN];
import { midiName } from '../app/js/music.js';

const SR = 44100;
let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return (s - 3) / 1.2; };

// Synthetic-audio regression tests for microphone checking: node tests/mic-synthetic.test.mjs
// Synthetic audio is cleaner than a real piano, so passing here is necessary, not sufficient.

// Crude piano: inharmonic partials, per-partial decay, hammer noise, damper on release.
function synth(notes, durSec, { cents = 0, noise = 0.002, pedal = false, offsetSec = 0.5 } = {}) {
  const out = new Float32Array(Math.ceil((durSec + offsetSec + 2) * SR));
  for (const n of notes) {
    const f0 = 440 * 2 ** ((n.midi - 69 + (cents + gauss() * 3) / 100) / 12);
    const start = Math.round((n.on + offsetSec) * SR);
    const end = pedal ? out.length : Math.round((n.off + offsetSec) * SR);
    const B = 3e-4, vel = n.vel ?? 0.7;
    for (let h = 1; h <= 12; h++) {
      const f = h * f0 * Math.sqrt(1 + B * h * h);
      if (f > SR / 2.2) break;
      const amp = vel * (1 / h) * (h % 2 ? 1 : 0.75) * (0.6 + 0.4 * rand());
      const decay = 0.6 + 0.5 * h, ph = rand() * 6.28;
      for (let i = start; i < out.length; i++) {
        const t = (i - start) / SR;
        let env = Math.exp(-decay * t) * Math.min(1, t / 0.003);
        if (i > end) env *= Math.exp(-((i - end) / SR) / 0.06);
        if (t > 0.01 && env < 1e-4) break;
        out[i] += 0.15 * amp * env * Math.sin(6.2832 * f * t + ph);
      }
    }
    for (let i = start; i < start + 0.01 * SR && i < out.length; i++) out[i] += 0.05 * vel * gauss() * Math.exp(-(i - start) / (0.003 * SR));
  }
  for (let i = 0; i < out.length; i++) out[i] += noise * gauss();
  return out;
}

// jitterMs: timing error of each note/chord. spreadMs: how far apart the notes of
// one chord land (players never hit them all at exactly the same instant).
function perform(piece, bpm, { tweak = (n) => n, jitterMs = 20, spreadMs = 8, ...opts } = {}) {
  const mpb = 60000 / bpm;
  const tl = timeline(piece);
  const eventJitter = {};
  const notes = tl.map((n) => {
    eventJitter[n.event] ??= gauss() * jitterMs;
    const j = eventJitter[n.event] + Math.abs(gauss()) * spreadMs;
    return tweak({ midi: n.midi, on: (n.beat * mpb + j) / 1000, off: ((n.beat + n.beats * 0.95) * mpb) / 1000, vel: 0.5 + rand() * 0.4, i: n.i, event: n.event });
  }).filter(Boolean);
  const dur = tl.reduce((a, n) => Math.max(a, (n.beat + n.beats) * mpb / 1000), 0);
  return { samples: synth(notes, dur, opts), mpb, tl, offset: opts.offsetSec ?? 0.5 };
}

let failures = 0;
let lastMic = null;
function run(name, pieceId, bpm, opts = {}, analyseOpts = {}, expect = []) {
  seed = Number(process.env.SEED || 7); // each case is independent and repeatable
  const piece = PIECES.find((p) => p.id === pieceId);
  const { samples, mpb, tl, offset } = perform(piece, bpm, opts);
  const beat0 = analyseOpts.useFirstOnset ? firstOnsetSec(samples, SR) : offset;
  const mic = (lastMic = analyseAudio({ samples, sampleRate: SR, expected: tl, msPerBeat: mpb, beat0Sec: beat0, latencyMs: analyseOpts.latencyMs ?? 0, tuningCents: analyseOpts.tuningCents ?? 0 }));
  const r = analyse({ expected: tl, played: mic.played, unclear: mic.unclear, spread: mic.spread, msPerBeat: mpb, beatsPerBar: piece.beatsPerBar, source: 'mic' });
  const bad = r.notes.filter((n) => n.status !== 'correct').map((n) => `${midiName(n.midi)}@b${n.bar}.${n.beatInBar}:${n.status}${n.playedMidi && n.playedMidi !== n.midi ? '→' + midiName(n.playedMidi) : ''}`);
  const ok = JSON.stringify(bad) === JSON.stringify(expect);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}` + (ok ? '' : `\n      expected: ${expect.join(', ') || '(all correct)'}\n      got:      ${bad.join(', ') || '(all correct)'}`));
  return r;
}

const chordWrong = (n) => (n.event === 0 && n.midi === 64 ? { ...n, midi: 65 } : n); // E4→F4 in first chord
const chordMissing = (n) => (n.event === 3 && n.midi === 69 ? null : n); // drop A4 from 4th chord
const odeWrong = (n) => (n.i === 3 ? { ...n, midi: 69 } : n.i === 9 ? null : n); // G4→A4, drop a C4

const soft = (n) => ([62, 64, 65].includes(n.midi) ? { ...n, vel: 0.15 } : { ...n, vel: 0.9 }); // quiet middle voice
const wrongC = (n) => (n.event === 6 && n.midi === 60 ? { ...n, midi: 62 } : n); // last chord C→D
const octave = (n) => (n.event === 2 && n.midi === 69 ? { ...n, midi: 81 } : n); // A4 played as A5
const skipChord = (n) => (n.event === 1 ? null : n); // 2nd chord not played

// Correct performances must come out 100% correct — a false "wrong" is the worst failure.
run('chords correct', 'chords-c', 72);
run('chords: sustain pedal', 'chords-c', 72, { pedal: true });
run('chords: piano 30 cents flat, uncalibrated', 'chords-c', 72, { cents: -30 });
run('chords: piano 30 cents flat, calibrated', 'chords-c', 72, { cents: -30 }, { tuningCents: -30 });
run('chords: background noise', 'chords-c', 72, { noise: 0.02 });
run('chords: quiet middle voice', 'chords-c', 72, { tweak: soft });
run('chords: sloppy timing (60 ms jitter)', 'chords-c', 72, { jitterMs: 60 });
run('chords: notes not together (up to ~90 ms apart)', 'chords-c', 72, { spreadMs: 40 });
{
  // Coaching hint, best-effort: chords spread by less than ~30 ms can't be separated.
  console.log(`INFO  chords: "not together" reported for ${lastMic.spread.length} of 7 chords`);
}
run('chords: slow (54 bpm), aligned on first note', 'chords-c', 54, {}, { useFirstOnset: true });
run('melody correct', 'ode-to-joy', 90);
run('melody: sustain pedal', 'ode-to-joy', 90, { pedal: true });
run('scale correct at 100 bpm', 'c-scale', 100);

// Mistakes must be caught and named.
run('chords: E→F in first chord', 'chords-c', 72, { tweak: chordWrong }, {}, ['E4@b1.1:wrong→F4']);
run('chords: C→D in last chord', 'chords-c', 72, { tweak: wrongC }, {}, ['C4@b4.1:wrong→D4']);
run('chords: A4 played an octave up', 'chords-c', 72, { tweak: octave }, {}, ['A4@b2.1:wrong→A5']);
run('chords: A4 left out', 'chords-c', 72, { tweak: chordMissing }, {}, ['A4@b2.3:missed']);
run('chords: 2nd chord skipped, pedal held', 'chords-c', 72, { tweak: skipChord, pedal: true }, {}, ['C4@b1.3:missed', 'E4@b1.3:missed', 'G4@b1.3:missed']);
run('melody: G→A and a missed C', 'ode-to-joy', 90, { tweak: odeWrong }, {}, ['G4@b1.4:wrong→A4', 'C4@b3.2:missed']);

// ---- Harder (Grade 5–8) textures ---------------------------------------------
const [C2, G2, C3, G3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, G5, C6] = [36, 43, 48, 55, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 79, 84];
const scaleRun = [C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, D5, C5, B4, A4, G4, F4];
PIECES.push(
  { id: 'big', beatsPerBar: 4, notes: [[[C2, C3, E4, G4, C5], 2], [[G2, G3, D4, G4, B4], 2], [[C2, C3, E4, G4, C5], 2], [[G2, G3, D5, G5, B4], 2], [[C2, C3, E5, G5, C6], 4]] },
  { id: 'fast', beatsPerBar: 4, notes: [...scaleRun, ...scaleRun].map((m) => [m, 0.25]) },
  { id: 'octaves', beatsPerBar: 4, notes: [...scaleRun, ...scaleRun].map((m) => [[m - 12, m], 0.25]) },
  { id: 'texture', beatsPerBar: 4, notes: [
    [[C3, E5], 0.5], [G3, 0.5], [E4, 0.5], [G3, 0.5], [[C3, G5], 0.5], [G3, 0.5], [E4, 0.5], [G3, 0.5],
    [[G2, D5], 0.5], [D4, 0.5], [F4, 0.5], [D4, 0.5], [[C3, C5], 0.5], [G3, 0.5], [E4, 0.5], [G3, 0.5]] },
);
// Flagged = the analyser reports *something* wrong at that note (wrong or missed).
function flags(name, pieceId, bpm, opts, where) {
  seed = Number(process.env.SEED || 7);
  const piece = PIECES.find((p) => p.id === pieceId);
  const { samples, mpb, tl, offset } = perform(piece, bpm, opts);
  const mic = analyseAudio({ samples, sampleRate: SR, expected: tl, msPerBeat: mpb, beat0Sec: offset });
  const r = analyse({ expected: tl, played: mic.played, unclear: mic.unclear, msPerBeat: mpb, beatsPerBar: 4, source: 'mic' });
  const bad = r.notes.filter((n) => n.status !== 'correct').map((n) => `${midiName(n.midi)}@b${n.bar}.${n.beatInBar}:${n.status}`);
  const ok = bad.some((b) => b.startsWith(where));
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      expected a flag at ${where}, got: ${bad.join(', ') || '(all correct)'}`}`);
}
run('advanced: 5-note two-hand chords with LH octaves', 'big', 72);
run('advanced: 5-note chords, sustain pedal', 'big', 72, { pedal: true });
run('advanced: 16ths at 144 bpm', 'fast', 144);
run('advanced: both hands in octaves, 16ths', 'octaves', 120);
run('advanced: melody over pedalled accompaniment', 'texture', 80, { pedal: true });
flags('advanced: wrong note inside a 5-note chord', 'big', 72, { tweak: (n) => (n.event === 0 && n.midi === E4 ? { ...n, midi: F4 } : n) }, 'E4@b1.1');
flags('advanced: bass note left out', 'big', 72, { tweak: (n) => (n.event === 0 && n.midi === C2 ? null : n) }, 'C2@b1.1');
flags('advanced: wrong note in a fast run', 'fast', 120, { tweak: (n) => (n.i === 4 ? { ...n, midi: A4 } : n) }, 'G4@b1.2');
flags('advanced: wrong melody note over pedalled accompaniment', 'texture', 80, { pedal: true, tweak: (n) => (n.midi === D5 ? { ...n, midi: E5 } : n) }, 'D5@b2.1');
// Known limit, not asserted: a wrong UPPER note of an octave pair is usually missed by the mic.

// Calibration
const clicks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const clickAudio = synth(clicks.map((c) => ({ midi: 96, on: c + 0.18, off: c + 0.23, vel: 1 })), 4, { offsetSec: 0 });
const lat = measureLatency(clickAudio, SR, clicks);
const latOk = Math.abs(lat - 180) <= 15;
const a4 = synth([{ midi: 69, on: 0.1, off: 2.5 }], 3, { cents: -27, offsetSec: 0 });
const tune = estimateTuning(a4, SR);
const tuneOk = tune != null && Math.abs(tune + 27) <= 6; // synth detunes each note ±3 cents
if (!latOk || !tuneOk) failures++;
console.log(`${latOk ? 'PASS' : 'FAIL'}  latency: measured ${Math.round(lat)} ms (true 180)`);
console.log(`${tuneOk ? 'PASS' : 'FAIL'}  tuning: measured ${tune?.toFixed(1)} cents (true -27)`);

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
