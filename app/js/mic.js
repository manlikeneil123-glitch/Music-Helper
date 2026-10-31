// Microphone capture + per-piano calibration. Analysis lives in micanalysis.js.
import { audio, click } from './audio.js';
import { measureLatency, estimateTuning } from './micanalysis.js';
import { load, save } from './store.js';

let stream = null;

export const micSupported = () => !!navigator.mediaDevices?.getUserMedia;

export async function openMic() {
  if (stream?.active) return stream;
  // Phone "voice" processing (echo cancel, noise suppression, auto gain) mangles
  // piano tone and timing — switching it off matters more than any algorithm.
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  return stream;
}

export function closeMic() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);

/** Start capturing. onChunk(samplesSoFar) is called ~10×/s with the full buffer
 *  (for Learn mode). Returns { stop() → { samples, sampleRate, startCtx } }. */
export function startRecording({ onLevel, onChunk } = {}) {
  const ac = audio();
  const src = ac.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but works everywhere (incl. iOS Safari) without
  // a separate worklet file; any constant timing offset is removed by calibration.
  const proc = ac.createScriptProcessor(4096, 1, 1);
  const mute = ac.createGain();
  mute.gain.value = 0;
  const chunks = [];
  let startCtx = null;
  proc.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    if (startCtx == null) startCtx = ac.currentTime - data.length / ac.sampleRate;
    chunks.push(new Float32Array(data));
    onLevel?.(rms(data));
    if (onChunk) onChunk(joinTail(chunks, ac.sampleRate));
  };
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ac.destination);
  // A compressed copy of the take (Opus or AAC, ~32 kbps), in case the student wants
  // to send it to their teacher. The raw samples above are what gets analysed.
  let media = null;
  const parts = [];
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
  if (type) {
    try {
      media = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32000 });
      media.ondataavailable = (e) => e.data.size && parts.push(e.data);
      media.start();
    } catch {
      media = null;
    }
  }
  return {
    get startCtx() { return startCtx; },
    stop() {
      proc.disconnect();
      src.disconnect();
      mute.disconnect();
      const samples = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0;
      for (const c of chunks) {
        samples.set(c, o);
        o += c.length;
      }
      const compressed = media
        ? new Promise((resolve) => {
          media.onstop = () => resolve(new Blob(parts, { type: media.mimeType }));
          media.stop();
        })
        : null;
      return { samples, sampleRate: ac.sampleRate, startCtx: startCtx ?? ac.currentTime, compressed };
    },
  };
}

// The last ~1.5 s of audio as one buffer (enough for live checks, cheap to build).
function joinTail(chunks, sampleRate) {
  const want = Math.round(1.5 * sampleRate);
  const parts = [];
  let n = 0;
  for (let i = chunks.length - 1; i >= 0 && n < want; i--) {
    parts.unshift(chunks[i]);
    n += chunks[i].length;
  }
  const out = new Float32Array(n);
  let o = 0;
  for (const c of parts) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const calibration = () => load('micCal', null);

/**
 * Three steps, ~10 s: room noise, speaker→mic delay (clicks), piano tuning (held A4).
 * onStep(text, step) narrates progress for the UI (step 1 quiet, 2 clicks, 3 the held A).
 */
export async function calibrate(onStep, onLevel) {
  await openMic();
  const ac = audio();

  onStep('1/3 · Stay quiet for a moment', 1);
  let r = startRecording({ onLevel });
  await wait(1500);
  const quiet = r.stop();
  const noise = rms(quiet.samples.subarray(Math.floor(quiet.samples.length * 0.3)));

  onStep('2/3 · Listening to clicks. Keep the volume up and stay quiet.', 2);
  r = startRecording({ onLevel });
  await wait(300);
  const t0 = ac.currentTime + 0.3;
  const clicks = Array.from({ length: 6 }, (_, i) => t0 + i * 0.5);
  clicks.forEach((t) => click(t, true));
  await wait(3800);
  const clickRec = r.stop();
  const latencyMs = measureLatency(clickRec.samples, clickRec.sampleRate, clicks.map((t) => t - clickRec.startCtx));

  onStep('3/3 · Play the A above middle C and hold it', 3);
  r = startRecording({ onLevel });
  await wait(3500);
  const aRec = r.stop();
  const tuningCents = estimateTuning(aRec.samples, aRec.sampleRate, 69);
  const signal = rms(aRec.samples);
  const snrDb = 20 * Math.log10(signal / Math.max(noise, 1e-6));

  const result = {
    noiseRms: noise,
    latencyMs: latencyMs ?? 120, // sensible default if the clicks weren't heard (headphones)
    latencyMeasured: latencyMs != null,
    tuningCents: tuningCents != null && Math.abs(tuningCents) < 60 ? tuningCents : 0,
    tuningMeasured: tuningCents != null,
    snrDb,
    at: Date.now(),
  };
  save('micCal', result);
  return result;
}

export function describeCalibration(c) {
  if (!c) return 'Not calibrated yet. Calibrate once per piano and room (about 10 seconds).';
  const parts = [
    c.latencyMeasured ? `delay ${Math.round(c.latencyMs)} ms` : 'delay not measured (using default — were headphones on?)',
    c.tuningMeasured ? `piano ${c.tuningCents >= 0 ? '+' : ''}${Math.round(c.tuningCents)} cents from A440` : "tuning not measured (didn't hear a clear A)",
  ];
  let warn = '';
  if (c.snrDb < 15) warn = ' The room is noisy for the mic. Move the device closer to the piano, or practise somewhere quieter.';
  return `Calibrated: ${parts.join(', ')}.${warn}`;
}
