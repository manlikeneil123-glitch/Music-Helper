// Exam readiness, countdown phases, weekly targets and mock order: node tests/exam.test.mjs
import assert from 'node:assert/strict';
import { BOARDS, pieceReadiness, daysUntil, phaseFor, weekTargets, mockSteps } from '../app/js/exam.js';

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };
const now = Date.now();
const run = (o) => ({ pieceId: 'p', hands: 'both', at: now - 3600e3, score: 90, pitch: 1, rhythm: 1, keptGoing: 100, pulse: 95, playedBpm: 100, targetBpm: 100, ...o });

// Mark schemes add up.
ok(BOARDS.ABRSM.piece.count * BOARDS.ABRSM.piece.marks + BOARDS.ABRSM.parts(3).reduce((a, p) => a + p.marks, 0) === 150, 'ABRSM adds up to 150');
ok(BOARDS.Trinity.piece.count * BOARDS.Trinity.piece.marks + BOARDS.Trinity.parts(3).reduce((a, p) => a + p.marks, 0) === 100, 'Trinity adds up to 100');
ok(BOARDS.Trinity.parts(6).some((p) => p.id === 'sight') && !BOARDS.Trinity.parts(5).some((p) => p.id === 'sight'), 'Trinity sight reading is compulsory from Grade 6');

// Readiness bands.
ok(pieceReadiness([run()], 'ABRSM').band === null, 'one run is not enough');
ok(pieceReadiness([run(), run()], 'ABRSM').band === 'distinction', 'two clean runs at tempo: distinction level');
const merit = pieceReadiness([run({ pitch: 0.95, rhythm: 0.85 }), run({ pitch: 0.94, rhythm: 0.85 })], 'ABRSM');
ok(merit.band === 'merit' && merit.range === '24–26' && merit.of === 30, 'small slips: merit, 24–26 of 30');
const slow = pieceReadiness([run({ playedBpm: 75 }), run({ playedBpm: 78 })], 'ABRSM');
ok(slow.band === 'pass' && slow.weakest === 'tempo', 'perfect but at 75% tempo is capped at pass, weakest: tempo');
ok(pieceReadiness([run({ pitch: 0.6, rhythm: 0.6 }), run({ pitch: 0.65, rhythm: 0.6 })], 'Trinity').range === 'under 13', 'Trinity below pass is under 13 of 22');
ok(pieceReadiness([run({ at: now - 30 * 86400e3 }), run({ at: now - 30 * 86400e3 })], 'ABRSM').band === null, 'runs older than 3 weeks are ignored');
ok(pieceReadiness([run({ hands: 'rh' }), run({ hands: 'rh' })], 'ABRSM').band === null, 'hands-separately runs do not count');
ok(pieceReadiness([run({ keptGoing: 40 }), run({ keptGoing: 40 })], 'ABRSM').band === 'merit', 'stopping costs a band');

// Countdown.
const today = new Date(2026, 9, 30);
ok(daysUntil('2026-11-27', today) === 28 && daysUntil('2026-10-30', today) === 0, 'days until');
ok(phaseFor(90).id === 'learn' && phaseFor(40).id === 'build' && phaseFor(20).id === 'polish' && phaseFor(5).id === 'final' && phaseFor(0).id === 'today' && phaseFor(-1).id === 'after', 'phases count back from the exam');

// Weekly targets.
const exam = { board: 'ABRSM', grade: '3', date: '2026-11-20', ratings: { scales: 1, sight: 3, aural: 0 }, pieces: [
  { title: 'Minuet', pieceId: 'a', readiness: { band: 'below', weakest: 'notes' } },
  { title: 'Study', pieceId: 'b', readiness: { band: 'merit', weakest: 'pulse' } },
  { title: 'Blues', pieceId: '' },
] };
const t = weekTargets(exam, today);
ok(/trouble bars/.test(t[0].text), 'below pass: back to the trouble bars');
ok(/Exam conditions/.test(t[1].text), 'merit in the polish phase: exam-conditions runs');
ok(/Import or link/.test(t[2].text), 'unlinked piece: link the score');
ok(t.some((x) => /scales/i.test(x.part) && /every day/.test(x.text)) && t.some((x) => /Aural/.test(x.part)), 'scales and aural targets, daily in the last month');
ok(t.some((x) => /Sight/.test(x.part)), 'secure parts still get a run-through when polishing');

// Mock exam order.
const steps = mockSteps(exam);
ok(steps.map((s) => s.kind).join() === 'piece,piece,piece,scales,sight,self', 'ABRSM mock: pieces, scales, sight-reading, aural');
const tr = mockSteps({ ...exam, board: 'Trinity', grade: '4', choices: { test1: 'Musical knowledge', test2: 'Sight reading' } });
ok(tr.slice(3).map((s) => s.kind).join() === 'scales,self,sight', 'Trinity mock follows the chosen supporting tests');
console.log(`exam: ${n} checks passed`);
