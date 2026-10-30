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
    hairpins: piece.hairpins ?? [], meters: piece.meters ?? null, clefChanges: piece.clefChanges ?? [], slurs: piece.slurs ?? [],
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

// Where each bar starts, in beats. Uniform unless the score changes metre:
// meters = [{ beat, beatsPerBar }] (same beat unit throughout).
const barMaps = new WeakMap();
export function barMap(piece) {
  const s = normalize(piece);
  if (barMaps.has(s)) return barMaps.get(s);
  const end = Math.max(0, ...s.notes.map((n) => n.beat + n.beats), ...s.rests.map((r) => r.beat + r.beats));
  const changes = (s.meters ?? []).filter((m) => m.beatsPerBar > 0).sort((a, b) => a.beat - b.beat);
  const starts = [0];
  let bpb = s.beatsPerBar;
  let beat = 0;
  let ci = 0;
  do {
    while (ci < changes.length && changes[ci].beat <= beat + 1e-6) bpb = changes[ci++].beatsPerBar;
    beat += bpb;
    starts.push(beat);
  } while (beat < end - 1e-6 && starts.length < 5000);
  const count = starts.length - 1;
  const map = {
    starts,
    count,
    /** 0-based bar index containing `beat`. */
    indexAt(b) {
      let lo = 0;
      let hi = count - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= b + 1e-9) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
    lengthOf: (i) => starts[i + 1] - starts[i],
    uniform: !changes.some((m) => m.beatsPerBar !== s.beatsPerBar),
  };
  barMaps.set(s, map);
  return map;
}

export const totalBeats = (piece) => barMap(piece).starts[barMap(piece).count];
export const barCount = (piece) => barMap(piece).count;
/** Bar number as printed (barOffset applied) for a beat. */
export const barNumberAt = (piece, beat) => barMap(piece).indexAt(beat) + 1 + (normalize(piece).barOffset ?? 0);

/**
 * Notes in playing order, one per pitch, grouped into "events" (everything that
 * starts together). Each: { i, midi, beat, beats, bar, beatInBar, event, staff, voice,
 * finger, artic, ornament, grace, slur, dyn (marking in force) }.
 */
export function timeline(piece) {
  const s = normalize(piece);
  const dyn = [...s.dynamics].sort((a, b) => a.beat - b.beat);
  const bars = barMap(s);
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
    const idx = bars.indexAt(n.beat);
    return {
      ...n, i, event,
      bar: idx + 1 + (s.barOffset ?? 0),
      beatInBar: +(n.beat - bars.starts[idx] + 1).toFixed(3),
      dyn: mark,
    };
  });
}

// Bars [fromBar, toBar] (as printed, inclusive) as a standalone score starting at beat 0.
export function excerpt(piece, fromBar, toBar) {
  const s = normalize(piece);
  const off = s.barOffset ?? 0;
  const map = barMap(s);
  const clampBar = (b) => Math.max(0, Math.min(map.count, b));
  const b0 = map.starts[clampBar(fromBar - 1 - off)];
  const b1 = map.starts[clampBar(toBar - off)];
  const meters = map.uniform ? null : [
    { beat: 0, beatsPerBar: map.lengthOf(map.indexAt(b0)) },
    ...(s.meters ?? []).filter((m) => m.beat > b0 + 1e-6 && m.beat < b1 - 1e-6).map((m) => ({ ...m, beat: m.beat - b0 })),
  ];
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
    hairpins: (s.hairpins ?? []).filter((h) => h.end > b0 && h.start < b1).map((h) => ({ ...h, start: Math.max(0, h.start - b0), end: Math.min(b1 - b0, h.end - b0) })),
    slurs: (s.slurs ?? []).filter((h) => h.end > b0 && h.start < b1).map((h) => ({ ...h, start: Math.max(0, h.start - b0), end: Math.min(b1 - b0, h.end - b0) })),
    // Start in whichever clef is in force at the first bar of the excerpt.
    clefs: s.clefs.map((c, i) => (s.clefChanges ?? []).filter((x) => x.staff === i + 1 && x.beat <= b0 + 1e-6).sort((a, b) => a.beat - b.beat).pop()?.clef ?? c),
    clefChanges: (s.clefChanges ?? []).filter((c) => c.beat > b0 + 1e-6 && c.beat < b1).map((c) => ({ ...c, beat: c.beat - b0 })),
    meters,
    beatsPerBar: meters ? meters[0].beatsPerBar : s.beatsPerBar,
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
