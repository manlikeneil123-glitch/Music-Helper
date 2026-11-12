// Playing just part of a piece: Stave finds which bars. node tests/part.test.mjs
import { locatePart } from '../app/js/analysis.js';
import { normalize, timeline } from '../app/js/score.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { scnToMusicXML } from '../app/js/scnformat.js';
import { analyseAudio } from '../app/js/micanalysis.js';
import { synth, SR } from './helpers/synth.mjs';

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };
// Eight different bars: a rising scale, one bar per step.
const bars = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const s = normalize(parseMusicXML(scnToMusicXML(`SCN1\nTIME 4/4\n${bars.map((p, i) => `BAR\nR: ${p}/q ${bars[(i + 2) % 8]}/q ${p}/q ${bars[(i + 5) % 8]}/q`).join('\n')}`), { id: 'x' }));
const tl = timeline(s);
const play = (fromBar, toBar, tweak = (x) => x) => tl.filter((n) => n.bar >= fromBar && n.bar <= toBar).map((n, i) => tweak({ midi: n.midi, on: 5000 + i * 400 }, i)).filter(Boolean);

let p = locatePart(tl, play(1, 8));
ok(p.from === 1 && p.to === 8, `whole piece → bars ${p.from}–${p.to}`);
p = locatePart(tl, play(5, 7));
ok(p.from === 5 && p.to === 7, `just bars 5–7 → bars ${p.from}–${p.to}`);
p = locatePart(tl, play(3, 8, (x, i) => (i === 2 ? { ...x, midi: x.midi + 1 } : i === 6 ? null : x)));
ok(p.from === 3 && p.to === 8, `bars 3–8 with a wrong and a missed note → bars ${p.from}–${p.to}`);
ok(locatePart(tl, play(1, 1).slice(0, 2)) === null, 'too few notes: no guess');
// The microphone: bars 4–6 played after 2 s of silence, found from the recording.
{
  const part = tl.filter((n) => n.bar >= 4 && n.bar <= 6);
  const b0 = part[0].beat;
  const notes = part.map((n) => ({ midi: n.midi, on: 2 + (n.beat - b0) * 0.6, off: 2 + (n.beat - b0 + n.beats * 0.9) * 0.6, vel: 0.7 }));
  const samples = synth(notes, Math.max(...notes.map((n) => n.off)), { offsetSec: 0 });
  const mic = analyseAudio({ samples, sampleRate: SR, expected: tl, msPerBeat: 600, beat0Sec: 0, latencyMs: 0, free: true });
  const where = locatePart(tl, mic.played);
  ok(where && where.from === 4 && where.to === 6, `mic, bars 4–6 → bars ${where?.from}–${where?.to}`);
}

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('part: all passed');
