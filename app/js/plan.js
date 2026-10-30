// Today's plan: what a teacher would set between lessons, shaped by the student's
// stage, exam board and daily goal, and pointed at whatever went wrong this week.
// Pure: app.js passes in the data, tests call it directly.

export const LEVEL_TIER = { 'Just starting': 0, 'Initial – Grade 1': 1, 'Grade 2 – 3': 2, 'Grade 4 and above': 3 };

// Share of the session per part, by stage: beginners read more; later grades spend
// longer on pieces and technique, where most exam marks are.
const SPLIT = [
  { warm: 0.2, read: 0.35, piece: 0.45 },
  { warm: 0.2, read: 0.25, piece: 0.55 },
  { warm: 0.25, read: 0.15, piece: 0.6 },
  { warm: 0.25, read: 0.1, piece: 0.65 },
];

// Pieces-only exams (ABRSM Performance Grade, Trinity repertoire-only) mark no scales
// or sight-reading: warm up on the pieces themselves and spend the time on them.
const PERF_SPLIT = [
  { warm: 0.1, read: 0.25, piece: 0.65 },
  { warm: 0.1, read: 0.15, piece: 0.75 },
  { warm: 0.1, read: 0.1, piece: 0.8 },
  { warm: 0.1, read: 0.1, piece: 0.8 },
];

function warmUp(tier, board, bpm) {
  if (tier === 0) return { title: 'Warm-up: C major scale', detail: `Right hand, one octave, at ${bpm} bpm. Thumb tucks under on F.` };
  if (board === 'Trinity') {
    return tier === 1
      ? { title: 'Technical work: scales', detail: `C major hands separately at ${bpm} bpm, then your Trinity exercise once, slowly. Technical work is 14 marks.` }
      : { title: 'Technical work', detail: `Two scales or arpeggios from your Trinity list, then your exercise. Check evenness here on C major at ${bpm} bpm.` };
  }
  if (board === 'ABRSM') {
    return tier === 1
      ? { title: 'Scales, ABRSM style', detail: `C major hands together, then G or F major hands separately, at ${bpm} bpm. From memory: the examiner won't show you the notes.` }
      : { title: 'Scales & arpeggios', detail: `Two from your grade's list, from memory, hands together. Check evenness here on C major at ${bpm} bpm. Scales are 21 of the 150 marks.` };
  }
  return { title: 'Warm-up: scales', detail: `Scales in the keys of your pieces. Check evenness here on C major at ${bpm} bpm.` };
}

function reading(tier, board, cards, perf) {
  const notes = cards.weak
    ? `${cards.weak} note${cards.weak === 1 ? '' : 's'} need${cards.weak === 1 ? 's' : ''} work. They'll come up more often.`
    : `${cards.mastered}/${cards.total} notes known.`;
  if (tier <= 1) return { title: 'Note reading', detail: notes, deck: 'notes' };
  if (perf) return { title: tier === 2 ? 'Reading: keys and intervals' : 'Reading: chords and intervals', detail: `Quicker reading means new pieces go in faster. ${notes}`, deck: tier === 2 ? 'keys' : 'chords' };
  if (tier === 2) return { title: 'Reading: keys and intervals', detail: `Key signatures and intervals, the building blocks of sight-reading${board === 'ABRSM' ? ' (21 marks)' : ''}. ${notes}`, deck: 'keys' };
  return { title: 'Reading: chords and intervals', detail: 'Triads and intervals at speed. Then try a new piece in Read-ahead mode for sight-reading.', deck: 'chords' };
}

/**
 * profile: { level, board, teacher }, goal: minutes, history: check runs, cards: cardStats(),
 * pieces: [{ id, title, targetBpm }], bpmFor(piece) → suggested bpm,
 * trouble(pieceId) → { runs, perRun: { bar: errors per run } }.
 */
/**
 * Also: assignments (open work from the teacher, soonest due first), lessonIn (days to
 * the next lesson, 0 = today) and teacher (their username, for the wording).
 */
