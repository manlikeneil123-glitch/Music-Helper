// Score-informed performance analysis. Because we KNOW what should be played,
// we verify against the score instead of blind transcription — far more robust.
// Pure functions, no DOM: same code can later run on a server or in tests.
import { midiName } from './music.js';
import { DYNAMIC_LEVELS } from './score.js';

// How strict the checker is (set per student). Exam judges against one steady tempo;
// the others follow the player's own tempo bar by bar, so expressive rubato isn't
// reported as wrong notes (tempo changes are still pointed out).
export const STRICTNESS = {
  gentle: { label: 'Gentle', timing: 0.33, tempo: 0.12, expressive: true },
  standard: { label: 'Standard', timing: 0.25, tempo: 0.08, expressive: true },
  exam: { label: 'Exam', timing: 0.15, tempo: 0.05, expressive: false },
};

/**
 * expected: timeline() notes. played: [{ midi, on, off, velocity }] with on/off in ms
 * relative to beat 0 of the piece. msPerBeat: target tempo.
 * unclear: [{ midi, on }] notes the microphone could neither confirm nor rule out —
 *   reported as "unclear" and not counted against the player.
 * spread: chords the mic heard as not played together.
 * score: the normalized score (pedal marks, dynamics); pedalEvents: [{ on, off }] sustain
 *   pedal intervals from MIDI; dense: true when the piece is hard for the mic to judge.
 */
