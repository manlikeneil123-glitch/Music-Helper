// The shelf on Today: each piece stands in its own lit niche. Tapping one zooms into
// it and the details slide in, with Perform (play it through) and Learn (learn slowly).
import { allPieces, checkHistory, troubleBars } from './check.js';
import { ICONS } from './icons.js';
import { still } from './settings.js';
import { renderScore } from './render.js';
import { excerpt, normalize } from './score.js';

// The cover: the piece's own first bars, drawn like a printed first page.
const covers = new Map();
function cover(p, i) {
  if (!covers.has(p.id)) {
    try {
      const s = normalize(p);
      const first = 1 + (s.barOffset ?? 0);
      const view = renderScore(excerpt(s, first, first + 3), { mode: 'page', width: 340 });
      covers.set(p.id, view.systems.slice(0, 2).map((x) => x.svg.outerHTML).join(''));
    } catch {
      covers.set(p.id, null); // an odd score still gets the plain page
    }
  }
  const art = covers.get(p.id);
  return art ? `<div class="sheet cover paper" aria-hidden="true" style="--tint:${TINTS[i % TINTS.length]}"><span class="cover-title">${esc(p.title)}</span>${art}</div>` : page(i);
}

const TINTS = ['#ff8a5c', '#ff4f8b', '#c06bff', '#ffb35c', '#ff6b8b'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const MIN_NICHES = 4;

// A little page of music, tinted per piece: the "bottle" on the shelf.
const page = (i) => `<svg class="sheet" viewBox="0 0 60 80" aria-hidden="true" style="--tint:${TINTS[i % TINTS.length]}">
  <rect x="2" y="2" width="56" height="76" rx="4" class="leaf"/>
  ${[0, 1].map((s) => [0, 1, 2, 3, 4].map((l) => `<line x1="9" x2="51" y1="${18 + s * 28 + l * 3.4}" y2="${18 + s * 28 + l * 3.4}"/>`).join('')).join('')}
  ${[[16, 25], [24, 21], [32, 27], [40, 19], [18, 52], [27, 56], [36, 49], [45, 54]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="2" class="head"/><line x1="${x + 2.4}" x2="${x + 2.4}" y1="${y}" y2="${y - 9}" class="stem"/>`).join('')}
