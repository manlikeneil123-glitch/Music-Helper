// Microphone setup, as a guided few steps in plain words: where to put the phone, stay
// quiet, let the phone hear its own clicks, play one A. The result says what it means
// for checking ("ready", "noisy room"), not decibels and cents.
import { calibrate, calibration } from './mic.js';
import { still } from './settings.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// One octave from middle C with the A to play lit up.
const KEYS_SVG = (() => {
  const W = 26, H = 86;
  const whites = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const blacks = [0, 1, 3, 4, 5]; // after these white keys
  return `<svg class="mini-keys" viewBox="0 0 ${whites.length * W + 2} ${H + 22}" role="img" aria-label="Piano keys from middle C. The A, the sixth white key, is highlighted.">
    ${whites.map((n, i) => `<rect x="${1 + i * W}" y="1" width="${W}" height="${H}" rx="3" class="${i === 5 ? 'lit' : 'w'}"/><text x="${1 + i * W + W / 2}" y="${H - 8}" class="kl">${n}</text>`).join('')}
    ${blacks.map((i) => `<rect x="${1 + i * W + W * 0.68}" y="1" width="${W * 0.64}" height="${H * 0.6}" rx="2" class="b"/>`).join('')}
    <text x="1" y="${H + 18}" class="kc" text-anchor="start">middle C</text><text x="${1 + 5 * W + W / 2}" y="${H + 18}" class="kc lit-t">play this</text>
  </svg>`;
})();

const STEPS = {
  1: { title: 'Stay quiet', text: 'Listening to your room for a moment. Keep still and don\'t play.' },
  2: { title: 'Listen to the clicks', text: 'Your phone will click a few times. Keep the volume up and stay quiet: this measures how long sound takes to reach the microphone.' },
  3: { title: 'Play an A and hold it', text: 'Play the A above middle C, medium loud, and keep it held down until this finishes.' },
};

/** Plain-words verdict on a calibration, for the result screen and the Perform panel. */
export function micVerdict(c = calibration()) {
  if (!c) return { level: 'none', headline: 'Not set up yet', lines: [] };
  const lines = [];
  const quiet = (c.snrDb ?? 30) >= 15;
  lines.push(quiet ? { ok: true, text: 'Your room is quiet enough.' } : { ok: false, text: 'Your room is a bit noisy for the microphone. Move the phone closer to the piano, or find a quieter room.' });
  lines.push(c.latencyMeasured ? { ok: true, text: 'Timing measured, so early and late notes will be judged fairly.' } : { ok: false, text: "The phone couldn't hear its own clicks (headphones on, or volume low?). Checking still works with a standard timing, but run setup again for the best results." });
  if (!c.tuningMeasured) lines.push({ ok: false, text: "No clear A was heard. Play the A above middle C and hold it during step 3." });
  else if (Math.abs(c.tuningCents) < 10) lines.push({ ok: true, text: 'Your piano is in tune.' });
  else lines.push({ ok: true, text: `Your piano is slightly ${c.tuningCents > 0 ? 'sharp' : 'flat'}. That's normal, and Stave allows for it.` });
  const bad = lines.filter((l) => !l.ok).length;
  const level = bad === 0 ? 'ready' : bad === 1 && quiet ? 'usable' : 'retry';
  return { level, headline: level === 'ready' ? 'Ready: Stave can hear your piano' : level === 'usable' ? 'Usable, with one thing to fix' : 'Worth trying again', lines };
}

/** One line for Perform: is the mic set up for this piano? */
export function micSummary(c = calibration()) {
  if (!c) return 'Not set up yet. It takes about 20 seconds.';
  const v = micVerdict(c);
  const days = Math.floor((Date.now() - (c.at ?? 0)) / 86400000);
  return `${v.level === 'ready' ? 'Set up and ready' : v.level === 'usable' ? 'Set up, with one thing to fix' : 'Needs setting up again'} (${days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}). Do it again if you move to a different piano or room.`;
}

