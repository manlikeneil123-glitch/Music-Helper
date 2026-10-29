// Minimal WebAudio synth + metronome. Good enough to hear the reference
// and a count-in; a real build would use sampled piano (e.g. Salamander).
let ctx = null;
const voices = new Map();

export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function voice(midi, when, velocity = 0.8) {
  const ac = audio();
  const out = ac.createGain();
  out.gain.setValueAtTime(0, when);
  out.gain.linearRampToValueAtTime(0.25 * velocity, when + 0.005);
  out.gain.exponentialRampToValueAtTime(0.08 * velocity, when + 0.6);
  out.connect(ac.destination);
  const oscs = [['triangle', 1, 1], ['sine', 2, 0.25]].map(([type, mult, level]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq(midi) * mult;
    g.gain.value = level;
    o.connect(g).connect(out);
    o.start(when);
    return o;
  });
  return { out, oscs };
}

function release(v, when) {
  v.out.gain.cancelScheduledValues(when);
  v.out.gain.setTargetAtTime(0, when, 0.08);
  v.oscs.forEach((o) => o.stop(when + 0.5));
}

export function noteOn(midi, velocity = 0.8) {
  noteOff(midi);
  voices.set(midi, voice(midi, audio().currentTime, velocity));
}

export function noteOff(midi) {
  const v = voices.get(midi);
  if (v) {
    release(v, audio().currentTime);
    voices.delete(midi);
  }
}

export function scheduleNote(midi, when, duration) {
  release(voice(midi, when), when + duration);
}

export function click(when, accent = false) {
  const ac = audio();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.3, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  o.connect(g).connect(ac.destination);
  o.start(when);
  o.stop(when + 0.06);
}

// Convert an AudioContext time into the performance.now() clock that input events use.
export function ctxToPerf(t) {
  const ac = audio();
  return performance.now() + (t - ac.currentTime) * 1000;
}
