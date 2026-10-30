// Settings: theme, still scenery, vibration, your data and the legal pages. Theme and
// motion are applied before first paint by theme-boot.js from the same keys.
import { load, save, exportAll } from './store.js';
import { currentUser } from './cloud.js';
import { hapticsOn, setHaptics, hapticsSupport, tap } from './haptics.js';
import { VERSION } from './version.js';
import { openWhatsNew } from './whatsnew.js';

const THEME_KEY = 'stave:theme';
const STILL_KEY = 'stave:still';
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

const local = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* private mode */ } return null; };

export const theme = () => (local(THEME_KEY) === 'day' ? 'day' : 'night');
export const stillChosen = () => local(STILL_KEY) === 'on';
/** True when nothing should move: the in-app switch or the device setting. */
export const still = () => stillChosen() || motionQuery.matches;

export function applyTheme(t, { sync = true } = {}) {
  const d = document.documentElement;
  d.dataset.theme = t;
  local(THEME_KEY, t);
  const bg = t === 'day' ? '#e9edf2' : '#0d1014';
  d.style.background = bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  // Saved with the account too, so a new phone opens in the same theme.
  if (sync && load('theme', null) !== t) save('theme', t);
}

function applyStill() {
  document.documentElement.classList.toggle('still', still());
}

/** On start, and after an account pull: the synced theme wins over this device's. */
export function initSettings() {
  const synced = load('theme', null);
  if (synced && synced !== theme()) applyTheme(synced, { sync: false });
  applyStill();
  motionQuery.addEventListener?.('change', applyStill);
}

export function downloadMyData() {
  const data = { app: 'Stave', exported: new Date().toISOString(), account: currentUser()?.username ?? null, data: exportAll() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `stave-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function settingsCard() {
  const t = theme();
  return `
    <section class="card settings" id="settings">
      <h3>Settings</h3>
      <div class="set-row">
        <span id="set-theme-label">Theme</span>
        <div class="segmented mini" role="group" aria-labelledby="set-theme-label">
          <button type="button" data-theme-pick="night" aria-pressed="${t === 'night'}">Night</button>
          <button type="button" data-theme-pick="day" aria-pressed="${t === 'day'}">Day</button>
        </div>
      </div>
      <label class="set-row"><span>Still scenery<small>No moving background or animations${motionQuery.matches ? '. Your device already asks for less motion' : ''}</small></span>
        <input type="checkbox" role="switch" id="set-still" ${stillChosen() || motionQuery.matches ? 'checked' : ''} ${motionQuery.matches ? 'disabled' : ''}></label>
      <label class="set-row"><span>Vibration<small>${hapticsSupport()}</small></span>
        <input type="checkbox" role="switch" id="set-haptics" ${hapticsOn() ? 'checked' : ''}></label>
      <button class="btn ghost" type="button" id="set-export">Download my data<small class="muted">&nbsp;(JSON)</small></button>
      <nav class="legal-links" aria-label="About Stave"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="help.html">Help and support</a><a href="accessibility.html">Accessibility</a></nav>
      <p class="fine">Stave ${VERSION} · <button class="linkish" type="button" id="set-news">What's new</button></p>
    </section>`;
}

export function wireSettings(root) {
  root.querySelectorAll('[data-theme-pick]').forEach((b) => b.addEventListener('click', () => {
    applyTheme(b.dataset.themePick);
    root.querySelectorAll('[data-theme-pick]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    tap('selection');
  }));
  root.querySelector('#set-still')?.addEventListener('change', (e) => { local(STILL_KEY, e.target.checked ? 'on' : 'off'); applyStill(); });
  root.querySelector('#set-haptics')?.addEventListener('change', (e) => setHaptics(e.target.checked));
  root.querySelector('#set-export')?.addEventListener('click', downloadMyData);
  root.querySelector('#set-news')?.addEventListener('click', () => openWhatsNew());
}