export function analyse({
  expected, played, msPerBeat, beatsPerBar, source, unclear = [], spread = [],
  strictness = 'standard', score = null, pedalEvents = null, dense = false,
}) {
  const S = STRICTNESS[strictness] ?? STRICTNESS.standard;
  played = orderChords(played);
  const fitOf = (ops, pl) => {
    const ps = ops.filter((o) => o.type === 'match' || o.type === 'wrong');
    return ps.length >= 3 ? robustRegress(ps.map((o) => [expected[o.e].beat, pl[o.p].on])) : null;
  };
  // Pass 1 aligns against the target tempo, mostly by pitch. Pass 2 re-aligns
  // against the player's own fitted tempo with timing weighted much more, so a
  // pitch can't slide to a matching note a bar away.
  let ops = align(expected, played, (beat) => beat * msPerBeat, msPerBeat, 0.08);
  let first = fitOf(ops, played);
  // Ornaments: a trill/mordent/turn is many quick notes for one written note. Fold
  // them into a single played note before judging, however many the player used.
  if (first && first.b > 0 && expected.some((n) => n.ornament)) {
    played = absorbOrnaments(expected, played, (beat) => first.a + first.b * beat, first.b);
    ops = align(expected, played, (beat) => beat * msPerBeat, msPerBeat, 0.08);
    first = fitOf(ops, played) ?? first;
  }
  if (first && first.b > 0) {
    // Align against the player's own pulse, bar by bar, so a big tempo change
    // (rushing, a ritardando) can't pull notes onto the wrong beats.
    const guide = localTempo(matchAnchors(ops, expected, played), first, beatsPerBar);
    ops = align(expected, played, guide ? guide.at : (beat) => first.a + first.b * beat, first.b, 0.6);
  }
  const pairs = ops.filter((o) => o.type === 'match' || o.type === 'wrong');

  // Tempo: fit played onset = a + b * beat. Measuring against the player's own
  // tempo means "steady but slow" isn't reported as every note being late.
  const fit = fitOf(ops, played);
  const playedMsPerBeat = fit && fit.b > 0 ? fit.b : msPerBeat;
  const playedBpm = 60000 / playedMsPerBeat;
  const targetBpm = 60000 / msPerBeat;
  const anchors = matchAnchors(ops, expected, played);
  // The local curve is always measured (to report tempo changes); it's only used to
  // judge note timing in the expressive modes — Exam judges against one steady tempo.
  const curve = fit ? localTempo(anchors, fit, beatsPerBar) : null;
  const local = S.expressive ? curve : null;
  const predict = (beat) => (local ? local.at(beat) : fit ? fit.a + fit.b * beat : beat * msPerBeat);
  const beatLen = (beat) => (local ? local.slope(beat) : playedMsPerBeat);

  const notes = expected.map((n) => ({ ...n, status: 'missed' }));
  const judgeTiming = (n, on) => {
    if (!fit) return;
    n.timingBeats = (on - predict(n.beat)) / beatLen(n.beat);
    if (n.status === 'correct' && !n.grace && !n.ornament && Math.abs(n.timingBeats) > S.timing) n.status = n.timingBeats < 0 ? 'early' : 'late';
  };
  for (const o of ops) {
    if (o.type === 'match' || o.type === 'wrong') {
      const p = played[o.p];
      const n = notes[o.e];
      n.status = o.type === 'match' ? 'correct' : 'wrong';
      n.playedMidi = p.midi;
      n.on = p.on;
      n.off = p.off;
      judgeTiming(n, p.on);
      if (p.off != null) {
        n.heldBeats = (p.off - p.on) / beatLen(n.beat);
        n.cutShort = n.beats >= 1 && !n.ornament && n.artic !== 'staccato' && n.heldBeats < n.beats * 0.5;
      }
      n.velocity = p.velocity;
    }
  }
  let extras = ops.filter((o) => o.type === 'extra').map((o) => played[o.p]);

  // An extra note and a missed note at the same moment is really one note: a wrong
  // one, or — same pitch — the right one that the alignment paired up badly.
  if (fit) {
    for (const n of notes) {
      if (n.status !== 'missed') continue;
      const at = predict(n.beat);
      const sub = extras
        .filter((e) => Math.abs(e.on - at) < 0.3 * beatLen(n.beat) && Math.abs(e.midi - n.midi) <= 12)
        .sort((x, y) => Math.abs(x.midi - n.midi) - Math.abs(y.midi - n.midi))[0];
      if (!sub) continue;
      n.playedMidi = sub.midi;
      n.on = sub.on;
      n.off = sub.off;
      n.velocity = sub.velocity;
      n.status = sub.midi !== n.midi ? 'wrong' : 'correct';
      judgeTiming(n, sub.on);
      extras = extras.filter((e) => e !== sub);
    }
  }

  // Grace notes are decorations: leaving one out isn't a mistake worth a red mark.
  for (const n of notes) if (n.grace && n.status === 'missed') n.status = 'optional';

  // Notes after the last thing played: the student stopped, they didn't "miss" them.
  let lastPlayed = -1;
  notes.forEach((n, i) => { if (n.status !== 'missed' && n.status !== 'optional') lastPlayed = i; });
  const stoppedAt = lastPlayed >= 0 && notes.length - 1 - lastPlayed >= 3 ? notes[lastPlayed + 1] : null;
  if (stoppedAt) for (let i = lastPlayed + 1; i < notes.length; i++) notes[i].notReached = true;

  for (const n of notes) {
    if (n.status !== 'missed') continue;
    const at = predict(n.beat);
    if (unclear.some((u) => u.midi === n.midi && Math.abs(u.on - at) < 0.5 * beatLen(n.beat))) n.status = 'unclear';
  }

  const count = (s) => notes.filter((n) => n.status === s).length;
  const rightPitch = notes.filter((n) => ['correct', 'early', 'late'].includes(n.status)).length;
  const judged = notes.length - count('unclear') - count('optional');
  const pitchAccuracy = judged ? rightPitch / judged : 0;
  const timed = notes.filter((n) => n.timingBeats != null && !n.grace && !n.ornament);
  const inTime = timed.filter((n) => Math.abs(n.timingBeats) <= S.timing).length;
  const rhythmAccuracy = timed.length ? inTime / timed.length : 0;
  const steadinessMs = fit ? fit.residualSd : null;
  const tempoRatio = playedBpm / targetBpm;
  const tempoScore = Math.max(0, 1 - Math.abs(1 - tempoRatio) * 2);
  const extraPenalty = Math.min(0.2, extras.length * 0.03);

  let scoreValue = pairs.length
    ? Math.round(Math.max(0, pitchAccuracy * 60 + rhythmAccuracy * 30 + tempoScore * 10 - extraPenalty * 100))
    : 0;

  // Tempo drift: compare first-half vs second-half tempo.
  let drift = null;
  if (anchors.length >= 8) {
    const half = Math.floor(anchors.length / 2);
    const a = regress(anchors.slice(0, half));
    const b = regress(anchors.slice(half));
    if (a.b > 0 && b.b > 0) drift = 60000 / b.b - 60000 / a.b; // + = sped up
  }
  const barOf = (beat) => Math.floor(beat / beatsPerBar + 1e-9) + 1 + (score?.barOffset ?? 0);
  const tempoChanges = curve ? findTempoChanges(curve, anchors, beatsPerBar, barOf) : [];
  // Rushing isn't rubato: a run that runs away from its own tempo can't score as "ready".
  const rushed = tempoChanges.some((c) => c.kind === 'faster' && c.extreme / c.median >= 1.15);
  if (rushed) scoreValue = Math.min(scoreValue, 85);

  // Worst bar = where a teacher would point first.
  const barErrors = {};
  for (const n of notes) if (!['correct', 'unclear', 'optional'].includes(n.status) && !n.notReached) barErrors[n.bar] = (barErrors[n.bar] || 0) + 1;
  for (const e of extras) {
    if (!fit) continue;
    const bar = barOf((e.on - fit.a) / playedMsPerBeat);
    if (bar >= 1) barErrors[bar] = (barErrors[bar] || 0) + 1;
  }
  const worst = Object.entries(barErrors).sort((a, b) => b[1] - a[1])[0];
  const worstBar = worst ? Number(worst[0]) : null;

  const velocities = notes.filter((n) => n.velocity != null).map((n) => n.velocity);
  const dynamics = source === 'midi' && velocities.length
    ? { min: Math.min(...velocities), max: Math.max(...velocities), avg: velocities.reduce((a, b) => a + b, 0) / velocities.length }
    : null;

  const musicality = source === 'midi'
    ? checkMusicality({ notes, score, pedalEvents, predict, beatLen, barOf })
    : [];

  const result = {
    score: scoreValue, notes, extras, pitchAccuracy, rhythmAccuracy, playedBpm, targetBpm, tempoRatio,
    steadinessMs, drift, worstBar, dynamics, tempoChanges, musicality, strictness, expressive: S.expressive,
    stoppedAtBar: stoppedAt?.bar ?? null, dense: dense && source === 'mic', source,
    spread: spread.map((x) => ({ ...x, bar: barOf(x.beat), beatInBar: (x.beat % beatsPerBar) + 1 })),
    counts: { correct: count('correct'), wrong: count('wrong'), missed: count('missed'), early: count('early'), late: count('late'), extra: extras.length, unclear: count('unclear'), optional: count('optional') },
    cutShort: notes.filter((n) => n.cutShort).length,
  };
  // "Ready" = what a teacher would sign off: every note right, steady, near tempo.
  result.ready = scoreValue >= 90 && pitchAccuracy === 1 && !extras.length && tempoRatio >= 1 - S.tempo && count('unclear') <= notes.length * 0.1
    && !rushed && (strictness !== 'exam' || (rhythmAccuracy >= 0.95 && !tempoChanges.length));
  result.feedback = feedback(result, S);
  return result;
}

