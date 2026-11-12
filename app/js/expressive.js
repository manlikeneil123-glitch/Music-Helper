// "Hear the piece" with the expression in the score, so a student hears what the
// examiner expects: dynamics and hairpins, accents, staccato, slurs, pedal and
// pauses, at the marked speed. Pure: returns what to play; the caller schedules it.
import { normalize, timeline } from './score.js';

const LOUD = { ppp: 0.22, pp: 0.3, p: 0.4, mp: 0.52, mf: 0.64, f: 0.78, ff: 0.9, fff: 0.97 };
const HAIRPIN = 0.18; // how far a crescendo or diminuendo moves the loudness
const PAUSE = 1.75; // a pause (fermata) holds the note this many times its length

/** [{ midi, at, dur, vel }] in seconds from the start, for the piece at `bpm`. */
export function expressivePlan(piece, bpm) {
  const s = normalize(piece);
  const spb = 60 / (bpm || s.targetBpm || 80);
  const notes = timeline(s);
  // Pauses push everything after them later.
  const holds = notes.filter((n) => n.fermata).map((n) => ({ beat: n.beat, extra: n.beats * (PAUSE - 1) }))
    .filter((h, i, a) => !i || h.beat !== a[i - 1].beat);
  const time = (beat) => (beat + holds.filter((h) => h.beat < beat - 1e-6).reduce((a, h) => a + h.extra, 0)) * spb;
  const pedalEnd = (beat) => s.pedal.find((p) => p.start <= beat + 1e-6 && beat < p.end)?.end ?? null;
  const swell = (beat) => {
    const h = s.hairpins.find((x) => x.start <= beat && beat <= x.end);
    if (!h) return 0;
    const k = (beat - h.start) / Math.max(1e-6, h.end - h.start);
    return (h.type === 'cresc' ? 1 : -1) * HAIRPIN * k;
  };
  return notes.filter((n) => !n.grace).map((n) => {
    let vel = (LOUD[n.dyn] ?? 0.62) + swell(n.beat) + (n.artic === 'accent' ? 0.14 : 0);
    if ((n.staff ?? 1) === 2) vel -= 0.08; // the left hand sits under the tune
    let beats = n.beats * (n.artic === 'staccato' ? 0.45 : n.slur ? 1 : 0.9);
    if (n.fermata) beats = n.beats * PAUSE;
    const held = pedalEnd(n.beat);
    const end = held != null && held > n.beat + beats ? time(held) : time(n.beat) + beats * spb;
    return { midi: n.midi, at: time(n.beat), dur: Math.max(0.06, end - time(n.beat)), vel: Math.max(0.12, Math.min(1, vel)) };
  });
}
