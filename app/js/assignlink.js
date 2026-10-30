// "Send as an assignment link": for teachers who don't use accounts. Everything is in
// the link itself (piece, bars, tempo, checking, due date, note), shown as a QR code
// to scan in the lesson or shared to WhatsApp.
import { assignmentLink } from './teach.js';
import { qrSvg } from './qr.js';
import { PIECES } from './pieces.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** ctx: { piece: { id, title }, from, to, bpm, strictness } */
export function openAssignDialog(ctx) {
  const portable = PIECES.some((p) => p.id === ctx.piece.id);
  const dlg = document.createElement('dialog');
  dlg.className = 'card assign-dialog';
  const bars = ctx.from ? (ctx.from === ctx.to ? `bar ${ctx.from}` : `bars ${ctx.from}–${ctx.to}`) : '';
  dlg.innerHTML = `
    <form method="dialog" id="al-form">
      <h3>Send as an assignment</h3>
      ${portable ? '' : '<p class="warn-note">This score is only on this device. The student will need it too: share the file, or use a teacher account to share scores.</p>'}
      <label class="field">What <input name="title" type="text" maxlength="120" value="${esc(`${ctx.piece.title}${bars ? `, ${bars}` : ''}`)}"></label>
      <div class="row gap wrap">
        <label class="field inline">Bars <input name="from" type="number" min="1" value="${ctx.from ?? ''}"> to <input name="to" type="number" min="1" value="${ctx.to ?? ''}"></label>
        <label class="field inline">Tempo <input name="bpm" type="number" min="20" max="300" value="${ctx.bpm ?? ''}"> bpm</label>
      </div>
      <div class="row gap wrap">
        <label class="field inline">Due <input name="due" type="date"></label>
        <label class="field inline">From <input name="from_name" type="text" maxlength="40" placeholder="e.g. Miss T"></label>
      </div>
      <label class="field">Note <input name="note" type="text" maxlength="300" placeholder="Optional: what to listen for"></label>
      <button class="btn accent" type="button" id="al-make">Make link</button>
      <div id="al-out" hidden>
        <div class="qr" id="al-qr"></div>
        <p class="muted small">Scan with the student's phone camera, or share the link.</p>
        <div class="row gap"><button class="btn primary" type="button" id="al-share">Share link</button><button class="btn" type="button" id="al-copy">Copy</button></div>
      </div>
      <button class="btn ghost link" value="close">Close</button>
    </form>`;
  document.body.append(dlg);
  const form = dlg.querySelector('form');
  let url = '';
  dlg.querySelector('#al-make').addEventListener('click', () => {
    const v = (n) => form.elements[n].value.trim();
    const num = (n) => (v(n) ? Number(v(n)) : null);
    url = assignmentLink({
      title: v('title') || ctx.piece.title, piece_id: ctx.piece.id,
      from_bar: num('from'), to_bar: num('to') ?? num('from'), target_bpm: num('bpm'),
      strictness: ctx.strictness, due: v('due') || null, note: v('note') || null, from: v('from_name') || null,
    });
    dlg.querySelector('#al-qr').innerHTML = qrSvg(url, { size: 220, label: 'Assignment link QR code' });
    dlg.querySelector('#al-out').hidden = false;
  });
  dlg.querySelector('#al-share').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Piano practice', text: form.elements.title.value, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* dismissed */ }
  });
  dlg.querySelector('#al-copy').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(url); e.target.textContent = 'Copied'; } catch { prompt('Copy this link:', url); }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
