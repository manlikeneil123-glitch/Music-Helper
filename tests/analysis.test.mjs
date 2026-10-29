// Analysis tests (MIDI-style input): node tests/analysis.test.mjs
import { readFileSync } from 'node:fs';
import { analyse } from '../app/js/analysis.js';
import { normalize, timeline, excerpt } from '../app/js/score.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { PIECES } from '../app/js/pieces.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
};
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jitter = (ms) => (rand() - 0.5) * 2 * ms;

// Play a score: tempoAt(beat) → ms per beat at that point (integrated), plus tweaks.
function perform(score, { bpm = 80, tempoAt = null, vel = () => 0.6, hold = 0.9, tweak = (n) => n, jitterMs = 12 } = {}) {
  const tl = timeline(score);
  const msPerBeat = 60000 / bpm;
  const timeOf = (beat) => {
    if (!tempoAt) return beat * msPerBeat;
    let t = 0;
    for (let b = 0; b < beat; b += 0.05) t += tempoAt(b) * Math.min(0.05, beat - b);
    return t;
  };
  const played = tl.flatMap((n) => {
    const p = tweak({ midi: n.midi, on: timeOf(n.beat) + jitter(jitterMs), off: timeOf(n.beat + n.beats * hold), velocity: vel(n), n });
    return p ? [].concat(p) : [];
  });
  return { tl, played, msPerBeat };
}
const run = (score, perf, opts = {}) => analyse({ expected: perf.tl, played: perf.played, msPerBeat: perf.msPerBeat, beatsPerBar: score.beatsPerBar, source: 'midi', score, ...opts });
const lines = (r) => r.feedback.lines.map((l) => l.text).join(' | ');

const study = normalize(parseMusicXML(readFileSync(new URL('../app/scores/octave-study.musicxml', import.meta.url), 'utf8')));
const bach = normalize(PIECES.find((p) => p.id === 'bach-prelude-c'));

// --- Rubato ---------------------------------------------------------------------------
{
  // A ritardando over the last bar of the Bach (bar 4), ending ~50% slower.
  const rit = (b) => (60000 / 66) * (b < 12 ? 1 : 1 + 0.5 * ((b - 12) / 4));
  const perf = perform(bach, { bpm: 66, tempoAt: rit });
  const std = run(bach, perf, { strictness: 'standard' });
  check('rubato (standard): no notes marked early/late', std.counts.early + std.counts.late === 0, JSON.stringify(std.counts));
  check('rubato (standard): the slowing is pointed out as possibly intended', std.tempoChanges.some((c) => c.kind === 'slower') && /intended slowing/.test(lines(std)), lines(std));
  const exam = run(bach, perf, { strictness: 'exam' });
  check('rubato (exam): flagged as not steady', !exam.ready && /hold the tempo steady/.test(lines(exam)), lines(exam));
}

// --- Ornaments and grace notes -------------------------------------------------------
{
  const trillScore = normalize({ id: 't', beatsPerBar: 4, notes: [
    { midi: 72, beat: 0, beats: 2, ornament: 'trill' }, { midi: 71, beat: 2, beats: 1 }, { midi: 69, beat: 3, beats: 1 },
  ] });
  const perf = perform(trillScore, {
    bpm: 80,
    tweak: (p) => (p.n.ornament ? Array.from({ length: 8 }, (_, k) => ({ ...p, midi: k % 2 ? 72 : 74, on: p.on + k * 90, off: p.on + k * 90 + 80 })) : p),
  });
  const r = run(trillScore, perf);
  check('trill played as 8 quick notes counts as one correct note, no extras', r.counts.correct === 3 && r.counts.extra === 0 && r.counts.wrong === 0, JSON.stringify(r.counts));

  const graceScore = normalize({ id: 'g', beatsPerBar: 4, notes: [
    { midi: 69, beat: 0.875, beats: 0.125, grace: true }, { midi: 67, beat: 1, beats: 1 }, { midi: 65, beat: 2, beats: 1 }, { midi: 64, beat: 3, beats: 1 }, { midi: 62, beat: 4, beats: 1 },
  ] });
  const skipped = run(graceScore, perform(graceScore, { tweak: (p) => (p.n.grace ? null : p) }));
  check('grace note left out is optional, not a mistake', skipped.counts.missed === 0 && skipped.counts.optional === 1 && skipped.pitchAccuracy === 1, JSON.stringify(skipped.counts));
  const played = run(graceScore, perform(graceScore));
  check('grace note played is fine', played.counts.correct === 5 && played.counts.extra === 0, JSON.stringify(played.counts));
}

