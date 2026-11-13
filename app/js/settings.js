// Settings: theme, still scenery, vibration, your data and the legal pages. Theme and
// motion are applied before first paint by theme-boot.js from the same keys.
import { load, save, exportAll } from './store.js';
import { currentUser } from './cloud.js';
import { hapticsOn, setHaptics, hapticsSupport, tap } from './haptics.js';
import { VERSION } from './version.js';
import { openWhatsNew } from './whatsnew.js';
import { addReminder } from './reminder.js';

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
  const bg = t === 'day' ? '#f4f5f7' : '#131619';
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
      <div class="set-row reminder-row"><span>Daily reminder<small>Adds a "Piano practice" event with an alert to your phone's calendar, every day at this time</small></span>
        <span class="row gap"><input type="time" id="set-remind-time" value="${load('remindAt', '17:00')}" aria-label="Reminder time"><button class="btn small-btn" type="button" id="set-remind">Add</button></span></div>
      <p class="fine" id="set-remind-note" role="status"></p>
      <label class="set-row"><span>Less motion<small>No animations or confetti${motionQuery.matches ? '. Your device already asks for less motion' : ''}</small></span>
        <input type="checkbox" role="switch" id="set-still" ${stillChosen() || motionQuery.matches ? 'checked' : ''} ${motionQuery.matches ? 'disabled' : ''}></label>
      ${hapticsSupport() ? `<label class="set-row"><span>Vibration<small>A buzz for right and wrong answers</small></span>
        <input type="checkbox" role="switch" id="set-haptics" ${hapticsOn() ? 'checked' : ''}></label>` : ''}
      <button class="btn ghost" type="button" id="set-tour">Show me around (2-minute tour)</button>
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
  root.querySelector('#set-remind')?.addEventListener('click', async () => {
    const time = root.querySelector('#set-remind-time').value || '17:00';
    save('remindAt', time);
    const how = await addReminder({ time, minutes: load('goal', 20), url: location.origin + location.pathname });
    root.querySelector('#set-remind-note').textContent = how === 'shared'
      ? 'Choose your Calendar app to add it.'
      : 'Open the downloaded file and tap "Add" to put it in your calendar. To stop it, delete the event in your calendar.';
  });
  root.querySelector('#set-news')?.addEventListener('click', () => openWhatsNew());
  root.querySelector('#set-tour')?.addEventListener('click', () => dispatchEvent(new Event('stave:tour')));
}