// ---- Ornaments --------------------------------------------------------------------
function absorbOrnaments(expected, played, timeOf, msPerBeat) {
  const drop = new Set();
  const replace = new Map();
  for (const n of expected) {
    if (!n.ornament) continue;
    const start = timeOf(n.beat) - 0.2 * msPerBeat;
    const end = timeOf(n.beat + Math.max(n.beats, 0.25)) - 0.08 * msPerBeat;
    const inside = played
      .map((p, j) => ({ p, j }))
      .filter(({ p, j }) => !drop.has(j) && p.on >= start && p.on < end && Math.abs(p.midi - n.midi) <= 2);
    if (inside.length < 2) continue;
    const firstNote = inside[0];
    // Trills may start on the upper note; the ornament as a whole counts as the written note.
    replace.set(firstNote.j, { ...firstNote.p, midi: n.midi, off: Math.max(...inside.map(({ p }) => p.off ?? p.on)) });
    inside.slice(1).forEach(({ j }) => drop.add(j));
  }
  return played.map((p, j) => replace.get(j) ?? p).filter((_, j) => !drop.has(j));
}

const matchAnchors = (ops, expected, played) => ops
  .filter((o) => o.type === 'match' && !expected[o.e].grace && !expected[o.e].ornament)
  .map((o) => [expected[o.e].beat, played[o.p].on]);

