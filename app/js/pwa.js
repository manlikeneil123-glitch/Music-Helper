// Install and offline: a notice when the connection drops (practice keeps working; an
// account catches up when it's back), and a once-only card explaining how to add Stave
// to the home screen, with the browser's own Install button where it offers one.
import { load, save } from './store.js';

let deferred = null; // Android/desktop Chrome's install prompt, if offered
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function mountOffline() {
  const bar = document.createElement('div');
  bar.className = 'offline-bar';
  bar.setAttribute('role', 'status');
  bar.hidden = navigator.onLine !== false;
  bar.textContent = "You're offline. Practice still works and everything is saved on this phone.";
  document.body.append(bar);
  addEventListener('offline', () => { bar.hidden = false; });
  addEventListener('online', () => { bar.hidden = true; });
}

/** The install card for Today, or '' if installed or dismissed. */
export function installCard() {
  if (standalone() || load('installCoach', false)) return '';
  const how = isIos()
    ? 'In Safari, tap the Share button, then <b>Add to Home Screen</b>.'
    : deferred ? 'It opens full screen, works offline and starts faster.' : 'Open your browser menu, then <b>Install app</b> or <b>Add to Home screen</b>.';
  return `
    <section class="card install-card">
      <div><h3>Put Stave on your home screen</h3><p class="muted small">${how}</p></div>
      <div class="row gap">${deferred ? '<button class="btn primary" type="button" id="pwa-install">Install</button>' : ''}<button class="btn" type="button" id="pwa-dismiss">Not now</button></div>
    </section>`;
}

export function wireInstall(root, redraw) {
  const done = () => { save('installCoach', true); redraw(); };
  root.querySelector('#pwa-dismiss')?.addEventListener('click', done);
  root.querySelector('#pwa-install')?.addEventListener('click', async () => {
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    done();
  });
}
