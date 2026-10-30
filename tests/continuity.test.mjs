// Keeping going, pulse and slip recovery: node tests/continuity.test.mjs
import { analyse } from '../app/js/analysis.js';
import { timeline } from '../app/js/score.js';
import { PIECES } from '../app/js/pieces.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
};
const ode = PIECES.find((p) => p.id === 'ode-to-joy');
const tl = timeline(ode);
const BPM = 90;
const mpb = 60000 / BPM;
const run = (played) => analyse({ expected: tl, played, msPerBeat: mpb, beatsPerBar: ode.beatsPerBar, source: 'midi', score: ode });
const clean = (shift = () => 0) => tl.map((n) => ({ midi: n.midi, on: n.beat * mpb + shift(n), off: (n.beat + n.beats * 0.9) * mpb + shift(n), velocity: 0.6 }));

const r0 = run(clean());
check('clean run keeps going', r0.continuity.score === 100 && !r0.continuity.hesitations.length && !r0.continuity.restarts.length, JSON.stringify(r0.continuity));
check('clean run has a steady pulse', r0.pulse.score >= 90 && r0.pulse.label === 'steady', JSON.stringify(r0.pulse));
check('per-bar errors are reported', r0.barErrors && Object.keys(r0.barErrors).length === 0);

// Pause of 2.5 beats before bar 5.
const at5 = tl.find((n) => n.bar === 5).beat;
const r1 = run(clean((n) => (n.beat >= at5 ? 2.5 * mpb : 0)));
check('a long pause is found as a stop at bar 5', r1.continuity.hesitations.some((h) => h.bar === 5), JSON.stringify(r1.continuity.hesitations));
check('the pause lowers the keeping-going score', r1.continuity.score < 100 && r1.continuity.score >= 60, r1.continuity.score);

check('a stop does not distort the tempo of the rest', r1.tempoChanges.length === 0 && r1.rhythmAccuracy >= 0.95 && r1.pulse.score >= 85, JSON.stringify({ tc: r1.tempoChanges.length, rh: r1.rhythmAccuracy, p: r1.pulse.score }));
check('a stop caps the score and blocks "ready"', r1.score <= 85 && !r1.ready, `${r1.score} ${r1.ready}`);
check('the headline asks for a run without stopping', /without stopping/.test(r1.feedback.headline), r1.feedback.headline);

// Restart: after bar 4, replay bar 4's notes, then carry on (3 beats late).
const bar4 = tl.filter((n) => n.bar === 4);
const at5ms = at5 * mpb;
const replay = bar4.map((n, i) => ({ midi: n.midi, on: at5ms + i * mpb * 0.9, off: at5ms + (i + 0.8) * mpb * 0.9, velocity: 0.6 }));
const r2 = run([...clean((n) => (n.beat >= at5 ? (bar4.length + 0.5) * mpb : 0)), ...replay].sort((a, b) => a.on - b.on));
check('a restart is detected at bar 5', r2.continuity.restarts.some((x) => x.bar === 5), JSON.stringify(r2.continuity));
check('a restart costs more than a pause', r2.continuity.score < r1.continuity.score, `${r2.continuity.score} vs ${r1.continuity.score}`);
check('feedback names the restart', r2.feedback.lines.some((l) => /replayed at bar 5/.test(l.text)), r2.feedback.lines.map((l) => l.text).join(' | '));

// A wrong note played in time and carried on from: recovered.
const wrongBeat = tl[6].beat;
const r3 = run(clean().map((p) => (Math.abs(p.on - wrongBeat * mpb) < 1 ? { ...p, midi: p.midi + 1 } : p)));
check('a slip played through counts as recovered', r3.continuity.slips === 1 && r3.continuity.recovered === 1, JSON.stringify(r3.continuity));
check('feedback praises keeping going', r3.feedback.lines.some((l) => /kept going after every slip/.test(l.text)));

// Steadily speeding up: pulse drops.
const r4 = run(tl.map((n) => { const t = n.beat * mpb * (1 - n.beat * 0.012); return { midi: n.midi, on: t, off: t + 200, velocity: 0.6 }; }));
check('a drifting tempo lowers the pulse score', r4.pulse.score < r0.pulse.score, `${r4.pulse.score} vs ${r0.pulse.score}`);

// Uneven beats with random jitter: pulse wanders.
let seed = 5;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const r5 = run(clean(() => (rand() - 0.5) * 0.5 * mpb));
check('an uneven beat lowers the pulse score', r5.pulse.score < 80, r5.pulse.score);

console.log(failures ? `\n${failures} failed` : '\nAll continuity tests passed');
process.exit(failures ? 1 : 0);
