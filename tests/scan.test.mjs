// Photo scanner's short format (SCN1) → MusicXML → the normal importer.
import { scnToMusicXML, parseScn } from '../app/js/scnformat.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { normalize } from '../app/js/score.js';

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };
const load = (scn) => normalize(parseMusicXML(scnToMusicXML(scn), { id: 'scan' }));

const minuet = load(`SCN1
TITLE Minuet in G
KEY 1
TIME 3/4
BAR
R: D5/q G4/e A4/e B4/e C5/e
L: G3+B3+D4/h.
BAR
R: D5/q G4/q G4/q~
L: B3/h.
BAR
R: G4/h.
L: r/q D3/h`);
ok(minuet.title === 'Minuet in G', 'title kept');
ok(minuet.staves === 2 && minuet.beatsPerBar === 3 && minuet.keyFifths === 1, 'two staves, 3/4, G major');
const rh = minuet.notes.filter((n) => n.staff === 1);
const lh = minuet.notes.filter((n) => n.staff === 2);
ok(rh[0].midi === 74 && rh[0].beat === 0 && rh[0].beats === 1, 'D5 crotchet on beat 1');
ok(lh.filter((n) => n.beat === 0).map((n) => n.midi).sort().join() === '55,59,62', 'left-hand chord G3 B3 D4');
ok(lh[0].beats === 3, 'dotted minim lasts the bar');
ok(minuet.notes.some((n) => n.staff === 2 && n.midi === 50 && n.beat === 7), 'rest then D3 on beat 2 of bar 3');
const held = load('SCN1\nTIME 3/4\nBAR\nR: G4/q G4/q G4/q~\nBAR\nR: G4/h.').notes;
ok(held.length === 3 && held[2].beat === 2 && held[2].beats === 4, 'tie across the barline = one note of four beats');

const single = load('SCN1\nKEY -2\nTIME 4/4\nBAR\nR: Bb4/q Eb5/q. F#5/e G5/q');
ok(single.staves === 1 && single.keyFifths === -2, 'no L: lines = one stave, flats key');
ok(single.notes.map((n) => n.midi).join() === '70,75,78,79', 'accidentals: Bb4 Eb5 F#5 G5');
ok(single.notes[1].beats === 1.5, 'dotted crotchet');

const change = load('SCN1\nTIME 4/4\nBAR\nR: C4/w\nTIME 3/4\nBAR\nR: E4/h.');
ok(change.notes[1].beat === 4, 'time change: bar 2 starts after four beats');

for (const [bad, why] of [['BAR\nR: C4/q', 'missing header'], ['SCN1\nR: C4/q', 'notes before BAR'], ['SCN1\nBAR\nR: H4/q', 'bad pitch'], ['SCN1\nBAR\nR: C4/x', 'bad duration'], ['SCN1\nKEY 9\nBAR\nR: C4/q', 'bad key'], ['SCN1\nBAR', 'no notes'], ['SCN1\nBAR\nR: C4/q <script>', 'markup']]) {
  let threw = false;
  try { parseScn(bad); } catch { threw = true; }
  ok(threw, `rejects ${why}`);
}
ok(!scnToMusicXML('SCN1\nTITLE <b>&"x"</b>\nBAR\nR: C4/q').includes('<b>'), 'title is escaped');

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('scan: all passed');
