// Perform follows the player: no count-in, their own speed. node tests/freetempo.test.mjs
import { readFileSync } from 'node:fs';
import { analyse, guessBeatMs } from '../app/js/analysis.js';
import { analyseAudio } from '../app/js/micanalysis.js';
import { normalize, timeline } from '../app/js/score.js';
import { parseMusicXML } from '../app/js/musicxml.js';
import { synth, SR } from './helpers/synth.mjs';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
};
const study = normalize(parseMusicXML(readFileSync(new URL('../app/scores/octave-study.musicxml', import.meta.url), 'utf8')));
const tl = timeline(study);
const target = 60000 / study.targetBpm;

// What check.js does with MIDI in Perform: beat 0 is the first note, speed is guessed.
function midiRun(speed, startMs) {
  const ms = target / speed;
  let played = tl.map((n) => ({ midi: n.midi, on: startMs + n.beat * ms, off: startMs + (n.beat + n.beats * 0.9) * ms, velocity: 0.6 }));
  const guess = guessBeatMs(tl, played.map((p) => p.on)) ?? target;
  const shift = Math.min(...played.map((p) => p.on)) - tl[0].beat * guess;
  played = played.map((p) => ({ ...p, on: p.on - shift, off: p.off - shift }));
  return { guess, r: analyse({ expected: tl, played, msPerBeat: guess, targetMsPerBeat: target, beatsPerBar: study.beatsPerBar, source: 'midi', score: study }) };
}

for (const speed of [0.6, 0.8, 1, 1.2]) {
  const { guess, r } = midiRun(speed, 3700);
  check(`MIDI at ${Math.round(speed * 100)}% speed, starting 3.7 s in: every note right`, r.pitchAccuracy === 1 && r.counts.extra === 0, `pitch ${r.pitchAccuracy}, extras ${r.counts.extra}`);
  check(`…its speed is measured (${Math.round(r.playedBpm)} for ${Math.round(study.targetBpm * speed)}) and judged against the marked ${study.targetBpm}`,
    Math.abs(r.playedBpm - study.targetBpm * speed) < 3 && Math.round(r.targetBpm) === study.targetBpm, `guess ${Math.round(60000 / guess)}`);
}
check('slow but steady: rhythm still right', midiRun(0.7, 2000).r.rhythmAccuracy > 0.95);

// The mic: a recording that starts after 2.5 s of silence, at 75% speed.
{
  const spb = target / 0.75 / 1000;
  const notes = tl.map((n) => ({ midi: n.midi, on: 2.5 + n.beat * spb, off: 2.5 + (n.beat + n.beats * 0.9) * spb, vel: 0.7 }));
  const samples = synth(notes, Math.max(...notes.map((n) => n.off)), { offsetSec: 0 });
  const mic = analyseAudio({ samples, sampleRate: SR, expected: tl, msPerBeat: target, beat0Sec: 0, latencyMs: 0, free: true });
  const r = analyse({ expected: tl, played: mic.played, unclear: mic.unclear, msPerBeat: mic.msPerBeat, targetMsPerBeat: target, beatsPerBar: study.beatsPerBar, source: 'mic', score: study, dense: true });
  check('mic, free start at 75% speed: notes found', r.pitchAccuracy >= 0.9, `pitch ${r.pitchAccuracy.toFixed(2)}, matched ${mic.matched}/${tl.length}`);
  check('mic: speed measured near 75%', Math.abs(r.playedBpm / study.targetBpm - 0.75) < 0.06, `${Math.round(r.playedBpm)} bpm`);
}

// Real playing isn't steady: the speed drifts ±20% and there's a 1.5 s pause. Right
// notes must stay right (one straight-line tempo turned 30+ of them wrong).
{
  const spb0 = target / 0.85 / 1000;
  const T = (beat) => { let t = 0; for (let b = 0; b < beat; b += 0.25) t += 0.25 * spb0 * (1 + 0.2 * Math.sin(b / 6)); return t + (beat > 30 ? 1.5 : 0); };
  const notes = tl.map((n) => ({ midi: n.midi, on: 1.5 + T(n.beat), off: 1.5 + T(n.beat + n.beats * 0.9), vel: 0.6 }));
  const samples = synth(notes, Math.max(...notes.map((n) => n.off)), { offsetSec: 0, noise: 0.004 });
  const mic = analyseAudio({ samples, sampleRate: SR, expected: tl, msPerBeat: target, beat0Sec: 0, latencyMs: 0, free: true, beatsPerBar: study.beatsPerBar });
  const r = analyse({ expected: tl, played: mic.played, unclear: mic.unclear, msPerBeat: mic.msPerBeat, targetMsPerBeat: target, beatsPerBar: study.beatsPerBar, source: 'mic', score: study, dense: true });
  const bad = r.counts.wrong + r.counts.missed + r.counts.extra;
  check('mic, rubato ±20% and a pause: right notes stay right', bad <= 6, `${r.counts.wrong} wrong, ${r.counts.missed} missed, ${r.counts.extra} extra of ${tl.length}`);
}

if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('free tempo: all passed');