export function buildPlan({ profile, goal = 20, history = [], cards = { weak: 0, mastered: 0, total: 0 }, pieces, bpmFor, trouble = () => ({ runs: 0, perRun: {} }), assignments = [], lessonIn = null, teacher = null, examType = null }) {
  const tier = LEVEL_TIER[profile?.level] ?? 0;
  const board = profile?.board ?? 'Not doing exams';
  const perf = (examType ?? profile?.examType) === 'performance' && board !== 'Not doing exams';
  const split = (perf ? PERF_SPLIT : SPLIT)[tier];
  const mins = (f) => Math.max(2, Math.round(goal * f));
  const scale = pieces.find((p) => p.id === 'c-scale') ?? pieces[0];
  const plan = [];

  const warm = { tab: 'play', piece: scale.id, mins: mins(split.warm), ...warmUp(tier, board, bpmFor(scale)) };
  plan.push(warm);
  const r = reading(tier, board, cards, perf);
  plan.push({ tab: 'cards', mins: mins(split.read), title: r.title, detail: r.detail, deck: r.deck });

  const states = pieces.filter((p) => p.id !== scale.id).map((p) => {
    const runs = history.filter((h) => h.pieceId === p.id);
    return { p, runs, best: Math.max(0, ...runs.map((x) => x.score)), ready: runs.some((x) => x.ready), last: runs[runs.length - 1] };
  });
  // The piece in progress comes first; untouched pieces only once nothing is in progress.
  const order = [...states.filter((s) => !s.ready && s.runs.length), ...states.filter((s) => !s.runs.length), ...states.filter((s) => s.ready)];
  let pieceMins = mins(split.piece);
  // Work the teacher set comes first and takes its time from the pieces slot.
  const work = assignments.filter((a) => pieces.some((p) => p.id === a.piece_id)).slice(0, 2);
  const workIds = new Set(work.map((a) => a.piece_id));
  work.forEach((a) => {
    const m = Math.max(3, Math.round(pieceMins * (work.length > 1 ? 0.35 : 0.5)));
    pieceMins -= m;
    const bars = a.from_bar ? `bar${a.to_bar && a.to_bar !== a.from_bar ? `s ${a.from_bar}–${a.to_bar}` : ` ${a.from_bar}`}` : 'the whole piece';
    plan.unshift({
      tab: 'play', piece: a.piece_id, assignment: a, mins: m,
      title: `${teacher ? `From @${teacher}` : a.from ? `From ${a.from}` : 'From your teacher'}: ${a.title}`,
      detail: `${bars[0].toUpperCase()}${bars.slice(1)}${a.target_bpm ? ` at ${a.target_bpm} bpm` : ''}${a.due ? `, due ${a.due}` : ''}. ${a.from_bar ? `Ticks off when it's clean ${3}× in a row.` : 'Ticks off with a run of 85+.'}${a.note ? ` “${a.note}”` : ''}`,
    });
  });
  // A pieces-only exam is judged as one performance: practise the whole programme in order.
  if (perf && goal >= 30) {
    const m = Math.max(6, Math.round(pieceMins * 0.4));
    pieceMins -= m;
    plan.push({ tab: 'exam', mins: m, title: 'Programme run-through', detail: 'Your exam pieces in order, as one performance: pause between pieces, no restarts. Film it once a week and watch it back.' });
  }
  pieceMins = Math.max(3, pieceMins);
  const rest = order.filter((s) => !workIds.has(s.p.id));
  const two = goal >= 30 && tier >= 2 && rest.length >= 2;
  rest.slice(0, two ? 2 : 1).forEach((s, i) => {
    const bpm = bpmFor(s.p);
    const { runs: weekRuns, perRun } = trouble(s.p.id);
    const worst = Object.entries(perRun).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([b]) => Number(b)).sort((a, b) => a - b);
    let detail;
    if (!s.last) detail = `New piece! Listen once, then play slowly at ${bpm} bpm.`;
    else if (s.ready && board !== 'Not doing exams') detail = `Ready. Keep it fresh: one run in Exam conditions (no metronome) at ${bpm} bpm.`;
    else if (weekRuns >= 2 && worst.length) detail = `This week's trouble: bar${worst.length > 1 ? 's' : ''} ${worst.join(' and ')}. Practise ${worst.length > 1 ? 'them' : 'it'} with "Add a bar at a time", then one full run at ${bpm} bpm.`;
    else detail = `${s.last.worstBar ? `Fix bar ${s.last.worstBar} first, then ` : ''}full run at ${bpm} bpm. Best so far: ${s.best}.`;
    plan.push({ tab: 'play', piece: s.p.id, mins: two ? Math.round(pieceMins * (i ? 0.4 : 0.6)) : pieceMins, title: `Piece: ${s.p.title}`, detail, bars: worst });
  });
  if (perf) {
    const first = rest[0]?.p ?? states[0]?.p;
    Object.assign(warm, { piece: first?.id ?? scale.id, title: 'Warm-up: slow and easy', detail: `The opening of ${first ? first.title : 'your first piece'} slowly, hands separately, then hands together at about half speed. This exam is pieces only.` });
  }
  // The lesson shapes the day: show-ready the day before, light on the day.
  if (lessonIn === 0) plan.note = 'Lesson today: warm up, then one calm run of each thing your teacher set. Bring your questions.';
  else if (lessonIn === 1) plan.note = 'Lesson tomorrow: play everything your teacher set once through today, and note the one bar you most want help with.';
  else if (lessonIn === 6) plan.note = 'Lesson was yesterday: start on the new work while the lesson is fresh.';
  return plan;
}