// ---- Local tempo (rubato) ---------------------------------------------------------
// Weighted linear fit around each beat (Gaussian, ~half a bar wide). Follows gradual
// tempo changes, so notes are judged against where the player's own pulse was.
// Anchors that sit far off the curve (slips, mis-paired notes) are dropped and the
// curve refitted, so they can't bend it.
function localTempo(points, fit, beatsPerBar) {
  if (points.length < 6) return null;
  let curve = buildLocal(points, fit, beatsPerBar);
  for (let iter = 0; iter < 2; iter++) {
    const keep = points.filter(([x, y]) => Math.abs(y - curve.at(x)) <= 0.75 * curve.slope(x));
    if (keep.length === points.length || keep.length < 6) break;
    curve = buildLocal(keep, fit, beatsPerBar);
    points = keep;
  }
  return curve;
}

function buildLocal(points, fit, beatsPerBar) {
  // ~half a bar: tight enough to follow a one-bar ritardando, wide enough to
  // smooth over single uneven notes.
  const sigma = Math.max(1.5, beatsPerBar / 2);
  const cache = new Map();
  const fitAt = (x0) => {
    const key = Math.round(x0 * 8);
    if (cache.has(key)) return cache.get(key);
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [x, y] of points) {
      const w = Math.exp(-0.5 * ((x - x0) / sigma) ** 2);
      sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y;
    }
    let r = { a: fit.a, b: fit.b };
    const den = sw * sxx - sx * sx;
    if (sw > 2.5 && Math.abs(den) > 1e-9) {
      const b = (sw * sxy - sx * sy) / den;
      // Keep the local tempo within a sane range of the global one.
      if (b > fit.b * 0.5 && b < fit.b * 2) r = { a: (sy - b * sx) / sw, b };
    }
    cache.set(key, r);
    return r;
  };
  return {
    at: (x) => { const f = fitAt(x); return f.a + f.b * x; },
    slope: (x) => fitAt(x).b,
  };
}

function findTempoChanges(local, anchors, beatsPerBar, barOf) {
  if (anchors.length < 8) return [];
  const lastBeat = Math.max(...anchors.map(([x]) => x));
  const bars = [];
  for (let b = 0; b * beatsPerBar <= lastBeat; b++) bars.push({ bar: barOf(b * beatsPerBar), bpm: 60000 / local.slope(b * beatsPerBar + beatsPerBar / 2) });
  if (bars.length < 3) return [];
  // Reference = the tempo the player set at the start, the way a teacher hears it
  // ("you started at 90 and sped up from bar 4").
  const opening = bars.slice(0, Math.min(2, bars.length)).map((x) => x.bpm);
  const median = opening.reduce((a, b) => a + b, 0) / opening.length;
  const out = [];
  let run = null;
  for (const b of bars) {
    const dev = b.bpm / median - 1;
    const kind = dev <= -0.12 ? 'slower' : dev >= 0.12 ? 'faster' : null;
    if (kind && run && run.kind === kind) {
      run.to = b.bar;
      run.extreme = kind === 'slower' ? Math.min(run.extreme, b.bpm) : Math.max(run.extreme, b.bpm);
    } else {
      if (run) out.push(run);
      run = kind ? { kind, from: b.bar, to: b.bar, extreme: b.bpm, median } : null;
    }
  }
  if (run) out.push(run);
  return out.map((r) => ({ ...r, extreme: Math.round(r.extreme), median: Math.round(r.median) }));
}

