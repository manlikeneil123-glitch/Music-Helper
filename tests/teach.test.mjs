// Teacher-set work, assignment links, lesson day, QR codes, and the plan with work:
// node tests/teach.test.mjs
import assert from 'node:assert/strict';
import { completes, assignmentLink, readAssignmentLink, daysToLesson } from '../app/js/work.js';
import { buildPlan } from '../app/js/plan.js';
import { qrMatrix } from '../app/js/qr.js';

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };

// When a take completes the work.
const bars = { id: 'a1', piece_id: 'ode', from_bar: 5, to_bar: 8, target_bpm: 80 };
ok(completes(bars, { pieceId: 'ode', section: { from: 5, to: 8 }, bpm: 80, secure: true }), 'secure drill on the set bars at tempo completes it');
ok(completes(bars, { pieceId: 'ode', section: { from: 1, to: 8 }, bpm: 78, secure: true }), 'a wider section that covers the bars counts (78 is within 5% of 80)');
ok(!completes(bars, { pieceId: 'ode', section: { from: 5, to: 8 }, bpm: 70, secure: true }), 'too slow does not');
ok(!completes(bars, { pieceId: 'ode', section: { from: 6, to: 8 }, bpm: 80, secure: true }), 'a section that misses bar 5 does not');
ok(completes(bars, { pieceId: 'ode', hands: 'both', score: 90, playedBpm: 82, barErrors: { 2: 1 } }), 'a full run clean in bars 5-8 completes it');
ok(!completes(bars, { pieceId: 'ode', hands: 'both', score: 90, playedBpm: 82, barErrors: { 6: 1 } }), 'a mistake in the set bars does not');
ok(!completes(bars, { pieceId: 'other', section: { from: 5, to: 8 }, bpm: 80, secure: true }), 'another piece does not');
const whole = { id: 'a2', piece_id: 'ode', target_bpm: null };
ok(completes(whole, { pieceId: 'ode', hands: 'both', score: 85, playedBpm: 60 }), 'whole-piece work: a run of 85+ completes it');
ok(!completes(whole, { pieceId: 'ode', hands: 'rh', score: 99, playedBpm: 60 }), 'hands separately does not');

// Links round-trip, and junk is rejected or cleaned.
const url = assignmentLink({ title: 'Minuet — bars 5–8 ♪', piece_id: 'ode', from_bar: 5, to_bar: 8, target_bpm: 72, strictness: 'exam', due: '2026-11-06', note: 'Listen to the left hand', from: 'Miss T' }, 'https://x.io/app/');
const back = readAssignmentLink(new URL(url).hash);
ok(back.title === 'Minuet — bars 5–8 ♪' && back.from_bar === 5 && back.target_bpm === 72 && back.strictness === 'exam' && back.from === 'Miss T', 'link round-trips, including non-ASCII text');
ok(url.length < 400, `assignment links stay short enough for a small QR code (${url.length})`);
const evil = assignmentLink({ title: 'x', piece_id: 'ode', target_bpm: 99999, strictness: 'nonsense', due: 'tomorrow', from_bar: -3 }, 'https://x.io/');
const clean = readAssignmentLink(new URL(evil).hash);
ok(clean.target_bpm === null && clean.strictness === null && clean.due === null && clean.from_bar === null, 'out-of-range values are dropped');
ok(readAssignmentLink('#assign=not-base64!!') === null && readAssignmentLink('#other=1') === null, 'broken links are ignored');

// Lesson day.
const wed = new Date(2026, 9, 28); // a Wednesday
ok(daysToLesson(3, wed) === 0 && daysToLesson(4, wed) === 1 && daysToLesson(2, wed) === 6 && daysToLesson(null, wed) === null, 'days to the next lesson');

// The plan puts the teacher's work first and notes the lesson.
const pieces = [{ id: 'c-scale', title: 'C major scale' }, { id: 'ode', title: 'Ode' }, { id: 'b', title: 'Study' }];
const plan = buildPlan({ profile: { level: 'Grade 2 – 3', board: 'ABRSM' }, goal: 30, pieces, bpmFor: () => 70, assignments: [{ ...bars, title: 'Bars 5–8 hands together' }], lessonIn: 1, teacher: 'miss_t' });
ok(plan[0].assignment && /From @miss_t/.test(plan[0].title) && /Bars 5–8 at 80 bpm/.test(plan[0].detail), 'teacher work leads the plan');
ok(!plan.slice(1).some((x) => x.piece === 'ode' && !x.assignment), 'the same piece is not listed twice');
ok(/Lesson tomorrow/.test(plan.note), 'the day before a lesson gets a note');
ok(Math.abs(plan.reduce((a, x) => a + x.mins, 0) - 30) <= 2, 'the plan still fits the daily goal');
const missing = buildPlan({ profile: { level: 'Grade 2 – 3', board: 'ABRSM' }, goal: 20, pieces, bpmFor: () => 70, assignments: [{ id: 'z', title: 'x', piece_id: 'not-on-device' }] });
ok(!missing.some((x) => x.assignment), 'work for a score not on the device is left out of the plan');

// QR: sizes and the fixed patterns (full decoding was checked against OpenCV).
const q1 = qrMatrix('HELLO');
ok(q1.length === 21, 'short text fits version 1');
const finder = (m, r, c) => [0, 1, 2, 3, 4, 5, 6].every((k) => m[r][c + k] && m[r + 6][c + k] && m[r + k][c] && m[r + k][c + 6]);
ok(finder(q1, 0, 0) && finder(q1, 0, 14) && finder(q1, 14, 0), 'three finder patterns');
const ql = qrMatrix(url);
ok(ql.length >= 57 && ql.length <= 73, `an assignment link fits a small code (${ql.length} modules)`);
assert.throws(() => qrMatrix('x'.repeat(900)));
n++;
console.log(`teach: ${n} checks passed`);
