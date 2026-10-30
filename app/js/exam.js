// The exam itself: what each board marks, how ready each part is, and what to do in
// the weeks left. Pure functions — examview.js draws it, tests call it directly.
//
// Readiness is a *Pitch & Time* band measured from real runs, mapped onto the
// published mark bands. It is never presented as a mark: tone, shape and
// performance (and everything an examiner hears in the room) aren't measured.

export const BOARDS = {
  ABRSM: {
    total: 150, pass: 100, merit: 120, distinction: 130,
    piece: { count: 3, marks: 30, labels: ['List A', 'List B', 'List C'], bands: { distinction: [27, 30], merit: [24, 26], pass: [20, 23], below: [17, 19] } },
    parts: (grade) => [
      { id: 'scales', label: 'Scales and arpeggios', marks: 21 },
      { id: 'sight', label: 'Sight-reading', marks: 21 },
      { id: 'aural', label: 'Aural tests', marks: 18 },
    ],
  },
  Trinity: {
    total: 100, pass: 60, merit: 75, distinction: 87,
    piece: { count: 3, marks: 22, labels: ['Piece 1', 'Piece 2', 'Piece 3'], bands: { distinction: [19, 22], merit: [17, 18], pass: [13, 16], below: [10, 12] } },
    // Supporting tests: two of four up to Grade 5; from Grade 6 sight reading is
    // compulsory plus aural or improvisation.
    parts: (grade) => [
      { id: 'technical', label: 'Technical work', marks: 14 },
      grade >= 6
        ? { id: 'sight', label: 'Sight reading', marks: 10 }
        : { id: 'test1', label: 'Supporting test 1', marks: 10, choose: ['Sight reading', 'Aural', 'Improvisation', 'Musical knowledge'] },
      { id: 'test2', label: 'Supporting test 2', marks: 10, choose: grade >= 6 ? ['Aural', 'Improvisation'] : ['Sight reading', 'Aural', 'Improvisation', 'Musical knowledge'] },
    ],
  },
};

// Pieces-only exams: filmed at home and sent in. ABRSM Performance Grades are four
// pieces (30 each) plus 30 for the performance as a whole; Trinity's repertoire-only
// pathway is four pieces and nothing else (100). No scales, arpeggios, sight-reading
// or aural in either.
export const PERFORMANCE = {
  ABRSM: {
    name: 'Performance Grade', total: 150, pass: 100, merit: 120, distinction: 130,
    piece: { count: 4, marks: 30, labels: ['List A', 'List B', 'List C', 'Own choice'], bands: BOARDS.ABRSM.piece.bands },
    parts: () => [{ id: 'whole', label: 'Performance as a whole', marks: 30 }],
  },
  Trinity: {
    name: 'Repertoire-only', total: 100, pass: 60, merit: 75, distinction: 87,
    // 25 a piece; bands scaled from the 100-mark thresholds (60/75/87).
    piece: { count: 4, marks: 25, labels: ['Piece 1', 'Piece 2', 'Piece 3', 'Piece 4'], bands: { distinction: [22, 25], merit: [19, 21], pass: [15, 18], below: [11, 14] } },
    parts: () => [],
  },
};
export const EXAM_TYPES = { practical: 'Practical exam', performance: 'Pieces only' };
export const isPerformance = (type) => type === 'performance';
/** What a board marks for this kind of exam. */
export const examSpec = (board, type) => (isPerformance(type) ? PERFORMANCE[board] ?? PERFORMANCE.ABRSM : BOARDS[board] ?? BOARDS.ABRSM);
/** "Performance Grade" / "Repertoire-only" / "" for a practical. */
export const typeName = (board, type) => (isPerformance(type) ? examSpec(board, type).name : '');

/** "ABRSM Grade 3", "ABRSM Performance Grade 3", "Trinity Grade 3 (repertoire-only)". */
export function examTitle(e) {
  const g = e.grade === 'Initial' ? 'Initial' : `Grade ${e.grade}`;
  if (!isPerformance(e.type)) return `${e.board} ${g}`;
  return e.board === 'ABRSM' ? `ABRSM Performance ${g}` : `${e.board} ${g} (repertoire-only)`;
}

export const GRADES = ['Initial', '1', '2', '3', '4', '5', '6', '7', '8'];
export const gradeNumber = (g) => (g === 'Initial' ? 0 : Number(g));

