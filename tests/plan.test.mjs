// Today's plan: node tests/plan.test.mjs
import assert from 'node:assert/strict';
import { buildPlan } from '../app/js/plan.js';
import { qualityStreak, isQualityDay } from '../app/js/quality.js';

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };
const pieces = [{ id: 'c-scale', title: 'C major scale' }, { id: 'a', title: 'Minuet' }, { id: 'b', title: 'Study' }, { id: 'c', title: 'Waltz' }];
const base = { pieces, bpmFor: () => 72, cards: { weak: 2, mastered: 10, total: 26 } };
const total = (plan) => plan.reduce((a, x) => a + x.mins, 0);

const beginner = buildPlan({ ...base, profile: { level: 'Just starting', board: 'Not doing exams' }, goal: 20 });
ok(beginner.length === 3 && /Right hand, one octave/.test(beginner[0].detail), 'beginners warm up right hand only');
ok(beginner[1].mins === 7 && beginner[1].deck === 'notes', 'beginners spend a third on note reading');
ok(Math.abs(total(beginner) - 20) <= 1, 'plan fills the daily goal');

const abrsm = buildPlan({ ...base, profile: { level: 'Grade 4 and above', board: 'ABRSM' }, goal: 45 });
ok(/from memory/.test(abrsm[0].detail) && /21 of the 150/.test(abrsm[0].detail), 'ABRSM grade 4+: scales from memory with marks');
ok(abrsm.filter((x) => x.title.startsWith('Piece')).length === 2, 'longer sessions at higher grades get two pieces');
ok(abrsm[1].deck === 'chords' && abrsm[1].mins < beginner[1].mins * 2, 'advanced reading is shorter and harder');

const trinity = buildPlan({ ...base, profile: { level: 'Initial – Grade 1', board: 'Trinity' }, goal: 20 });
ok(/Trinity exercise/.test(trinity[0].detail), 'Trinity students get technical work with exercises');

// Pieces: the one in progress first, and this week's trouble bars named.
const history = [{ pieceId: 'b', score: 70, worstBar: 3 }, { pieceId: 'a', score: 95, ready: true }];
const withTrouble = buildPlan({ ...base, profile: { level: 'Grade 2 – 3', board: 'ABRSM' }, goal: 20, history, trouble: (id) => (id === 'b' ? { runs: 3, perRun: { 7: 1.3, 3: 0.7, 9: 0.2 } } : { runs: 0, perRun: {} }) });
const piece = withTrouble.find((x) => x.title.startsWith('Piece'));
ok(piece.piece === 'b', 'the piece in progress comes before new and ready ones');
ok(/bars 3 and 7/.test(piece.detail) && /Add a bar at a time/.test(piece.detail), 'trouble bars from the week are named, in bar order');
ok(!/bar 9/.test(piece.detail), 'bars with few mistakes are left out');

// Quality streak.
const d = (o) => { const x = new Date('2026-10-30T12:00'); x.setDate(x.getDate() - o); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
ok(!isQualityDay({ clean: 0, bars: 0, cards: 19 }) && isQualityDay({ cards: 20 }) && isQualityDay({ bars: 1 }), 'what makes a quality day');
ok(qualityStreak({ [d(1)]: { clean: 1 }, [d(2)]: { bars: 1 } }, new Date('2026-10-30T12:00')) === 2, 'streak survives until today is done');
ok(qualityStreak({ [d(0)]: { clean: 1 }, [d(2)]: { bars: 1 } }, new Date('2026-10-30T12:00')) === 1, 'a gap breaks the streak');
console.log(`plan: ${n} checks passed`);
