// Unified note input: Web MIDI keyboard, on-screen keyboard, computer keys.
// Every source emits { type: 'on' | 'off', midi, velocity, t, source } — or
// { type: 'pedal', down, t, source } for the sustain pedal — with t on the
// performance.now() clock so timing analysis can treat them identically.
import { noteOn, noteOff } from './audio.js';
import { isBlackKey } from './music.js';

const listeners = new Set();
const held = new Set();
const status = { midi: 'unavailable', devices: [], sustain: false };
const statusListeners = new Set();

export function onNote(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onStatus(fn) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

function emitStatus() {
  statusListeners.forEach((fn) => fn(status));
}

function emit(evt) {
  if (evt.type === 'pedal') {
    if (status.sustain === evt.down) return;
    status.sustain = evt.down;
    listeners.forEach((fn) => fn(evt));
    return;
  }
  if (evt.type === 'on') held.add(evt.midi);
  else held.delete(evt.midi);
  // Digital pianos make their own sound; only synthesize for virtual input.
  if (evt.source !== 'midi') {
    if (evt.type === 'on') noteOn(evt.midi, evt.velocity);
    else noteOff(evt.midi);
  }
  document.querySelectorAll(`.key[data-midi="${evt.midi}"]`).forEach((k) => k.classList.toggle('down', evt.type === 'on'));
  listeners.forEach((fn) => fn(evt));
}

// ---- Web MIDI ----------------------------------------------------------
export async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    status.midi = 'unsupported';
    emitStatus();
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess();
    const bind = () => {
      status.devices = [];
      for (const input of access.inputs.values()) {
        status.devices.push(input.name);
        input.onmidimessage = handleMidi;
      }
      status.midi = status.devices.length ? 'connected' : 'no-device';
      emitStatus();
    };
    access.onstatechange = bind;
    bind();
  } catch {
    status.midi = 'denied';
    emitStatus();
  }
}

function handleMidi(msg) {
  const [st, d1, d2] = msg.data;
  const cmd = st & 0xf0;
  // MIDI timestamps share the performance.now() clock.
  const t = msg.timeStamp || performance.now();
  if (cmd === 0x90 && d2 > 0) emit({ type: 'on', midi: d1, velocity: d2 / 127, t, source: 'midi' });
  else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) emit({ type: 'off', midi: d1, velocity: 0, t, source: 'midi' });
  else if (cmd === 0xb0 && d1 === 64) emit({ type: 'pedal', down: d2 >= 64, t, source: 'midi' });
}

// ---- Computer keyboard (A W S E D F T G Y H U J K O L P ;) -------------
const KEYMAP = 'awsedftgyhujkolp;';
let keyBase = 60;
export function setKeyboardBase(midi) {
  keyBase = midi;
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest('input, select, textarea')) return;
  if (e.code === 'Space') {
    // Space = sustain pedal, so pedalling can be practised on the computer keys.
    e.preventDefault();
    emit({ type: 'pedal', down: true, t: performance.now(), source: 'keys' });
    return;
  }
  const i = KEYMAP.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  e.preventDefault();
  emit({ type: 'on', midi: keyBase + i, velocity: 0.75, t: performance.now(), source: 'keys' });
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    if (e.target.closest('input, select, textarea')) return;
    e.preventDefault(); // otherwise Space also "clicks" the focused button
    emit({ type: 'pedal', down: false, t: performance.now(), source: 'keys' });
    return;
  }
  const i = KEYMAP.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  const midi = keyBase + i;
  if (held.has(midi)) emit({ type: 'off', midi, velocity: 0, t: performance.now(), source: 'keys' });
});

// ---- On-screen keyboard -------------------------------------------------
export function renderKeyboard(container, { from = 48, to = 84 } = {}) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'keys';
  let whiteIndex = 0;
  for (let m = from; m <= to; m++) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key ' + (isBlackKey(m) ? 'black' : 'white');
    key.dataset.midi = m;
    key.setAttribute('aria-label', `Key ${m}`);
    if (isBlackKey(m)) key.style.setProperty('--i', whiteIndex);
    else {
      if (m % 12 === 0) key.textContent = `C${m / 12 - 1}`;
      whiteIndex++;
    }
    const down = (e) => {
      e.preventDefault();
      key.setPointerCapture?.(e.pointerId);
      emit({ type: 'on', midi: m, velocity: 0.75, t: performance.now(), source: 'screen' });
    };
    const up = () => {
      if (held.has(m)) emit({ type: 'off', midi: m, velocity: 0, t: performance.now(), source: 'screen' });
    };
    key.addEventListener('pointerdown', down);
    key.addEventListener('pointerup', up);
    key.addEventListener('pointercancel', up);
    key.addEventListener('lostpointercapture', up);
    wrap.append(key);
  }
  wrap.style.setProperty('--whites', whiteIndex);
  container.append(wrap);
  // Start scrolled so middle C is in view on narrow screens.
  requestAnimationFrame(() => {
    const c4 = wrap.querySelector('[data-midi="60"]');
    if (c4) container.scrollLeft = c4.offsetLeft - 8;
  });
}
