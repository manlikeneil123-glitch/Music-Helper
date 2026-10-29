// The one score format everything works on — built-in pieces, imported MusicXML,
// excerpts for bar drills. Pure data + functions (no DOM), shared with Node tests.
//
// score = {
//   id, title, level, targetBpm, beatsPerBar, beatUnit, keyFifths, staves (1|2), clefs,
//   notes:   [{ midi, beat, beats, staff, voice, finger, step, alter, artic, ornament,
//               grace, slur, tieStop }],
//   rests:   [{ beat, beats, staff }],
//   dynamics:[{ beat, mark }],            // 'pp'…'ff'
//   pedal:   [{ start, end }],            // in beats
// }
// beat = onset in beats of the piece's beat unit; beats = duration.

export const DYNAMIC_LEVELS = { ppp: 1, pp: 2, p: 3, mp: 4, mf: 5, f: 6, ff: 7, fff: 8 };
const LETTER_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B (letter indices)
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; //  B E A D G C F

// Alteration each letter carries in a key (fifths > 0 sharps, < 0 flats).
export function keyAlters(fifths) {
  const alters = [0, 0, 0, 0, 0, 0, 0];
  if (fifths > 0) SHARP_ORDER.slice(0, fifths).forEach((l) => (alters[l] = 1));
  if (fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach((l) => (alters[l] = -1));
  return alters;
}

// Spell a MIDI number as { step (octave*7+letter), alter } — prefer the key's own notes,
// then sharps in sharp keys and flats in flat keys.
export function spell(midi, fifths = 0) {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const ka = keyAlters(fifths);
  const options = [];
  for (let l = 0; l < 7; l++) {
    for (const alter of [-1, 0, 1]) {
      if ((LETTER_SEMIS[l] + alter + 12) % 12 === pc) {
        // B♯ / C♭ cross the octave boundary.
        const oct = octave + (LETTER_SEMIS[l] + alter < 0 ? 1 : LETTER_SEMIS[l] + alter > 11 ? -1 : 0);
        const score = (alter === ka[l] ? 0 : 2) + (alter === 0 ? 0 : 1) + (alter === -1 && fifths > 0 ? 1 : 0) + (alter === 1 && fifths < 0 ? 1 : 0);
        options.push({ step: oct * 7 + l, alter, score });
      }
    }
  }
  options.sort((a, b) => a.score - b.score);
  return { step: options[0].step, alter: options[0].alter };
}

const legacyNote = (entry) => Array.isArray(entry) && (typeof entry[0] === 'number' || Array.isArray(entry[0]));

// Accept the old compact format ([midi|[midi…], beats, finger|[finger…]]) or a full score.
export function normalize(piece) {
  if (piece._normalized) return piece;
  const score = {
    id: piece.id, title: piece.title ?? 'Untitled', level: piece.level ?? '', targetBpm: piece.targetBpm ?? 80,
    beatsPerBar: piece.beatsPerBar ?? 4, beatUnit: piece.beatUnit ?? 4, keyFifths: piece.keyFifths ?? 0,
    staves: piece.staves ?? 1, clefs: piece.clefs ?? [piece.clef ?? 'treble', 'bass'],
    notes: [], rests: piece.rests ?? [], dynamics: piece.dynamics ?? [], pedal: piece.pedal ?? [],
    source: piece.source ?? 'built-in', _normalized: true,
  };
  if (piece.notes.length && legacyNote(piece.notes[0])) {
    let beat = 0;
    for (const [pitches, beats, fingers] of piece.notes) {
      const midis = [].concat(pitches);
      const fs = [].concat(fingers ?? []);
      midis.forEach((midi, k) => score.notes.push({ midi, beat, beats, staff: 1, voice: 1, finger: fs[k] }));
      beat += beats;
    }
  } else {
    score.notes = piece.notes.map((n) => ({ staff: 1, voice: 1, ...n }));
  }
  for (const n of score.notes) {
    if (n.step == null) Object.assign(n, spell(n.midi, score.keyFifths));
  }
  if (score.notes.some((n) => n.staff === 2)) score.staves = 2;
  return score;
}

export function totalBeats(piece) {
  const s = normalize(piece);
  const end = Math.max(0, ...s.notes.map((n) => n.beat + n.beats), ...s.rests.map((r) => r.beat + r.beats));
  return Math.ceil(end / s.beatsPerBar - 1e-9) * s.beatsPerBar || end;
}

export const barCount = (piece) => Math.round(totalBeats(piece) / normalize(piece).beatsPerBar);

/**
 * Notes in playing order, one per pitch, grouped into "events" (everything that
 * starts together). Each: { i, midi, beat, beats, bar, beatInBar, event, staff, voice,
 * finger, artic, ornament, grace, slur, dyn (marking in force) }.
 */
export function timeline(piece) {
  const s = normalize(piece);
  const dyn = [...s.dynamics].sort((a, b) => a.beat - b.beat);
  const notes = s.notes
    .filter((n) => !n.tieStop)
    .map((n) => ({ ...n }))
    .sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  let event = -1;
  let lastBeat = null;
  return notes.map((n, i) => {
    if (lastBeat == null || Math.abs(n.beat - lastBeat) > 1e-6) {
      event++;
      lastBeat = n.beat;
    }
    const mark = dyn.filter((d) => d.beat <= n.beat + 1e-6).pop()?.mark ?? null;
    return {
      ...n, i, event,
      bar: Math.floor(n.beat / s.beatsPerBar + 1e-9) + 1 + (s.barOffset ?? 0),
      beatInBar: +((n.beat % s.beatsPerBar) + 1).toFixed(3),
      dyn: mark,
    };
  });
}

// Bars [fromBar, toBar] (as printed, inclusive) as a standalone score starting at beat 0.
export function excerpt(piece, fromBar, toBar) {
  const s = normalize(piece);
  const off = s.barOffset ?? 0;
  const b0 = (fromBar - 1 - off) * s.beatsPerBar;
  const b1 = (toBar - off) * s.beatsPerBar;
  const inRange = (x) => x.beat >= b0 - 1e-6 && x.beat < b1 - 1e-6;
  const shift = (x) => ({ ...x, beat: x.beat - b0 });
  const lastDyn = s.dynamics.filter((d) => d.beat <= b0 + 1e-6).pop();
  return {
    ...s,
    id: `${s.id}:bars${fromBar}-${toBar}`,
    title: fromBar === toBar ? `${s.title}, bar ${fromBar}` : `${s.title}, bars ${fromBar}–${toBar}`,
    notes: s.notes.filter(inRange).map(shift).map((n) => ({ ...n, beats: Math.min(n.beats, b1 - b0 - (n.beat - b0)) })),
    rests: s.rests.filter(inRange).map(shift),
    dynamics: [...(lastDyn ? [{ ...lastDyn, beat: 0 }] : []), ...s.dynamics.filter((d) => d.beat > b0 + 1e-6 && d.beat < b1).map(shift)],
    pedal: s.pedal.filter((p) => p.end > b0 && p.start < b1).map((p) => ({ start: Math.max(0, p.start - b0), end: Math.min(b1 - b0, p.end - b0) })),
    barOffset: fromBar - 1,
    targetBpm: s.targetBpm,
    _normalized: true,
  };
}

// Rough difficulty signal, used to pick how cautious mic feedback should be.
export function density(piece) {
  const tl = timeline(piece);
  const events = new Map();
  for (const n of tl) events.set(n.event, (events.get(n.event) ?? 0) + 1);
  const maxChord = Math.max(1, ...events.values());
  const minDur = Math.min(...tl.map((n) => n.beats).filter((b) => b > 0));
  return { maxChord, minDur, twoHands: tl.some((n) => n.staff === 2) };
}
