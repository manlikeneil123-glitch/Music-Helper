// "Hear the piece" plays the expression in the score: node tests/expressive.test.mjs
import { expressivePlan } from '../app/js/expressive.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { scnToMusicXML } from '../app/js/scnformat.js';

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };
const piece = parseMusicXML(scnToMusicXML(`SCN1
TEMPO 120 Allegro
TIME 4/4
BAR
R: [p] C4/q D4/q [<] E4/q F4/q
BAR
R: [/] [f] G4/q! A4/q' B4/q( C5/q)
BAR
R: [ped] C4/q E4/q [*] G4/h^
BAR
R: C5/w`), { id: 'x' });
const plan = expressivePlan(piece, 120);
const at = (midi, nth = 0) => plan.filter((n) => n.midi === midi)[nth];
ok(Math.abs(at(62).at - 0.5) < 1e-6, 'marked speed: crotchet = 0.5 s at 120');
ok(at(60).vel < at(67).vel, 'p is softer than f');
ok(at(65).vel > at(64).vel, 'louder through the crescendo');
ok(at(67).vel > at(71).vel, 'the accent leans in');
ok(at(69).dur < 0.3, 'staccato is short');
ok(at(71).dur >= 0.5, 'slurred notes join');
ok(at(60, 1).dur > 0.99, 'the pedal holds the first note on until it lifts (2 beats)');
ok(at(67, 1).dur > 1.5, 'the pause holds its note longer');
ok(at(72, 1).at > 6 + 0.5, '…and pushes what comes after it later');
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('expressive: all passed');
