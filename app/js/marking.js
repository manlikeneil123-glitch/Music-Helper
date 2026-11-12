// Examiner-style marking: turns one play-through (analysis.js result) into an
// estimated exam mark against the board's own criteria.
//
//   ABRSM: each piece out of 30, judged on Pitch, Time, Tone, Shape and Performance
//          (Distinction 27–30, Merit 24–26, Pass 20–23, below 17–19 and 13–16).
//   Trinity: each piece out of 22: Notational accuracy & fluency (7), Technical
//          facility (7), Communication & interpretation (8)
//          (bands used: Distinction 19–22, Merit 17–18, Pass 13–16, below 10–12).
//
// Always an *estimate*, and on purpose slightly stricter than a real examiner (owner
// decision): Distinction only when every measured criterion is at least Merit, and
// the overall band never more than one above the weakest criterion. Tone and shape
// are rough with the microphone (it hears loudness, not tone quality).
import { load } from './store.js';
import { examSpec, isPerformance } from './exam.js';

const clamp = (x) => Math.max(0, Math.min(1, x));
const BANDS = ['below', 'pass', 'merit', 'distinction'];
export const BAND_NAME = { distinction: 'Distinction', merit: 'Merit', pass: 'Pass', below: 'Below pass' };

// Quality 0..1 → band. Same cut-offs as exam.js pieceReadiness.
const bandOf = (q) => (q >= 0.95 ? 'distinction' : q >= 0.88 ? 'merit' : q >= 0.78 ? 'pass' : 'below');
const Q = { below: [0.5, 0.78], pass: [0.78, 0.88], merit: [0.88, 0.95], distinction: [0.95, 1] };

/** The board and exam type to mark against: the exam plan, else setup, else ABRSM. */
export function markingBoard() {
  const exam = load('exam', null);
  const p = load('profile', null);
  const board = exam?.board ?? (['ABRSM', 'Trinity'].includes(p?.board) ? p.board : 'ABRSM');
  return { board, type: exam?.type ?? p?.examType ?? 'practical' };
}

/** A quality 0..1 as a mark out of `of`, inside the band's published range. */
function markFor(q, bands, of) {
  const band = bandOf(q);
  const [lo, hi] = band === 'below' ? [Math.round(bands.below[0] * 0.75), bands.below[1]] : bands[band];
  const [qa, qb] = Q[band];
  const t = clamp((q - qa) / (qb - qa));
  return Math.min(of, Math.round(lo + t * (hi - lo)));
}

// How many changes of dynamic marking the player made heard. The MIDI check only
// reports the misses, so count the changes in the score; the mic reports both.
function dynamicsFollowed(r, goods, misses) {
  if (r.source !== 'midi') return { marked: goods + misses, followed: goods };
  let changes = 0;
  let last = null;
  for (const n of r.notes ?? []) {
    if (!n.dyn || n.on == null) continue;
    if (last && n.dyn !== last) changes++;
    last = n.dyn;
  }
  return { marked: changes, followed: Math.max(0, changes - misses) };
}

