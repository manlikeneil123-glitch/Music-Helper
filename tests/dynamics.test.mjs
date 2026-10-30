// Dynamics from the microphone: node tests/dynamics.test.mjs
import assert from 'node:assert/strict';
import { micDynamics } from '../app/js/analysis.js';

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };
const db = (x) => 10 ** (x / 20);
// 16 single notes, bars 1-2 marked p, bars 3-4 marked f; loudness in dB given per bar.
const take = (dbs, { marks = ['p', 'p', 'f', 'f'], chord = 1 } = {}) => Array.from({ length: 16 }, (_, i) => {
  const bar = Math.floor(i / 4) + 1;
  return Array.from({ length: chord }, (_, k) => ({ event: i, beat: i, bar, dyn: marks[bar - 1], on: i * 500, velocity: db(dbs[bar - 1] + 10 * Math.log10(chord)), status: 'correct', midi: 60 + k * 4 }));
}).flat();

const clear = micDynamics(take([-20, -20, -10, -10]));
ok(clear.some((l) => l.kind === 'good' && /f at bar 3 came through/.test(l.text)), 'a clear p→f change is praised');
const flat = micDynamics(take([-20, -20, -19, -19]));
ok(flat.some((l) => l.kind === 'warn' && /bar 3 is marked f, but I couldn't hear it get louder/i.test(l.text)), 'a p→f change of 1 dB is flagged, cautiously worded');
const down = micDynamics(take([-10, -10, -11, -11], { marks: ['f', 'f', 'p', 'p'] }));
ok(down.some((l) => /couldn't hear it get softer/.test(l.text)), 'an unheard f→p drop is flagged');
// Chords are louder just because there are more notes: corrected for.
const chords = micDynamics(take([-20, -20, -20, -20], { marks: ['p', 'p', 'p', 'p'], chord: 3 }));
ok(!chords.some((l) => l.kind === 'warn' && /louder/.test(l.text)), 'no false change from chords alone');
// Hairpins.
const notes = take([-20, -20, -20, -20], { marks: [null, null, null, null] }).map((x) => ({ ...x, velocity: db(-25 + x.beat) }));
ok(!micDynamics(notes, { hairpins: [{ type: 'cresc', start: 0, end: 15 }] }).some((l) => /crescendo/.test(l.text)), 'a real crescendo passes');
ok(micDynamics(notes, { hairpins: [{ type: 'dim', start: 0, end: 15 }] }).some((l) => /diminuendo/.test(l.text)), 'getting louder under a diminuendo is flagged');
// Unmarked and completely flat.
ok(micDynamics(take([-20, -20, -20, -20], { marks: [null, null, null, null] })).some((l) => /same volume/.test(l.text)), 'a completely flat unmarked piece gets a shaping tip');
// Wrong notes and grace notes don't count.
ok(micDynamics(take([-20, -20, -10, -10]).map((x) => ({ ...x, status: 'wrong' }))).length === 0, 'wrong notes are ignored');
console.log(`dynamics: ${n} checks passed`);
