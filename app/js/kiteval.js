// The real-piano recording kit: what to record, what each take was meant to contain,
// and how well the microphone checking did on it. Pure, so the in-app kit and the
// offline tuning tool (tools/evaluate-kit.mjs) score takes the same way.
import { midiName } from './music.js';

// Deliberate mistakes are part of the kit: a checker is only useful if it catches
// wrong notes as well as accepting right ones.
export const KIT_STEPS = [
  { id: 'silence', title: 'Room noise', seconds: 6, text: "Don't play. Keep still for 6 seconds so the app hears your room." },
  { id: 'scale-slow', title: 'C major scale, slow', piece: 'c-scale', bpm: 60, text: 'Right hand, as written, medium loud.' },
  { id: 'scale-fast', title: 'C major scale, quicker', piece: 'c-scale', bpm: 100, text: 'Right hand, as written.' },
  { id: 'ode', title: 'Ode to Joy', piece: 'ode-to-joy', bpm: 90, text: 'As written.' },
  { id: 'ode-wrong', title: 'Ode to Joy, with two wrong notes', piece: 'ode-to-joy', bpm: 90, errors: [{ bar: 2, beat: 3, kind: 'wrong', shift: 1 }, { bar: 6, beat: 1, kind: 'wrong', shift: -1 }] },
  { id: 'ode-skip', title: 'Ode to Joy, with two notes left out', piece: 'ode-to-joy', bpm: 90, errors: [{ bar: 3, beat: 1, kind: 'skip' }, { bar: 7, beat: 2, kind: 'skip' }] },
  { id: 'chords', title: 'Chords', piece: 'chords-c', bpm: 70, text: 'Medium loud, all notes of each chord together.' },
  { id: 'chords-soft', title: 'Chords, very soft', piece: 'chords-c', bpm: 70, text: 'As quietly as you can while every note still sounds.' },
  { id: 'chords-wrong', title: 'Chords, one wrong note', piece: 'chords-c', bpm: 70, errors: [{ bar: 2, beat: 1, kind: 'wrong', shift: 1, middle: true }] },
  { id: 'octaves', title: 'Octave study', piece: 'octave-study', bpmFactor: 0.7, text: 'Both hands, as written, at this slower tempo.' },
  { id: 'bach-pedal', title: 'Bach Prelude with pedal', piece: 'bach-prelude-c', bpm: 60, text: 'Hold the sustain pedal down through each bar, change it on each new bar.' },
  { id: 'scale-pedal', title: 'Scale, loud, pedal down', piece: 'c-scale', bpm: 90, text: 'Loud, with the sustain pedal held down the whole time (yes, it will blur).' },
];

const WHITE = [0, 2, 4, 5, 7, 9, 11];
// The next white key up (shift 1) or down (shift -1): an easy, realistic slip.
function whiteNeighbour(midi, shift) {
  let m = midi + shift;
  while (!WHITE.includes(((m % 12) + 12) % 12)) m += shift;
  return m;
}

/**
 * What the take should contain. tl: timeline(piece). Returns { intended: [{ i, kind, play }],
 * instructions: [text] } where kind is 'correct', 'wrong' (played `play` instead) or 'skip'.
 */
export function truthFor(step, tl) {
  const intended = tl.map((n) => ({ i: n.i, kind: 'correct', play: n.midi }));
  const instructions = [];
  for (const e of step.errors ?? []) {
    const at = tl.filter((n) => n.bar === e.bar && Math.abs(n.beatInBar - e.beat) < 1e-6).sort((a, b) => a.midi - b.midi);
    if (!at.length) continue;
    const target = e.middle && at.length >= 3 ? at[1] : at[at.length - 1];
    if (e.kind === 'skip') {
      intended[target.i] = { i: target.i, kind: 'skip', play: null };
      instructions.push(`Bar ${e.bar}, beat ${e.beat}: leave out ${midiName(target.midi)}.`);
    } else {
      const play = whiteNeighbour(target.midi, e.shift);
      intended[target.i] = { i: target.i, kind: 'wrong', play };
      instructions.push(`Bar ${e.bar}, beat ${e.beat}: play ${midiName(play)} instead of ${midiName(target.midi)}${at.length > 1 ? ' (the rest of the chord as written)' : ''}.`);
    }
  }
  return { intended, instructions };
}

/**
 * How the checker did on one take. notes: analyse() result notes (indexed like the
 * timeline). Right notes should pass; wrong or skipped ones should be flagged.
 */
export function scoreTake(notes, intended) {
  const m = { right: 0, accepted: 0, unclear: 0, falseFlags: 0, mistakes: 0, caught: 0, missedMistakes: 0, flagged: [] };
  for (const want of intended) {
    const n = notes[want.i];
    if (!n || n.grace) continue;
    const passed = ['correct', 'early', 'late'].includes(n.status);
    if (want.kind === 'correct') {
      m.right++;
      if (passed) m.accepted++;
      else if (n.status === 'unclear') m.unclear++;
      else if (!n.notReached) { m.falseFlags++; m.flagged.push(`${midiName(n.midi)} bar ${n.bar}: ${n.status}`); }
    } else {
      m.mistakes++;
      if (n.status === 'wrong' || n.status === 'missed') m.caught++;
      else m.missedMistakes++;
    }
  }
  return m;
}

/** Totals across takes, and one number to optimise (catching mistakes counts double). */
export function summariseTakes(results) {
  const t = results.reduce((a, r) => {
    for (const k of ['right', 'accepted', 'unclear', 'falseFlags', 'mistakes', 'caught', 'missedMistakes']) a[k] = (a[k] ?? 0) + r[k];
    return a;
  }, {});
  t.acceptRate = t.right ? t.accepted / t.right : 1;
  t.falseFlagRate = t.right ? t.falseFlags / t.right : 0;
  t.catchRate = t.mistakes ? t.caught / t.mistakes : 1;
  t.objective = t.acceptRate - 2 * t.falseFlagRate + 2 * t.catchRate;
  return t;
}