/** Measures 0..1 for each thing an examiner listens for. null = can't tell. */
function measure(r) {
  const total = Math.max(1, r.notes?.length ?? 0);
  const reached = r.notes ? r.notes.filter((n) => !n.notReached).length / total : 1;
  const musical = r.musicality ?? [];
  const pitch = clamp((r.pitchAccuracy ?? 0) - 0.5 * ((r.counts?.extra ?? 0) / total));

  const ratio = r.tempoRatio ?? 1;
  const tempoQ = ratio <= 1 ? clamp((ratio - 0.6) / 0.4) : clamp(1 - (ratio - 1) * 2);
  const rushed = (r.tempoChanges ?? []).some((c) => c.kind === 'faster' && c.extreme / c.median >= 1.15);
  let time = 0.4 * (r.rhythmAccuracy ?? 0) + 0.3 * ((r.pulse?.score ?? (r.rhythmAccuracy ?? 0) * 100) / 100) + 0.3 * tempoQ;
  if (rushed) time = Math.min(time, 0.87);

  // Tone: range and control of sound. Shape: dynamics and articulation as marked.
  const hasSound = r.source === 'midi' ? Boolean(r.dynamics) : r.source === 'mic' && !r.dense;
  const warn = (areas, withBar) => musical.filter((m) => m.kind === 'warn' && areas.includes(m.area) && (withBar == null || Boolean(m.bar) === withBar)).length;
  const good = (areas) => musical.filter((m) => m.kind === 'good' && areas.includes(m.area)).length;
  const flat = warn(['dynamics'], false) > 0;
  let tone = null;
  let shape = null;
  let dyn = { marked: 0, followed: 0 };
  if (hasSound) {
    const range = r.dynamics ? r.dynamics.max - r.dynamics.min : flat ? 0 : 0.2;
    tone = clamp(0.8 + Math.min(0.17, range * 0.6) - 0.05 * warn(['voicing', 'pedal']) - (flat ? 0.06 : 0));
    dyn = dynamicsFollowed(r, good(['dynamics']), warn(['dynamics'], true));
    shape = clamp((dyn.marked ? 0.8 + 0.17 * (dyn.followed / dyn.marked) : 0.86) - 0.05 * warn(['articulation']) - (flat ? 0.06 : 0));
  }

  const c = r.continuity;
  const kept = c ? c.score / 100 : 0.8;
  const recovered = c?.slips ? c.recovered / c.slips : 1;
  let performance = 0.55 * kept + 0.25 * clamp(reached) + 0.2 * recovered;
  if (r.stoppedAtBar != null || reached < 0.9) performance = Math.min(performance, 0.77);

  return { pitch, time, tone, shape, performance, rushed, reached, tempoQ, flat, ...dyn };
}

// One short, specific comment per criterion, like the examiner's sheet.
function comments(r, m) {
  const wrong = (r.counts?.wrong ?? 0) + (r.counts?.missed ?? 0) + (r.counts?.extra ?? 0);
  const rush = (r.tempoChanges ?? []).find((c) => c.kind === 'faster');
  const ratio = r.tempoRatio ?? 1;
  const stops = r.continuity?.hesitations?.filter((h) => h.stop) ?? [];
  return {
    pitch: wrong ? `${wrong} wrong, missed or extra note${wrong === 1 ? '' : 's'}${r.worstBar ? `, most in bar ${r.worstBar}` : ''}.` : 'All the notes were right.',
    time: m.rushed && rush ? `You rushed from bar ${rush.from}.` : ratio < 0.9 ? `Slower than the marked speed (${Math.round(r.playedBpm)} of ${Math.round(r.targetBpm)}).` : ratio > 1.1 ? 'Faster than the marked speed, so control slipped.' : (r.pulse?.score ?? 100) < 80 ? 'The pulse wobbled in places.' : 'Steady pulse at a good speed.',
    tone: m.tone == null ? 'The microphone couldn\'t hear this clearly, so it counts as Pass level.' : m.flat ? 'Little difference between loud and soft.' : m.tone >= 0.9 ? 'A good range of sound.' : 'Some contrast; make loud and soft more different.',
    shape: m.shape == null ? 'The microphone couldn\'t hear this clearly, so it counts as Pass level.' : m.marked ? `${m.followed} of ${m.marked} changes of dynamic came through.` : m.shape >= 0.88 ? 'Phrases had some shape.' : 'Shape the phrases more: grow towards the high points.',
    performance: stops.length ? `Stopped at bar ${stops[0].bar}. Keep going whatever happens.` : r.continuity?.slips ? `Kept going after ${r.continuity.recovered} of ${r.continuity.slips} slip${r.continuity.slips === 1 ? '' : 's'}.` : m.reached < 0.9 ? 'Didn\'t reach the end.' : 'Kept going confidently to the end.',
  };
}

// The overall band can't be more than one above the weakest criterion, and
// Distinction needs every measured criterion at Merit or better.
function strict(q, parts, reached = 1) {
  if (reached < 0.75) q = Math.min(q, 0.7); // most of the piece unplayed can't pass
  const bands = parts.map((x) => bandOf(x ?? 0.86));
  const weakest = Math.min(...bands.map((b) => BANDS.indexOf(b)));
  let cap = Math.min(3, weakest + 1);
  if (weakest < 2) cap = Math.min(cap, 2);
  return Math.min(q, [0.779, 0.879, 0.949, 1][cap]);
}

