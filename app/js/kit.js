// Recording kit: 12 short, labelled takes on a real piano (some with deliberate
// mistakes), scored on the spot and downloaded as one .zip for tuning the microphone
// checking. Nothing is uploaded; the founder shares the file on purpose.
import { KIT_STEPS, truthFor, scoreTake, summariseTakes } from './kiteval.js';
import { findPiece } from './check.js';
import { timeline, totalBeats } from './score.js';
import { openMic, startRecording, calibration } from './mic.js';
import { analyseAudio, encodeWav } from './micanalysis.js';
import { analyse } from './analysis.js';
import { micThresholds } from './tuning.js';
import { audio, click } from './audio.js';
import { renderScore } from './render.js';
import { zip } from './zip.js';

const COUNT_IN = 4;
const takes = new Map(); // step id → { samples, sampleRate, beat0Sec, bpm, metrics }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Half the sample rate (two-tap average): plenty for piano analysis, half the size.
function halve(samples, rate) {
  if (rate < 32000) return { samples, rate };
  const out = new Float32Array(Math.floor(samples.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
  return { samples: out, rate: rate / 2 };
}

function stepPiece(step) {
  if (!step.piece) return null;
  const piece = findPiece(step.piece);
  if (!piece) return null;
  const bpm = step.bpm ?? Math.max(40, Math.round(((piece.targetBpm ?? 80) * (step.bpmFactor ?? 1)) / 2) * 2);
  return { piece, bpm, tl: timeline(piece) };
}

export function openKit() {
  const dlg = document.createElement('dialog');
  dlg.className = 'card kit-dialog';
  let busy = false;

  const render = () => {
    const done = KIT_STEPS.filter((s) => takes.has(s.id)).length;
    const scored = KIT_STEPS.map((s) => takes.get(s.id)?.metrics).filter(Boolean);
    const sum = scored.length ? summariseTakes(scored) : null;
    dlg.innerHTML = `
      <div class="row between"><h3>Recording kit</h3><button class="btn small-btn" type="button" data-close>Close</button></div>
      <p class="muted small">Twelve short takes on your own piano, about 10 minutes. Some ask for deliberate mistakes: that's how we check the app catches them. Put the phone where a student would (on the music stand), and calibrate in Perform first if you haven't.</p>
      ${sum ? `<p class="small kit-sum">So far: right notes accepted <b>${Math.round(sum.acceptRate * 100)}%</b> · false alarms <b>${Math.round(sum.falseFlagRate * 100)}%</b> · mistakes caught <b>${Math.round(sum.catchRate * 100)}%</b></p>` : ''}
      <ol class="kit-steps">${KIT_STEPS.map((s) => {
        const sp = stepPiece(s);
        const truth = sp ? truthFor(s, sp.tl) : { instructions: [] };
        const t = takes.get(s.id);
        const m = t?.metrics;
        return `<li class="${t ? 'done' : ''}">
          <div class="row between"><b>${esc(s.title)}</b>${sp ? `<span class="muted small">${sp.bpm} bpm</span>` : ''}</div>
          <p class="small">${esc(s.text ?? '')} ${truth.instructions.map(esc).join(' ')}</p>
          ${s.piece && !sp ? '<p class="error small">This piece isn\'t loaded yet: open Perform once, then come back.</p>' : ''}
          ${m ? `<p class="muted small">Heard: ${m.accepted}/${m.right} right notes accepted${m.falseFlags ? `, ${m.falseFlags} false alarm${m.falseFlags > 1 ? 's' : ''} (${esc(m.flagged.slice(0, 2).join('; '))})` : ''}${m.mistakes ? `, ${m.caught}/${m.mistakes} mistakes caught` : ''}.</p>` : t ? '<p class="muted small">Recorded.</p>' : ''}
          <div class="row gap"><button class="btn small-btn${t ? '' : ' accent'}" type="button" data-rec="${s.id}" ${s.piece && !sp ? 'disabled' : ''}>${t ? 'Record again' : '● Record'}</button>${sp ? `<button class="btn small-btn" type="button" data-show="${s.id}">Show the music</button>` : ''}</div>
          <div class="kit-score paper" data-score="${s.id}" hidden></div>
        </li>`;
      }).join('')}</ol>
      <p class="status" id="kit-status" aria-live="polite"></p>
      <button class="btn primary block" type="button" data-zip ${done ? '' : 'disabled'}>Download the kit (${done} of ${KIT_STEPS.length} takes)</button>
      <p class="fine">Recordings stay on this device until you share the .zip yourself.</p>`;
    wire();
  };

  const status = (t) => { const el = dlg.querySelector('#kit-status'); if (el) el.textContent = t; };

  async function record(step) {
    if (busy) return;
    busy = true;
    dlg.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      await openMic();
      const sp = stepPiece(step);
      const ac = audio();
      const recorder = startRecording({});
      let seconds;
      let beat0Sec = null;
      if (sp) {
        const spb = 60 / sp.bpm;
        const begin = ac.currentTime + 0.4;
        for (let b = 0; b < COUNT_IN; b++) click(begin + b * spb, b === 0);
        const beat0Ctx = begin + COUNT_IN * spb;
        seconds = (beat0Ctx - ac.currentTime) + (totalBeats(sp.piece) + 2) * spb;
        status('Count-in, then play.');
        await new Promise((r) => setTimeout(r, seconds * 1000));
        const take = recorder.stop();
        beat0Sec = beat0Ctx - take.startCtx;
        save(step, take, beat0Sec, sp);
      } else {
        status('Recording the room. Keep still.');
        await new Promise((r) => setTimeout(r, step.seconds * 1000));
        save(step, recorder.stop(), null, null);
      }
      status(`${step.title}: recorded.`);
    } catch {
      status('The microphone was blocked. Allow it for this page, then try again.');
    } finally {
      busy = false;
      render();
    }
  }

  function save(step, take, beat0Sec, sp) {
    const { samples, rate } = halve(take.samples, take.sampleRate);
    const entry = { samples, sampleRate: rate, beat0Sec, bpm: sp?.bpm ?? null };
    if (sp) {
      const cal = calibration();
      const msPerBeat = 60000 / sp.bpm;
      const mic = analyseAudio({ samples, sampleRate: rate, expected: sp.tl, msPerBeat, beat0Sec, latencyMs: cal?.latencyMs ?? 120, tuningCents: cal?.tuningCents ?? 0, thresholds: micThresholds() });
      const r = analyse({ expected: sp.tl, played: mic.played, unclear: mic.unclear, spread: mic.spread, msPerBeat, beatsPerBar: sp.piece.beatsPerBar, source: 'mic', score: sp.piece });
      entry.metrics = scoreTake(r.notes, truthFor(step, sp.tl).intended);
    }
    takes.set(step.id, entry);
  }

  function download() {
    const cal = calibration();
    const files = [];
    const labels = { made: new Date().toISOString(), app: 'Stave recording kit v1', device: navigator.userAgent, calibration: cal ?? null, takes: [] };
    for (const s of KIT_STEPS) {
      const t = takes.get(s.id);
      if (!t) continue;
      const sp = stepPiece(s);
      const file = `${String(KIT_STEPS.indexOf(s) + 1).padStart(2, '0')}-${s.id}.wav`;
      labels.takes.push({ step: s.id, file, piece: s.piece ?? null, bpm: t.bpm, beat0Sec: t.beat0Sec, sampleRate: t.sampleRate, intended: sp ? truthFor(s, sp.tl).intended : [], metrics: t.metrics ?? null });
      files.push({ name: file, data: null, blob: encodeWav(t.samples, t.sampleRate) });
    }
    Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) }))).then((ready) => {
      ready.unshift({ name: 'labels.json', data: new TextEncoder().encode(JSON.stringify(labels, null, 1)) });
      const url = URL.createObjectURL(zip(ready));
      const a = document.createElement('a');
      a.href = url;
      a.download = `mic-kit-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      status('Downloaded. Send the .zip over and the checking gets tuned to real pianos.');
    });
  }

  function wire() {
    dlg.querySelector('[data-close]').addEventListener('click', () => { if (!busy) { dlg.close(); dlg.remove(); } });
    dlg.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => record(KIT_STEPS.find((s) => s.id === b.dataset.rec))));
    dlg.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => {
      const box = dlg.querySelector(`[data-score="${b.dataset.show}"]`);
      box.hidden = !box.hidden;
      if (!box.hidden && !box.children.length) {
        const sp = stepPiece(KIT_STEPS.find((s) => s.id === b.dataset.show));
        box.append(...renderScore(sp.piece, { mode: 'page', width: box.clientWidth || 320 }).systems.map((x) => x.svg));
      }
    }));
    dlg.querySelector('[data-zip]').addEventListener('click', download);
  }

  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!busy) { dlg.close(); dlg.remove(); } });
  document.body.append(dlg);
  render();
  dlg.showModal();
}
