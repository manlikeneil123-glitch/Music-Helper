// Getting started: a short checklist on Today that ticks itself off from what the
// student has actually done. Each line goes straight to the place to do it. Hidden
// once everything is done (after one "All set"), or when the student hides it.
import { load, save } from './store.js';
import { calibration } from './mic.js';
import { allPieces, checkHistory } from './check.js';
import { profile } from './welcome.js';

function items() {
  const p = profile();
  const seen = Object.values(load('cards', {})).reduce((a, r) => a + (r.seen ?? 0), 0);
  const list = [
    { id: 'tour', done: load('tourDone', false), text: 'Take the 2-minute tour', go: 'tour' },
    { id: 'piece', done: allPieces().length > 0, text: 'Add your first piece', go: 'play' },
    { id: 'mic', done: Boolean(calibration()) || checkHistory().some((h) => h.input === 'midi'), text: 'Set up the microphone (or plug in a MIDI keyboard)', go: 'mic' },
    { id: 'play', done: checkHistory().some((h) => h.pieceId !== 'c-scale'), text: 'Play a piece through once', go: 'play' },
    { id: 'read', done: seen >= 20, text: 'Answer 20 note flashcards', go: 'cards' },
  ];
  if (p?.board && p.board !== 'Not doing exams') list.push({ id: 'exam', done: Boolean(load('exam', null)?.date), text: 'Add your exam date', go: 'exam' });
  return list;
}

/** The card for Today, or '' when hidden or finished. */
export function gettingStartedCard() {
  if (load('startHidden', false)) return '';
  const list = items();
  const done = list.filter((x) => x.done).length;
  if (done === list.length) {
    if (load('startCelebrated', false)) return '';
    save('startCelebrated', true);
    return '<section class="card getting-started all-set"><h3>All set</h3><p class="muted small">You\'ve tried everything. From here, just follow Today\'s plan.</p></section>';
  }
  return `
    <section class="card getting-started" aria-labelledby="gs-title">
      <div class="row between"><h3 id="gs-title">Getting started</h3><span class="pill">${done} of ${list.length}</span></div>
      <div class="goal" aria-hidden="true"><div style="width:${Math.round((done / list.length) * 100)}%"></div></div>
      <ul class="gs-list">${list.map((x) => `<li class="${x.done ? 'done' : ''}"><button type="button" data-gs="${x.go}" ${x.done ? 'aria-disabled="true"' : ''}><span class="tick" aria-hidden="true">${x.done ? '✓' : ''}</span><span>${x.text}</span><span class="sr-only">${x.done ? '(done)' : ''}</span></button></li>`).join('')}</ul>
      <button class="btn ghost link" type="button" id="gs-hide">Hide this list</button>
    </section>`;
}

/** handlers: { tour(), mic(), show(tab) } */
export function wireGettingStarted(root, { tour, mic, show, redraw }) {
  root.querySelectorAll('[data-gs]').forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    const go = b.dataset.gs;
    if (go === 'tour') tour();
    else if (go === 'mic') mic();
    else show(go);
  }));
  root.querySelector('#gs-hide')?.addEventListener('click', () => { save('startHidden', true); redraw(); });
}