// ---- Musicality (MIDI only: exact velocities, note-offs and pedal) -----------------
function checkMusicality({ notes, score, pedalEvents, predict, beatLen, barOf }) {
  const out = [];
  const playedNotes = notes.filter((n) => n.on != null && n.status !== 'wrong');

  // Dynamics against the markings: each change of marking should be heard.
  const segments = [];
  for (const n of playedNotes) {
    if (!n.dyn || n.velocity == null) continue;
    const last = segments[segments.length - 1];
    if (last && last.mark === n.dyn) last.v.push(n.velocity);
    else segments.push({ mark: n.dyn, bar: n.bar, v: [n.velocity] });
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1];
    const b = segments[i];
    const d = (DYNAMIC_LEVELS[b.mark] ?? 5) - (DYNAMIC_LEVELS[a.mark] ?? 5);
    if (!d || a.v.length < 2 || b.v.length < 2) continue;
    const dv = mean(b.v) - mean(a.v);
    if (d > 0 && dv < 0.025 * d) out.push({ kind: 'warn', area: 'dynamics', bar: b.bar, text: `Bar ${b.bar} is marked ${b.mark}, but it wasn't louder than the ${a.mark} before it. Make the change clear.` });
    if (d < 0 && -dv < 0.025 * -d) out.push({ kind: 'warn', area: 'dynamics', bar: b.bar, text: `Bar ${b.bar} is marked ${b.mark}, but it wasn't softer than the ${a.mark} before it. Drop the volume there.` });
  }
  if (!segments.length && playedNotes.length > 8) {
    const v = playedNotes.map((n) => n.velocity).filter((x) => x != null);
    if (v.length && Math.max(...v) - Math.min(...v) < 0.12) out.push({ kind: 'warn', area: 'dynamics', text: 'Every note was the same volume. Try shaping the phrase: grow louder towards the high point, softer at the end.' });
  }

  // Voicing: in chords, the top note of the right hand usually carries the melody.
  const events = new Map();
  for (const n of playedNotes) {
    if (n.velocity == null) continue;
    if (!events.has(n.event)) events.set(n.event, []);
    events.get(n.event).push(n);
  }
  const diffs = [];
  for (const group of events.values()) {
    if (group.length < 3) continue;
    const rh = group.filter((n) => (n.staff ?? 1) === 1);
    if (!rh.length) continue;
    const top = rh.reduce((a, b) => (b.midi > a.midi ? b : a));
    const rest = group.filter((n) => n !== top);
    diffs.push(top.velocity - mean(rest.map((n) => n.velocity)));
  }
  if (diffs.length >= 4 && mean(diffs) < 0.03) out.push({ kind: 'warn', area: 'voicing', text: 'Bring out the melody: in the chords, the top note was no louder than the notes underneath. Weight your little finger, lighten the rest.' });

  // Staccato held too long, legato (slurred) notes not joined.
  const longStacc = playedNotes.filter((n) => n.artic === 'staccato' && n.heldBeats != null && n.heldBeats > n.beats * 0.65);
  if (longStacc.length) out.push({ kind: 'warn', area: 'articulation', bar: longStacc[0].bar, text: `${longStacc.length} staccato note${longStacc.length > 1 ? 's were' : ' was'} held too long (e.g. bar ${longStacc[0].bar}). Make them short and light.` });
  const byVoice = new Map();
  for (const n of playedNotes) {
    if (!n.slur || n.off == null) continue;
    const k = `${n.staff ?? 1}|${n.voice ?? 1}`;
    if (!byVoice.has(k)) byVoice.set(k, []);
    byVoice.get(k).push(n);
  }
  let gaps = 0;
  let gapBar = null;
  for (const list of byVoice.values()) {
    list.sort((a, b) => a.beat - b.beat);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const next = list[i];
      if (next.beat - (prev.beat + prev.beats) > 0.05) continue; // not adjacent in the score
      if (next.on - prev.off > Math.max(60, 0.15 * beatLen(next.beat))) {
        gaps++;
        gapBar ??= next.bar;
      }
    }
  }
  if (gaps >= 2) out.push({ kind: 'warn', area: 'articulation', bar: gapBar, text: `The slurred (legato) notes weren't joined (${gaps} gaps, e.g. bar ${gapBar}). Hold each note until the next one sounds.` });

  // Pedal: against the score's pedal marks.
  const marks = score?.pedal ?? [];
  if (pedalEvents && marks.length) {
    if (!pedalEvents.length) {
      out.push({ kind: 'warn', area: 'pedal', text: "This piece is pedalled, but I didn't see the sustain pedal used. Connect your pedal to the keyboard, or add it where marked." });
    } else {
      // Where one mark ends and the next begins, the pedal must come up and go down again.
      const changes = [];
      const sorted = [...marks].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i++) if (Math.abs(sorted[i].start - sorted[i - 1].end) < 0.3) changes.push(sorted[i].start);
      const blurred = changes.filter((beat) => {
        const t = predict(beat);
        const win = 0.6 * beatLen(beat);
        return pedalEvents.some((p) => p.on < t - win && (p.off == null || p.off > t + win));
      });
      if (blurred.length) out.push({ kind: 'warn', area: 'pedal', bar: barOf(blurred[0]), text: `Change the pedal where the harmony changes: you held it through ${blurred.length} pedal change${blurred.length > 1 ? 's' : ''} (e.g. bar ${barOf(blurred[0])}), which blurs the chords. Lift as the new chord sounds, then press again.` });
    }
  }
  return out;
}

