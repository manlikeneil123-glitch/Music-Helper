// What's new: one line on Today after an update, never a pop-up. Tapping it opens the
// latest few releases, with older ones folded away.
import { CHANGES } from './changelog.js';
import { VERSION } from './version.js';
import { load, save } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const SHOWN = 3;

/** The line for Today, or '' once this version's notes have been seen (or on first run). */
export function newsLine() {
  const seen = load('seenVersion', null);
  if (seen === VERSION) return '';
  if (seen === null) { save('seenVersion', VERSION); return ''; } // a new user has nothing to catch up on
  return `<button class="news-line" type="button" id="news-open"><b>New in ${esc(VERSION)}</b> ${esc(CHANGES[0].title)}</button>`;
}

const release = (c) => `<section><h4>${esc(c.version)}: ${esc(c.title)} <small class="muted">${new Date(`${c.date}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small></h4><ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>`;

export function openWhatsNew(onClose = () => {}) {
  save('seenVersion', VERSION);
  const dlg = document.createElement('dialog');
  dlg.className = 'card news-dialog';
  dlg.setAttribute('aria-labelledby', 'news-title');
  dlg.innerHTML = `
    <div class="row between"><h3 id="news-title">What's new</h3><button class="btn small-btn" type="button" data-close>Close</button></div>
    ${CHANGES.slice(0, SHOWN).map(release).join('')}
    ${CHANGES.length > SHOWN ? `<details><summary>Older versions</summary>${CHANGES.slice(SHOWN).map(release).join('')}</details>` : ''}`;
  const close = () => { dlg.close(); dlg.remove(); onClose(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  dlg.showModal();
}
