// Piano sound + metronome. Reference playback uses sampled piano (Salamander Grand
// Piano by Alexander Holm, CC-BY 3.0): one recorded note every three semitones from
// C2 to C7, pitched to the nearest key. Until the samples have loaded (or if they
// can't), a small synth stands in.
let ctx = null;
const voices = new Map();

export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

const SAMPLE_NAMES = ['C', 'Ds', 'Fs', 'A'];
const SAMPLE_MIDIS = [];
for (let m = 36; m <= 96; m += 3) SAMPLE_MIDIS.push(m); // C2 … C7
const sampleName = (m) => `${SAMPLE_NAMES[((m - 36) / 3) % 4]}${Math.floor(m / 12) - 1}`;
const buffers = new Map();
let loading = null;

/** Start fetching the piano samples (once). Playback falls back to the synth meanwhile. */
export function loadPiano() {
  if (loading) return loading;
  const ac = audio();
  loading = Promise.all(SAMPLE_MIDIS.map(async (m) => {
    try {
      const res = await fetch(`samples/${sampleName(m)}.mp3`);
      if (!res.ok) return;
      buffers.set(m, await ac.decodeAudioData(await res.arrayBuffer()));
    } catch {
      // Missing or undecodable: that range uses the synth.
    }
  }));
  return loading;
}

export const pianoReady = () => buffers.size > 0;

function sampled(midi, when, velocity) {
  const near = SAMPLE_MIDIS.filter((m) => buffers.has(m)).sort((a, b) => Math.abs(a - midi) - Math.abs(b - midi))[0];
  if (near == null || Math.abs(near - midi) > 6) return null;
  const ac = audio();
  const src = ac.createBufferSource();
  src.buffer = buffers.get(near);
  src.playbackRate.value = 2 ** ((midi - near) / 12);
  const out = ac.createGain();
  out.gain.setValueAtTime(0.9 * velocity, when);
  src.connect(out).connect(ac.destination);
  src.start(when);
  return { out, oscs: [src] };
}

function voice(midi, when, velocity = 0.8) {
  loadPiano();
  const piano = sampled(midi, when, velocity);
  if (piano) return piano;
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
  v.oscs.forEach((o) => {
    try {
      o.stop(when + 0.5);
    } catch {
      // A sample shorter than the note has already ended.
    }
  });
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