// ---- Alignment helpers ------------------------------------------------------------
// Notes of a chord arrive a few ms apart in random order. Group near-simultaneous
// notes and sort each group by pitch, matching how timeline() orders chords.
function orderChords(played) {
  const sorted = [...played].sort((a, b) => a.on - b.on);
  const out = [];
  let group = [];
  for (const p of sorted) {
    if (group.length && p.on - group[0].on > 70) {
      out.push(...group.sort((a, b) => a.midi - b.midi));
      group = [];
    }
    group.push(p);
  }
  return out.concat(group.sort((a, b) => a.midi - b.midi));
}

// Weighted edit-distance alignment of expected vs played notes. Pitch decides
// the match; timing breaks ties so repeated notes (E E E) line up correctly.
// Leaving out a grace note is cheap: it's optional decoration.
function align(expected, played, timeOf, msPerBeat, timingWeight) {
  const n = expected.length;
  const m = played.length;
  const INS = 1;
  const del = (i) => (expected[i].grace ? 0.2 : 1);
  const cost = (i, j) => {
    const dt = Math.min(Math.abs(played[j].on - timeOf(expected[i].beat)) / msPerBeat, 4) * timingWeight;
    return (expected[i].midi === played[j].midi ? 0 : 1.2) + dt;
  };
  // Banded DP: notes can't be matched further apart than ~8 bars' worth of notes,
  // which keeps long pieces fast (a Grade 8 piece has thousands of notes).
  const band = Math.max(64, Math.abs(n - m) + 64);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  D[0][0] = 0;
  for (let i = 1; i <= n; i++) D[i][0] = D[i - 1][0] + del(i - 1);
  for (let j = 1; j <= m; j++) D[0][j] = j * INS;
  for (let i = 1; i <= n; i++) {
    const center = Math.round((i * m) / Math.max(1, n));
    const lo = Math.max(1, center - band);
    const hi = Math.min(m, center + band);
    for (let j = lo; j <= hi; j++) {
      D[i][j] = Math.min(D[i - 1][j - 1] + cost(i - 1, j - 1), D[i - 1][j] + del(i - 1), D[i][j - 1] + INS);
    }
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + cost(i - 1, j - 1))) < 1e-9) {
      ops.push({ type: expected[i - 1].midi === played[j - 1].midi ? 'match' : 'wrong', e: i - 1, p: j - 1 });
      i--; j--;
    } else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + del(i - 1))) < 1e-9) {
      ops.push({ type: 'missed', e: i - 1 });
      i--;
    } else if (j > 0) {
      ops.push({ type: 'extra', p: j - 1 });
      j--;
    } else {
      ops.push({ type: 'missed', e: i - 1 });
      i--;
    }
  }
  return ops.reverse();
}

// Tempo fit that ignores badly-placed notes, so one slip (or one mis-aligned
// note) can't skew the whole tempo. Consensus fit: every pair of notes implies
// a tempo; keep the one the most notes agree with, then least-squares on those.
export function robustRegress(points) {
  const sample = points.length > 120 ? points.filter((_, i) => i % Math.ceil(points.length / 120) === 0) : points;
  let best = null;
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const dx = sample[j][0] - sample[i][0];
      if (dx <= 0) continue;
      const b = (sample[j][1] - sample[i][1]) / dx;
      if (b <= 0) continue;
      const a = sample[i][1] - b * sample[i][0];
      let inliers = 0, err = 0;
      for (const [x, y] of points) {
        const r = Math.abs(y - (a + b * x));
        if (r <= 0.25 * b) { inliers++; err += r; }
      }
      if (!best || inliers > best.inliers || (inliers === best.inliers && err < best.err)) best = { a, b, inliers, err };
    }
  }
  if (!best || best.inliers < 3) return regress(points);
  return regress(points.filter(([x, y]) => Math.abs(y - (best.a + best.b * x)) <= 0.25 * best.b));
}