// Self-ratings for the parts the app can't hear (yet).
export const RATINGS = ['Not started', 'Learning', 'Nearly there', 'Secure'];

const BAND_LABEL = { distinction: 'Distinction level', merit: 'Merit level', pass: 'Pass level', below: 'Below pass' };
export const bandLabel = (b) => BAND_LABEL[b] ?? '';

/**
 * Pitch & Time readiness for one piece from its recent full runs.
 * runs: check history entries (newest last) for the piece, both hands.
 * Uses the last 3 runs from the last 21 days, so one lucky run doesn't count and an
 * old one doesn't linger.
 */
export function pieceReadiness(runs, board = 'ABRSM', now = Date.now(), minRuns = 2, type = 'practical') {
  const recent = runs.filter((r) => (r.hands ?? 'both') === 'both' && now - r.at < 21 * 86400000).slice(-3);
  const spec = examSpec(board, type).piece;
  if (recent.length < minRuns) return { band: null, runs: recent.length, of: spec.marks, note: recent.length ? 'One more full run to get a reading.' : 'No full runs yet.' };
  const avg = (f) => recent.reduce((a, r) => a + f(r), 0) / recent.length;
  // Older runs (before these were recorded) fall back to the overall score.
  const pitch = avg((r) => r.pitch ?? r.score / 100);
  const rhythm = avg((r) => r.rhythm ?? r.score / 100);
  const kept = avg((r) => (r.keptGoing ?? 100) / 100);
  const pulse = avg((r) => (r.pulse ?? 90) / 100);
  // Against the piece's own marked tempo, not whatever the slider was on.
  const tempo = avg((r) => Math.min(1, r.targetBpm ? r.playedBpm / r.targetBpm : 1));
  let composite = pitch * 0.45 + rhythm * 0.25 + kept * 0.15 + pulse * 0.15;
  // Well under tempo can't be better than Pass: the music isn't there yet.
  if (tempo < 0.85) composite = Math.min(composite, 0.86);
  else if (tempo < 0.95) composite = Math.min(composite, 0.93);
  const band = composite >= 0.95 ? 'distinction' : composite >= 0.88 ? 'merit' : composite >= 0.78 ? 'pass' : 'below';
  const [lo, hi] = spec.bands[band];
  const weakest = [['notes', pitch], ['rhythm', rhythm], ['keeping going', kept], ['pulse', pulse], ['tempo', tempo]].sort((a, b) => a[1] - b[1])[0][0];
  return { band, label: bandLabel(band), range: band === 'below' ? `under ${spec.bands.pass[0]}` : `${lo}–${hi}`, of: spec.marks, runs: recent.length, pitch, rhythm, kept, pulse, tempo, weakest };
}

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

// Phases a teacher would use counting back from the exam.
export function phaseFor(days, type = 'practical') {
  if (isPerformance(type)) return performancePhase(days);
  if (days == null) return null;
  if (days < 0) return { id: 'after', title: 'Exam done', text: 'Results usually arrive within a few weeks. Time to choose what comes next.' };
  if (days === 0) return { id: 'today', title: 'Exam day', text: 'Warm up gently, play each piece through once slowly, then stop. Trust your practice.' };
  if (days <= 7) return { id: 'final', title: 'Final week', text: 'One mock exam early in the week, then shorter sessions. No new fixes in the last two days: just play through calmly.' };
  if (days <= 28) return { id: 'polish', title: 'Polish', text: 'Full runs in Exam conditions (no metronome, no stopping), a mock exam each week, and every scale every few days.' };
  if (days <= 56) return { id: 'build', title: 'Build', text: 'Bring pieces up to tempo, fix trouble bars, and start daily sight-reading. Cover your whole scale list every week.' };
  return { id: 'learn', title: 'Learn', text: 'Learn the notes and rhythm securely, hands separately first, in sections. Speed comes later.' };
}

