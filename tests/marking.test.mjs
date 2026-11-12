// Examiner-style marking: node tests/marking.test.mjs
import { readFileSync } from 'node:fs';
import { analyse } from '../app/js/analysis.js';
import { normalize, timeline } from '../app/js/score.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { examMark, runMark } from '../app/js/marking.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
};
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const study = normalize(parseMusicXML(readFileSync(new URL('../app/scores/octave-study.musicxml', import.meta.url), 'utf8')));
const bpm = study.targetBpm;
const ms = 60000 / bpm;
// vel(n) shapes the dynamics; tweak(n) can drop, change or move a note.
function play({ vel = () => 0.6, tweak = (p) => p, speed = 1, jitter = 10 } = {}) {
  const tl = timeline(study);
  const played = tl.flatMap((n) => {
    const p = tweak({ midi: n.midi, on: (n.beat * ms) / speed + (rand() - 0.5) * 2 * jitter, off: ((n.beat + n.beats * 0.9) * ms) / speed, velocity: vel(n), n });
    return p ? [p] : [];
  });
  return analyse({ expected: tl, played, msPerBeat: ms, beatsPerBar: study.beatsPerBar, source: 'midi', score: study });
}
const sheet = (m) => `${m.mark}/${m.of} ${m.band} [${m.criteria.map((c) => `${c.label}:${c.band}${c.mark != null ? ` ${c.mark}/${c.max}` : ''}`).join(', ')}]`;

// Shaped: follows the marked dynamics, with a little rise and fall in each phrase.
const LEVEL = { p: 0.35, mf: 0.6, f: 0.82 };
const shaped = (n) => (LEVEL[n.dyn] ?? 0.6) + 0.06 * Math.sin((Math.PI * (n.beat % 8)) / 8);
const best = examMark(play({ vel: shaped }));
check('a clean, shaped run is Merit or Distinction on ABRSM', best.mark >= 24 && best.of === 30, sheet(best));
check('ABRSM marks all five criteria', best.criteria.map((c) => c.id).join() === 'pitch,time,tone,shape,performance', sheet(best));

const flat = examMark(play({ vel: () => 0.6 }));
check('all the same volume marks Tone below a shaped run', flat.criteria.find((c) => c.id === 'tone').band !== 'distinction' && flat.mark <= best.mark, `${sheet(flat)} vs ${sheet(best)}`);
check('…and says so', /loud and soft/.test(flat.criteria.find((c) => c.id === 'tone').comment), flat.criteria.find((c) => c.id === 'tone').comment);

let k = 0;
const sloppy = examMark(play({ vel: shaped, tweak: (p) => (++k % 9 === 0 ? { ...p, midi: p.midi + 1 } : p) }));
check('wrong notes pull Pitch and the mark down', sloppy.mark < best.mark && sloppy.criteria[0].band !== 'distinction', sheet(sloppy));
check('the Pitch comment counts them', /wrong/.test(sloppy.criteria[0].comment), sloppy.criteria[0].comment);
check('stricter than real: no Distinction with a weak criterion', sloppy.band !== 'distinction');

const slow = examMark(play({ vel: shaped, speed: 0.7 }));
check('well under speed is marked down on Time', slow.criteria.find((c) => c.id === 'time').band !== 'distinction' && slow.mark < best.mark, sheet(slow));

const half = examMark(play({ vel: shaped, tweak: (p) => (p.n.beat > 20 ? null : p) }));
check('stopping half way is below pass', half.band === 'below' && half.mark < 20, sheet(half));

const t = examMark(play({ vel: shaped }), 'Trinity');
check('Trinity marks out of 22 in three areas (7, 7, 8)', t.of === 22 && t.criteria.map((c) => c.max).join() === '7,7,8', sheet(t));
check('Trinity area marks add up to the total', t.criteria.reduce((a, c) => a + c.mark, 0) === t.mark, sheet(t));
check('Trinity repertoire-only pieces are out of 25', examMark(play({ vel: shaped }), 'Trinity', 'performance').of === 25);

const mic = examMark({ ...play({ vel: shaped }), source: 'mic', dense: true });
check('mic on a dense piece: Tone and Shape not marked, flagged rough', mic.rough && mic.criteria.find((c) => c.id === 'tone').band === null, sheet(mic));
check('…and what wasn\'t heard can\'t earn Distinction', mic.band !== 'distinction' && mic.mark <= 26, sheet(mic));

check('old runs without a mark get one from their /100 score', runMark({ score: 92 }, { board: 'ABRSM', type: 'practical' }).band === 'merit');
check('saved marks are used as they are', runMark({ score: 50, mark: 25, of: 30, band: 'merit' }).mark === 25);

if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('marking: all passed');