export function openMicSetup({ onDone = () => {} } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'card mic-setup';
  dlg.setAttribute('aria-labelledby', 'ms-title');
  let running = false;
  const close = () => { if (running) return; dlg.close(); dlg.remove(); onDone(calibration()); };

  const progress = (n) => `<ol class="ms-dots" aria-label="Step ${n} of 3">${[1, 2, 3].map((k) => `<li class="${k < n ? 'done' : k === n ? 'now' : ''}"></li>`).join('')}</ol>`;

  function intro() {
    dlg.innerHTML = `
      <div class="row between"><h3 id="ms-title">Set up the microphone</h3><button class="btn small-btn" type="button" data-close>Close</button></div>
      <p>About 20 seconds, once for each piano. It teaches Stave how your piano and room sound, so it can tell right notes from wrong ones.</p>
      <ol class="ms-prep">
        <li><b>Put your phone on the music stand</b>, where it will be when you play.</li>
        <li><b>Turn the volume up</b> and take headphones off: the phone plays some clicks to itself.</li>
        <li><b>Find the A above middle C.</b> You'll play it in the last step.${KEYS_SVG}</li>
      </ol>
      <button class="btn primary block" type="button" data-go>Start</button>`;
    dlg.querySelector('[data-close]').addEventListener('click', close);
    dlg.querySelector('[data-go]').addEventListener('click', run);
  }

  function stepView(n) {
    const s = STEPS[n];
    dlg.innerHTML = `
      <h3 id="ms-title">Setting up</h3>
      ${progress(n)}
      <div class="ms-step"><b>Step ${n} of 3: ${esc(s.title)}</b><p>${esc(s.text)}</p>${n === 3 ? KEYS_SVG : ''}</div>
      <div class="level ms-level" aria-hidden="true"><div></div></div>
      <p class="muted small">The bar shows what the microphone hears.</p>`;
  }

  const level = (v) => {
    const bar = dlg.querySelector('.ms-level > div');
    if (!bar) return;
    const db = 20 * Math.log10(Math.max(v, 1e-5));
    bar.style.width = `${Math.max(0, Math.min(100, ((db + 50) / 44) * 100))}%`;
  };

  async function run() {
    running = true;
    stepView(1);
    try {
      const cal = await calibrate((_, n) => n && stepView(n), level);
      running = false;
      result(cal);
    } catch {
      running = false;
      dlg.innerHTML = `
        <h3 id="ms-title">Stave can't use the microphone</h3>
        <p>Your browser blocked it. Allow the microphone for this site (in Safari: <b>aA</b> in the address bar, then Website Settings; in Chrome: the icon left of the address), then try again.</p>
        <div class="row gap"><button class="btn" type="button" data-close>Close</button><button class="btn primary" type="button" data-go>Try again</button></div>`;
      dlg.querySelector('[data-close]').addEventListener('click', close);
      dlg.querySelector('[data-go]').addEventListener('click', run);
    }
  }

  function result(cal) {
    const v = micVerdict(cal);
    dlg.innerHTML = `
      <h3 id="ms-title" class="ms-head ${v.level}">${esc(v.headline)}</h3>
      <ul class="ms-result">${v.lines.map((l) => `<li class="${l.ok ? 'ok' : 'fix'}"><span aria-hidden="true">${l.ok ? '✓' : '!'}</span>${esc(l.text)}</li>`).join('')}</ul>
      <div class="row gap">${v.level === 'ready' ? '' : '<button class="btn" type="button" data-go>Try again</button>'}<button class="btn primary" type="button" data-close>${v.level === 'ready' ? 'Start playing' : 'Done'}</button></div>`;
    dlg.querySelector('[data-close]').addEventListener('click', close);
    dlg.querySelector('[data-go]')?.addEventListener('click', run);
  }

  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  intro();
  dlg.showModal();
  if (still()) dlg.classList.add('still');
}
