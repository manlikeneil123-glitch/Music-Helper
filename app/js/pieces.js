// Built-in pieces. Compact entries are [midi|[midi…], beats, finger|[finger…]];
// two-hand pieces use the full score format (see score.js). Imported MusicXML is added
// at runtime. Exam-board pieces are copyrighted, so the library is public-domain
// repertoire plus original studies.
import { normalize, timeline as scoreTimeline, totalBeats as scoreTotalBeats } from './score.js';

const B3 = 59, C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72;
const [B2, C3, D3, E3, G3, A3] = [47, 48, 50, 52, 55, 57];

// Bach, Prelude in C (BWV 846), bars 1–4: one broken chord per half bar — bass held,
// tenor held from the 2nd sixteenth, then six sixteenths in the right hand. No
// fingering or pedalling is printed: editions disagree, so that's the teacher's call.
function preludeBars(chords) {
  const notes = [];
  chords.forEach(([bass, tenor, a, b, c], half) => {
    const t = half * 2;
    notes.push({ midi: bass, beat: t, beats: 2, staff: 2, voice: 2 });
    notes.push({ midi: tenor, beat: t + 0.25, beats: 1.75, staff: 2, voice: 1 });
    [a, b, c, a, b, c].forEach((midi, k) => notes.push({ midi, beat: t + 0.5 + k * 0.25, beats: 0.25, staff: 1, voice: 1 }));
  });
  return notes;
}

export const PIECES = [
  {
    id: 'c-scale',
    title: 'C major scale (right hand)',
    level: 'Beginner · Week 1',
    clef: 'treble',
    beatsPerBar: 4,
    targetBpm: 80,
    notes: [
      [C4, 1, 1], [D4, 1, 2], [E4, 1, 3], [F4, 1, 1], [G4, 1, 2], [A4, 1, 3], [B4, 1, 4], [C5, 1, 5],
      [C5, 1, 5], [B4, 1, 4], [A4, 1, 3], [G4, 1, 2], [F4, 1, 1], [E4, 1, 3], [D4, 1, 2], [C4, 1, 1],
    ],
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy (right hand)',
    level: 'Beginner · Week 2',
    clef: 'treble',
    beatsPerBar: 4,
    targetBpm: 90,
    notes: [
      [E4, 1, 3], [E4, 1, 3], [F4, 1, 4], [G4, 1, 5], [G4, 1, 5], [F4, 1, 4], [E4, 1, 3], [D4, 1, 2],
      [C4, 1, 1], [C4, 1, 1], [D4, 1, 2], [E4, 1, 3], [E4, 1.5, 3], [D4, 0.5, 2], [D4, 2, 2],
      [E4, 1, 3], [E4, 1, 3], [F4, 1, 4], [G4, 1, 5], [G4, 1, 5], [F4, 1, 4], [E4, 1, 3], [D4, 1, 2],
      [C4, 1, 1], [C4, 1, 1], [D4, 1, 2], [E4, 1, 3], [D4, 1.5, 2], [C4, 0.5, 1], [C4, 2, 1],
    ],
  },
  {
    id: 'chords-c',
    title: 'Chords: C – F – G – C (right hand)',
    level: 'Beginner · Week 3',
    clef: 'treble',
    beatsPerBar: 4,
    targetBpm: 72,
    notes: [
      [[C4, E4, G4], 2, [1, 3, 5]], [[C4, E4, G4], 2, [1, 3, 5]],
      [[C4, F4, A4], 2, [1, 4, 5]], [[C4, F4, A4], 2, [1, 4, 5]],
      [[B3, D4, G4], 2, [1, 2, 5]], [[B3, D4, G4], 2, [1, 2, 5]],
      [[C4, E4, G4], 4, [1, 3, 5]],
    ],
  },
  {
    id: 'bach-prelude-c',
    title: 'Bach: Prelude in C, BWV 846 (bars 1–4)',
    level: 'Grade 5 · Both hands',
    staves: 2,
    beatsPerBar: 4,
    targetBpm: 66,
    notes: preludeBars([
      [C3, E3, G3, C4, E4], [C3, E3, G3, C4, E4],
      [C3, D3, A3, D4, F4], [C3, D3, A3, D4, F4],
      [B2, D3, G3, D4, F4], [B2, D3, G3, D4, F4],
      [C3, E3, G3, C4, E4], [C3, E3, G3, C4, E4],
    ]),
    dynamics: [{ beat: 0, mark: 'p' }],
  },
];

// Back-compat helpers: everything goes through the score model.
export const timeline = (piece) => scoreTimeline(normalize(piece));
export const totalBeats = (piece) => scoreTotalBeats(normalize(piece));
export const hasChords = (piece) => timeline(piece).some((n, i, a) => a[i + 1]?.event === n.event);