// The same countdown for a pieces-only exam: the programme, played as one performance.
function performancePhase(days) {
  if (days == null) return null;
  if (days < 0) return { id: 'after', title: 'Sent in', text: 'Results usually arrive within a few weeks. Time to choose what comes next.' };
  if (days === 0) return { id: 'today', title: 'Filming day', text: 'Warm up, then record the whole programme in one take. If it goes wrong, rest and try again: you can film as many times as you like.' };
  if (days <= 7) return { id: 'final', title: 'Final week', text: 'Film two practice takes of the whole programme and watch them back. No new fixes in the last two days.' };
  if (days <= 28) return { id: 'polish', title: 'Polish', text: 'Full runs in Exam conditions, and the whole programme in order once a week: walk on, pause between pieces, no restarts.' };
  if (days <= 56) return { id: 'build', title: 'Build', text: 'Bring pieces up to tempo, fix trouble bars, and start playing two pieces back to back.' };
  return { id: 'learn', title: 'Learn', text: 'Learn the notes and rhythm securely, hands separately first, in sections. Choose your fourth piece now.' };
}

/**
 * This week's targets for each part, from the phase and how ready each part is.
 * exam: { board, grade, date, pieces: [{ title, pieceId, readiness }], ratings: { partId: 0..3 } }
 */
export function weekTargets(exam, now = new Date()) {
  const days = daysUntil(exam.date, now);
  const phase = phaseFor(days, exam.type);
  if (!phase || phase.id === 'after') return [];
  const out = [];
  const spec = examSpec(exam.board, exam.type);
  exam.pieces.slice(0, spec.piece.count).forEach((p, i) => {
    const name = p.title || `Piece ${i + 1}`;
    const r = p.readiness;
    if (!p.pieceId) out.push({ part: name, text: 'Import or link the score so the app can check it, or ask your teacher to.' });
    else if (!r?.band) out.push({ part: name, text: phase.id === 'learn' ? 'Learn it in sections ("Add a bar at a time"), hands separately first.' : 'Two full runs this week so the app can measure it.' });
    else if (r.band === 'below') out.push({ part: name, text: `Notes and rhythm first: practise the trouble bars slowly. Weakest: ${r.weakest}.` });
    else if (r.band === 'pass') out.push({ part: name, text: r.weakest === 'tempo' ? 'Raise the tempo 4–8 bpm a week, only after a clean run.' : `Pass level for pitch and time. Work on ${r.weakest}.` });
    else if (r.band === 'merit') out.push({ part: name, text: ['polish', 'final'].includes(phase.id) ? 'Two runs in Exam conditions this week, no stopping.' : `Merit level. Push ${r.weakest} for Distinction.` });
    else out.push({ part: name, text: 'Distinction level for pitch and time. Keep it fresh with one run every few days, and work on the music: dynamics, shape, character.' });
  });
  for (const part of spec.parts(gradeNumber(exam.grade))) {
    if (part.id === 'whole') {
      out.push({ part: part.label, text: days <= 28 ? 'Play all four pieces in order as one performance, filmed, and watch it back like an examiner.' : 'Once this week, play two pieces back to back as if someone were watching: start, pause, start again.' });
      continue;
    }
    const rating = exam.ratings?.[part.id] ?? 0;
    const what = exam.choices?.[part.id] ?? part.label;
    if (rating >= 3 && !['polish', 'final'].includes(phase.id)) continue;
    const often = days <= 28 ? 'every day' : 'three times this week';
    const text = /scale|technical/i.test(what)
      ? `${rating < 2 ? 'Learn' : 'Run through'} your ${part.label.toLowerCase()} ${often}${days <= 56 ? ', from memory' : ''}.`
      : /sight/i.test(what)
        ? `One short sight-reading piece ${often}: 30 seconds to look, then play it through without stopping.`
        : /aural/i.test(what)
          ? `Aural practice ${often} (clapping, singing back, spotting changes). Your teacher or the ABRSM Aural Trainer app can help.`
          : /improv/i.test(what)
            ? `Improvise for 2 minutes ${often} on a short idea, keeping a steady pulse.`
            : `Be ready to talk about your pieces: key, time signature, character, and any terms or signs.`;
    out.push({ part: what, text });
  }
  return out;
}

/** Where the mock exam goes, in the order the exam runs. */
export function mockSteps(exam) {
  const spec = examSpec(exam.board, exam.type);
  const steps = exam.pieces.slice(0, spec.piece.count).map((p, i) => ({ kind: 'piece', index: i, title: p.title || `Piece ${i + 1}`, pieceId: p.pieceId }));
  for (const part of spec.parts(gradeNumber(exam.grade))) {
    const what = exam.choices?.[part.id] ?? part.label;
    steps.push({ kind: /sight/i.test(what) ? 'sight' : /scale|technical/i.test(what) ? 'scales' : 'self', part: part.id, title: what });
  }
  return steps;
}