/**
 * The estimated mark for one play-through.
 * Returns { board, of, mark, band, criteria: [{ id, label, band, mark?, max?, comment }], rough }.
 */
export function examMark(r, board = 'ABRSM', type = 'practical') {
  const m = measure(r);
  const say = comments(r, m);
  const spec = examSpec(board, type).piece;
  const rough = r.source === 'mic' || m.tone == null;
  // What couldn't be heard counts as Pass level: strict, so it can't hand out marks.
  const UNHEARD = 0.86;
  const weighted = (pairs) => {
    const live = pairs.map(([q, k]) => [q ?? UNHEARD, k]);
    const w = live.reduce((a, [, k]) => a + k, 0);
    return live.reduce((a, [q, k]) => a + q * k, 0) / w;
  };

  if (board === 'Trinity') {
    const scale = spec.marks / 22; // repertoire-only pieces are out of 25
    const areas = [
      { id: 'accuracy', label: 'Accuracy and fluency', max: Math.round(7 * scale), q: weighted([[m.pitch, 0.6], [r.rhythmAccuracy ?? 0, 0.25], [m.performance, 0.15]]), comment: `${say.pitch} ${say.performance}` },
      { id: 'technical', label: 'Technical facility', max: Math.round(7 * scale), q: weighted([[m.time, 0.5], [m.tone, 0.25], [m.shape, 0.25]]), comment: `${say.time}${m.tone != null ? ` ${say.tone}` : ''}` },
      { id: 'communication', label: 'Communication and interpretation', max: spec.marks - 2 * Math.round(7 * scale), q: weighted([[m.shape, 0.4], [m.performance, 0.3], [m.tone, 0.3]]), comment: m.shape != null ? say.shape : say.performance },
    ];
    const q = strict(weighted(areas.map((a) => [a.q, a.max])), areas.map((a) => a.q), m.reached);
    const mark = markFor(q, spec.bands, spec.marks);
    // Share the total out across the areas in proportion to how each went.
    let left = mark;
    const share = areas.map((a, i) => {
      const want = i === areas.length - 1 ? left : Math.min(a.max, Math.round((mark * a.max * a.q) / areas.reduce((s, x) => s + x.max * x.q, 0)));
      left -= want;
      return Math.max(0, Math.min(a.max, want));
    });
    return {
      board, of: spec.marks, mark, band: bandOf(q), rough,
      criteria: areas.map((a, i) => ({ id: a.id, label: a.label, max: a.max, mark: share[i], band: bandOf(a.q), comment: a.comment })),
    };
  }

  const parts = [
    ['pitch', 'Pitch', m.pitch, 0.25], ['time', 'Time', m.time, 0.25], ['tone', 'Tone', m.tone, 0.15],
    ['shape', 'Shape', m.shape, 0.15], ['performance', 'Performance', m.performance, 0.2],
  ];
  const q = strict(weighted(parts.map(([, , x, w]) => [x, w])), parts.map(([, , x]) => x), m.reached);
  return {
    board, of: spec.marks, mark: markFor(q, spec.bands, spec.marks), band: bandOf(q), rough,
    criteria: parts.map(([id, label, x]) => ({ id, label, band: x == null ? null : bandOf(x), comment: say[id] })),
  };
}

/** A saved run's mark: its own if it has one, else estimated from its old /100 score. */
export function runMark(h, { board, type } = markingBoard()) {
  if (h?.mark != null) return { mark: h.mark, of: h.of, band: h.band };
  if (h?.score == null) return null;
  const spec = examSpec(board, type).piece;
  const q = clamp(h.score / 100);
  return { mark: markFor(q, spec.bands, spec.marks), of: spec.marks, band: bandOf(q) };
}

export const markText = (m) => (m ? `${m.mark}/${m.of}` : '–');
/** The highest mark among some runs, or null. */
export const bestMark = (runs, board) => runs.map((h) => runMark(h, board)).filter(Boolean).reduce((a, m) => (!a || m.mark / m.of > a.mark / a.of ? m : a), null);
/** good / warn / bad colouring for a band. */
export const bandTone = (band) => (band === 'distinction' || band === 'merit' ? 'good' : band === 'pass' ? 'warn' : 'bad');
export const isPerformanceType = isPerformance;