// --- Musicality ------------------------------------------------------------------------
{
  // The study goes p (bar 1) → mf (bar 3) → f (bar 9 after the repeat).
  const flat = run(study, perform(study, { bpm: 84, vel: () => 0.55 }));
  check('dynamics: flat volume against p → mf → f is flagged', flat.musicality.some((m) => m.area === 'dynamics'), lines(flat));
  const shaped = run(study, perform(study, { bpm: 84, vel: (n) => ({ p: 0.35, mf: 0.55, f: 0.8 })[n.dyn] ?? 0.55 }));
  check('dynamics: following the markings is not flagged', !shaped.musicality.some((m) => m.area === 'dynamics'), lines(shaped));

  // Voicing on 5-note chords: top note level with the rest vs. brought out.
  const chords = normalize({ id: 'v', beatsPerBar: 4, notes: [0, 2, 4, 6].flatMap((b) => [48, 55, 64, 67, 72].map((m) => ({ midi: m, beat: b, beats: 2, staff: m >= 60 ? 1 : 2 }))) });
  const level = run(chords, perform(chords, { vel: () => 0.6 }));
  check('voicing: melody not brought out is flagged', level.musicality.some((m) => m.area === 'voicing'), lines(level));
  const voiced = run(chords, perform(chords, { vel: (n) => (n.midi === 72 ? 0.8 : 0.5) }));
  check('voicing: melody on top is not flagged', !voiced.musicality.some((m) => m.area === 'voicing'), lines(voiced));

  // Staccato held too long; slurred notes with gaps.
  const longStacc = run(study, perform(study, { bpm: 84, vel: (n) => ({ p: 0.35, mf: 0.55, f: 0.8 })[n.dyn] ?? 0.55, hold: 0.95 }));
  check('staccato held full length is flagged', longStacc.musicality.some((m) => m.area === 'articulation' && /staccato/.test(m.text)), lines(longStacc));
  const detached = run(study, perform(study, { bpm: 84, vel: (n) => ({ p: 0.35, mf: 0.55, f: 0.8 })[n.dyn] ?? 0.55, hold: 0.5 }));
  check('legato played detached is flagged', detached.musicality.some((m) => /slurred/.test(m.text)), lines(detached));

  // Pedal: the study changes pedal every bar.
  const perf = perform(study, { bpm: 84 });
  const msBar = 4 * perf.msPerBeat;
  const total = 12 * msBar;
  const none = run(study, perf, { pedalEvents: [] });
  check('pedal: not used at all is flagged', none.musicality.some((m) => m.area === 'pedal' && /didn't see/.test(m.text)), lines(none));
  const held = run(study, perf, { pedalEvents: [{ on: -50, off: total }] });
  check('pedal: held through the changes is flagged as blurring', held.musicality.some((m) => m.area === 'pedal' && /blurs/.test(m.text)), lines(held));
  const changed = Array.from({ length: 12 }, (_, b) => ({ on: b * msBar + 60, off: (b + 1) * msBar - 10 }));
  const good = run(study, perf, { pedalEvents: changed });
  check('pedal: changed every bar is not flagged', !good.musicality.some((m) => m.area === 'pedal'), lines(good));
}

// --- Strictness -----------------------------------------------------------------------
{
  // Notes ~0.2 beat off: fine for Gentle/Standard, out of time for Exam.
  const scale = normalize(PIECES[0]);
  const perf = perform(scale, { bpm: 80, jitterMs: 0, tweak: (p) => ({ ...p, on: p.on + (p.n.i % 2 ? 0.2 : -0.2) * 750 }) });
  const exam = run(scale, perf, { strictness: 'exam' });
  const gentle = run(scale, perf, { strictness: 'gentle' });
  check('strictness: exam is stricter about timing than gentle', exam.rhythmAccuracy < gentle.rhythmAccuracy, `${exam.rhythmAccuracy} vs ${gentle.rhythmAccuracy}`);
}

// --- Excerpts, long pieces ---------------------------------------------------------------
{
  const ex = excerpt(study, 3, 4);
  const tl = timeline(ex);
  check('excerpt keeps printed bar numbers', tl[0].bar === 3 && tl[tl.length - 1].bar === 4, `${tl[0].bar}–${tl[tl.length - 1].bar}`);
  const r = run(ex, perform(ex, { bpm: 84 }));
  check('excerpt analyses cleanly', r.pitchAccuracy === 1 && r.counts.extra === 0, JSON.stringify(r.counts));

  // ~2,400 notes (a long Grade 8 piece) must analyse quickly.
  const big = normalize({ id: 'big', beatsPerBar: 4, notes: Array.from({ length: 2400 }, (_, i) => ({ midi: 48 + ((i * 7) % 36), beat: i * 0.25, beats: 0.25, staff: i % 2 ? 1 : 2 })) });
  const t0 = performance.now();
  const rb = run(big, perform(big, { bpm: 100 }));
  const ms = performance.now() - t0;
  check(`2,400-note piece analysed in ${Math.round(ms)} ms (< 3000)`, ms < 3000 && rb.pitchAccuracy > 0.99, `${ms} ms, accuracy ${rb.pitchAccuracy}`);
}

// --- Dense pieces on the microphone ----------------------------------------------------
{
  const perf = perform(study, { bpm: 84, tweak: (p) => (p.n.i === 10 ? { ...p, midi: p.midi + 2 } : p) });
  const r = analyse({ expected: perf.tl, played: perf.played, msPerBeat: perf.msPerBeat, beatsPerBar: 4, source: 'mic', score: study, dense: true });
  check('dense + mic: cautious wording and a MIDI suggestion', /Probably a wrong note/.test(lines(r)) && /use a MIDI keyboard/.test(lines(r)), lines(r));
  check('dense + mic: no musicality claims from mic audio', r.musicality.length === 0);
}

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