function regress(points) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0, sxx = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
  }
  const b = sxx ? sxy / sxx : 0;
  const a = my - b * mx;
  const residualSd = Math.sqrt(points.reduce((acc, [x, y]) => acc + (y - (a + b * x)) ** 2, 0) / n);
  return { a, b, residualSd };
}

const where = (n) => `bar ${n.bar}, beat ${+n.beatInBar.toFixed(2)}`;

// Turn numbers into what a teacher would actually say: specific, prioritised,
// one clear next step.
function feedback(r, S) {
  const lines = [];
  const wrong = r.notes.filter((n) => n.status === 'wrong');
  const missed = r.notes.filter((n) => n.status === 'missed' && !n.notReached);

  if (r.counts.correct + r.counts.early + r.counts.late === 0) {
    return { headline: "I didn't hear the piece. Make sure your keyboard or microphone is working, then try again.", lines: [], next: 'Press Listen first to hear how it goes.' };
  }

  // Dense textures on the mic: only say what we're confident about, and say so.
  const cap = r.dense ? 2 : 3;
  const wrongText = (n) => `${r.dense ? 'Probably a wrong note' : 'Wrong note'} at ${where(n)}: ${r.dense ? 'I heard' : 'you played'} ${midiName(n.playedMidi)}, it should be ${midiName(n.midi)}${n.finger ? ` (finger ${n.finger})` : ''}.`;
  for (const n of wrong.slice(0, cap)) lines.push({ kind: 'bad', text: wrongText(n) });
  if (wrong.length > cap) lines.push({ kind: 'bad', text: `…and ${wrong.length - cap} more wrong notes.` });
  if (r.stoppedAtBar) lines.push({ kind: 'bad', text: `You stopped at bar ${r.stoppedAtBar}. Play through to the end, even with mistakes. Stopping is a habit that's hard to break.` });
  for (const n of missed.slice(0, 2)) lines.push({ kind: 'bad', text: `Missed ${midiName(n.midi)} at ${where(n)}.` });
  if (missed.length > 2) lines.push({ kind: 'bad', text: `…and ${missed.length - 2} more missed notes.` });
  if (r.counts.unclear) lines.push({ kind: 'warn', text: `${r.counts.unclear} note${r.counts.unclear > 1 ? 's were' : ' was'} unclear to the microphone and not counted. Move the device closer to the piano, or use less pedal.` });
  if (r.counts.extra) lines.push({ kind: 'warn', text: `${r.counts.extra} extra note${r.counts.extra > 1 ? 's' : ''}, usually a slip or a restart. Keep going through mistakes instead of fixing them mid-piece.` });

  const pct = Math.round((r.tempoRatio - 1) * 100);
  if (Math.abs(r.tempoRatio - 1) >= S.tempo) lines.push({ kind: 'warn', text: `You played at about ${Math.round(r.playedBpm)} bpm; the target was ${Math.round(r.targetBpm)} (${pct > 0 ? `${pct}% too fast` : `${-pct}% too slow`}).` });
  else lines.push({ kind: 'good', text: `Tempo was on target (~${Math.round(r.playedBpm)} bpm).` });

  for (const c of r.tempoChanges.slice(0, 2)) {
    const span = c.from === c.to ? `bar ${c.from}` : `bars ${c.from}–${c.to}`;
    const what = c.kind === 'slower' ? `slowed to ~${c.extreme} bpm` : `sped up to ~${c.extreme} bpm`;
    lines.push({
      kind: S.expressive ? 'warn' : 'bad',
      text: S.expressive
        ? `You ${what} in ${span} (you started at ~${c.median}). ${c.kind === 'faster' ? "That's rushing, not rubato: keep the pulse steady." : "Fine if it's an intended slowing; if not, keep the pulse steady there."}`
        : `You ${what} in ${span} (you started at ~${c.median}). For an exam, hold the tempo steady.`,
    });
  }
  if (!r.tempoChanges.length && r.drift != null && Math.abs(r.drift) >= 6) lines.push({ kind: 'warn', text: r.drift > 0 ? `You sped up by ~${Math.round(r.drift)} bpm in the second half, a classic sign of rushing the parts you know.` : `You slowed down by ~${Math.round(-r.drift)} bpm in the second half, so the end may need extra practice.` });

  const off = r.notes.filter((n) => n.status === 'early' || n.status === 'late');
  if (off.length) {
    const early = off.filter((n) => n.status === 'early').length;
    lines.push({ kind: 'warn', text: `${off.length} note${off.length > 1 ? 's were' : ' was'} out of time (${early} early, ${off.length - early} late), e.g. ${where(off[0])}.` });
  } else if (r.steadinessMs != null) {
    lines.push({ kind: 'good', text: r.expressive && r.tempoChanges.length ? 'Note-to-note rhythm was even.' : 'Rhythm was steady. Nice.' });
  }
  if (r.spread.length) {
    const first = r.spread[0];
    lines.push({ kind: 'warn', text: `${r.spread.length === 1 ? 'A chord was' : `${r.spread.length} chords were`} not played together (e.g. bar ${first.bar}, beat ${+first.beatInBar.toFixed(2)}: notes ~${first.ms} ms apart). Place your hand over the chord first, then press all the keys at once.` });
  }
  if (r.cutShort) lines.push({ kind: 'warn', text: `${r.cutShort} long note${r.cutShort > 1 ? 's were' : ' was'} released too early. Hold notes for their full value.` });
  for (const m of r.musicality) lines.push(m);
  if (r.dense) lines.push({ kind: 'warn', text: "This piece is dense for the microphone, so I've only flagged notes I'm fairly sure about. For full note-by-note checking, use a MIDI keyboard." });

  let headline, next;
  const slower = Math.max(40, Math.round((Math.min(r.playedBpm, r.targetBpm) * 0.8) / 4) * 4);
  if (r.stoppedAtBar) {
    headline = 'Keep going to the end.';
    next = `Play the whole piece at ${slower} bpm without stopping. Fix mistakes afterwards, not mid-piece.`;
  } else if (r.pitchAccuracy < 0.8) {
    headline = 'Notes first, speed later.';
    next = `Practise ${r.worstBar ? `bar ${r.worstBar}` : 'the tricky bars'} on its own, slowly, 3 times correctly in a row, then play the whole piece at ${slower} bpm.`;
  } else if (r.rhythmAccuracy < 0.8) {
    headline = 'Right notes. Now lock in the rhythm.';
    next = `Turn the metronome on and play at ${slower} bpm. Count out loud.`;
  } else if (r.tempoChanges.some((c) => c.kind === 'faster' && c.extreme / c.median >= 1.15)) {
    const c = r.tempoChanges.find((x) => x.kind === 'faster');
    headline = 'Keep a steady pulse.';
    next = `Play with the metronome on at ${Math.round(r.targetBpm)} bpm and don't let it pull ahead from bar ${c.from}.`;
  } else if (r.tempoRatio < 1 - S.tempo) {
    headline = 'Accurate and steady. Time to build speed.';
    next = `Next run: ${Math.min(Math.round(r.targetBpm), Math.round(r.playedBpm / 4) * 4 + 8)} bpm.`;
  } else if (r.ready && r.musicality.length) {
    headline = 'Notes and rhythm are secure. Now the music.';
    next = r.musicality[0].text;
  } else if (r.ready) {
    headline = 'Excellent. This piece is ready.';
    next = 'Move on to the next piece, and come back to this one in a few days to keep it fresh.';
  } else {
    headline = 'Good run. Polish the details.';
    next = r.worstBar ? `Spot-practise bar ${r.worstBar}, then play it through once more.` : 'Play it through once more, aiming for zero slips.';
  }
  return { headline, lines, next };
}