</svg>`;

function facts(p) {
  const runs = checkHistory().filter((h) => h.pieceId === p.id);
  const best = runs.length ? Math.max(...runs.map((r) => r.score)) : null;
  const last = runs[runs.length - 1];
  const weak = Object.entries(troubleBars(p.id).perRun).sort((a, b) => b[1] - a[1])[0];
  return { runs: runs.length, best, ready: runs.some((r) => r.ready), last, weak: weak?.[0] };
}

export function shelfHtml() {
  const pieces = allPieces();
  const niches = pieces.map((p, i) => `
    <li><button type="button" class="niche" data-piece="${esc(p.id)}" style="--tint:${TINTS[i % TINTS.length]}" aria-label="${esc(p.title)}: open">
      ${cover(p, i)}<span class="ledge" aria-hidden="true"></span><span class="niche-name">${esc(p.title)}</span>
    </button></li>`);
  if (!pieces.length) niches.push(`<li><button type="button" class="niche add" data-add><span class="plus" aria-hidden="true">+</span><span class="ledge" aria-hidden="true"></span><span class="niche-name">Add your first piece</span></button></li>`);
  while (niches.length < MIN_NICHES) niches.push('<li aria-hidden="true"><span class="niche empty"><span class="ledge"></span></span></li>');
  return `
    <section class="shelf" aria-labelledby="shelf-h">
      <h3 id="shelf-h">Your <em>pieces</em></h3>
      <ul class="niches">${niches.join('')}</ul>
    </section>`;
}

function detail(p, i, count) {
  const f = facts(p);
  // Two-tone title, as in a shop window: the last word in italic serif (one word: all but its first two letters).
  const words = p.title.trim().split(/\s+/);
  const cut = words.length > 1 ? p.title.trim().length - words[words.length - 1].length : Math.min(2, p.title.length - 1);
  return `
    <div class="pz-stage">
      <div class="pz-niche" style="--tint:${TINTS[i % TINTS.length]}">${cover(p, i)}<span class="ledge" aria-hidden="true"></span></div>
      <div class="pz-info">
        <p class="kicker">${p.id.startsWith('teacher:') ? 'From your teacher' : 'Your piece'} · ${i + 1} of ${count}</p>
        <h2 id="pz-title">${esc(p.title.trim().slice(0, cut))}<em>${esc(p.title.trim().slice(cut))}</em></h2>
        <dl class="pz-facts">
          <div><dt>Played through</dt><dd>${f.runs ? `${f.runs} time${f.runs === 1 ? '' : 's'}` : 'Not yet'}</dd></div>
          <div><dt>Best score</dt><dd>${f.best == null ? '–' : f.ready ? `${f.best}, exam ready` : f.best}</dd></div>
          <div><dt>Trickiest bar</dt><dd>${f.weak ? `Bar ${f.weak}` : 'None found yet'}</dd></div>
        </dl>
        <div class="pz-actions">
          <button class="btn primary" type="button" data-go="perform">${ICONS.play} Perform</button>
          <button class="btn" type="button" data-go="learn">${ICONS.book} Learn</button>
        </div>
        ${count > 1 ? `<div class="pz-nav"><button class="btn small-btn" type="button" data-step="-1" aria-label="Previous piece">${ICONS.arrow}</button><button class="btn small-btn" type="button" data-step="1" aria-label="Next piece">${ICONS.arrow}</button></div>` : ''}
      </div>
    </div>
    <button class="btn small-btn pz-close" type="button" data-close aria-label="Back to Today">✕</button>`;
}

/** go(pieceId, 'perform' | 'learn'); add() opens the import. */
export function wireShelf(root, { go, add }) {
  root.querySelector('.niche[data-add]')?.addEventListener('click', add);
  root.querySelectorAll('.niche[data-piece]').forEach((n) => n.addEventListener('click', () => open(n)));

  function open(from) {
    const pieces = allPieces();
    let i = pieces.findIndex((p) => p.id === from.dataset.piece);
    const dlg = document.createElement('dialog');
    dlg.className = 'piece-zoom';
    dlg.setAttribute('aria-labelledby', 'pz-title');
    const draw = () => { dlg.innerHTML = detail(pieces[i], i, pieces.length); wire(); };
    const wire = () => {
      dlg.querySelector('[data-close]').addEventListener('click', () => close());
      dlg.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { const id = pieces[i].id; close(true); go(id, b.dataset.go); }));
      dlg.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
        i = (i + Number(b.dataset.step) + pieces.length) % pieces.length;
        draw();
        dlg.classList.add(b.dataset.step === '1' ? 'next' : 'prev');
        dlg.querySelector(`[data-step="${b.dataset.step}"]`)?.focus();
      }));
    };
    draw();
    document.body.append(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    // Esc animates back to the shelf; if the browser cancels another way, it just closes.
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    dlg.showModal();
    // The camera move: the big niche starts exactly where the tapped one sits.
    const target = dlg.querySelector('.pz-niche');
    const flip = (a, b) => `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    if (!still()) {
      target.animate([{ transform: flip(from.getBoundingClientRect(), target.getBoundingClientRect()), transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 560, easing: 'cubic-bezier(0.6, 0, 0.2, 1)' });
      dlg.classList.add('opening');
    }
    function close(now = false) {
      const home = root.querySelector(`.niche[data-piece="${CSS.escape(pieces[i].id)}"]`) ?? from;
      if (now || still()) { dlg.close(); if (!now) home.focus(); return; }
      dlg.classList.add('closing');
      const t = dlg.querySelector('.pz-niche');
      const back = home.getBoundingClientRect();
      const a = t.animate([{ transform: 'none', transformOrigin: '0 0' }, { transform: flip(back, t.getBoundingClientRect()), transformOrigin: '0 0' }], { duration: 420, easing: 'cubic-bezier(0.6, 0, 0.2, 1)' });
      a.onfinish = () => { dlg.close(); home.focus(); };
    }
  }
}
