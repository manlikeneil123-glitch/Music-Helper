// Photo scanner's short format (SCN1) → MusicXML → the normal importer.
import { scnToMusicXML, parseScn, scnFromReply, scnBarProblems, scnFixMessage } from '../app/js/scnformat.js';
import * as appPrompt from '../app/js/scanprompt.js';
import * as serverPrompt from '../supabase/functions/_shared/scan-prompt.js';
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

// Expression: tempo, dynamics, hairpins, articulation, slurs, pedal, pause.
const expr = normalize(parseMusicXML(scnToMusicXML(`SCN1
TITLE Study
TEMPO 96 Allegro
TIME 4/4
BAR
R: [p] [<] C4/q( D4/q E4/q F4/q)
L: [ped] C3/w
BAR
R: [/] [f] G4/q! A4/q' [>] B4/q C5/q^ [/]
L: [*] C3/w`), { id: 'scan' }));
ok(expr.targetBpm === 96 && expr.tempoWords === 'Allegro', 'TEMPO sets the marked speed and its words');
ok(expr.dynamics.map((d) => d.mark).join() === 'p,f', 'dynamics p then f');
ok(expr.hairpins.length === 2 && expr.hairpins[0].type === 'cresc' && expr.hairpins[1].type === 'dim', 'crescendo and diminuendo');
ok(expr.notes.find((n) => n.midi === 67).artic === 'accent' && expr.notes.find((n) => n.midi === 69).artic === 'staccato', 'accent and staccato');
ok(expr.notes.filter((n) => n.slur).length >= 4, 'slurred notes are legato');
ok(expr.pedal.length === 1, 'pedal down and up');
ok(expr.notes.find((n) => n.midi === 72).fermata, 'pause on the last note');
let badMark = false;
try { parseScn('SCN1\nBAR\nR: [loud] C4/q'); } catch { badMark = true; }
ok(badMark, 'rejects unknown marks');

// Chat-app route: the reply is pasted back with whatever the app wraps round it.
const reply = "Here's the transcription:\n\n```\nSCN1\nTIME 4/4\nBAR\nR: C4/w\n```\n\nLet me know if you'd like changes.";
ok(scnFromReply(reply) === 'SCN1\nTIME 4/4\nBAR\nR: C4/w', 'chat reply: chatter and code fences dropped');
ok(load(scnFromReply(reply)).notes.length === 1, 'chat reply imports');
ok(scnFromReply('Sorry, I cannot read that.') === '', 'chat reply with no SCN1 = empty');
ok(scnFromReply('SCN1 NONE') === 'SCN1 NONE', 'not-music answer kept so Stave can say so');
ok(appPrompt.SCAN_SYSTEM === serverPrompt.SCAN_SYSTEM && appPrompt.SCAN_ASK === serverPrompt.SCAN_ASK, 'app and server scan instructions match');

// Bars that don't add up: the AI misread a note length.
const bad = `SCN1
TIME 3/4
BAR
R: D5/q
BAR
R: G4/q A4/q B4/q
L: G3/h.
BAR
R: C5/q B4/e A4/q
L: C4/h.
BAR
R: G4/h. A4/q
L: B3/h.
BAR
R: G4/h`;
const probs = scnBarProblems(bad);
ok(probs.length === 2 && probs[0].bar === 3 && probs[0].hand === 'right hand' && probs[0].have === 2.5 && probs[1].bar === 4 && probs[1].have === 4, 'short and long bars found; pick-up and last bars may be short');
ok(/bar 3 \(right hand: 2.5 crotchet beats, should be 3\)/.test(scnFixMessage(probs)) && /whole SCN1 again/.test(scnFixMessage(probs)), 'the fix-up message names the bars and asks for the whole reply again');

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('scan: all passed');
