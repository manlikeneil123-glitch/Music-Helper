// Teaching tools on the Account page. Teachers: set work (for one student or the
// whole studio), share scores, hear takes students sent and comment on them, see the
// week's weakest bars. Students: their recordings with the teacher's comments, and a
// read-only link for a parent.
import { rest, rpc } from './cloud.js';
import { PIECES } from './pieces.js';
import { unzipMxl, parseMusicXML } from './musicxml.js';
import { audio, scheduleNote } from './audio.js';
import { ICONS } from './icons.js';
import { assignmentLink, hasParentLink, makeParentLink, revokeParentLink, myRecordings, parentUrl } from './teach.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const STRICT = { gentle: 'Gentle', standard: 'Standard', exam: 'Exam' };
const dateLabel = (d) => (d ? new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '');
const ago = (t) => {
  const d = Math.round((Date.now() - new Date(t).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

// ---- Teacher ------------------------------------------------------------------------------
export async function loadTeacherExtras() {
  const [assignments, recordings, scores] = await Promise.all([
    rest('assignments?select=*&order=created_at.desc&limit=200'),
    rest('recordings?select=id,student_id,title,kind,mime,seconds,score,teacher_note,created_at&order=created_at.desc&limit=100'),
    rest('shared_scores?select=id,title,created_at&order=created_at.desc'),
  ]);
  return { assignments: assignments ?? [], recordings: recordings ?? [], scores: scores ?? [] };
}

export function assignmentText(a) {
  const piece = PIECES.find((p) => p.id === a.piece_id)?.title;
  return [
    a.from_bar ? `bar${a.to_bar && a.to_bar !== a.from_bar ? `s ${a.from_bar}–${a.to_bar}` : ` ${a.from_bar}`}` : null,
    a.target_bpm ? `${a.target_bpm} bpm` : null,
    a.strictness ? STRICT[a.strictness] : null,
    a.due ? `due ${dateLabel(a.due)}` : null,
    piece && piece !== a.title ? piece : null,
  ].filter(Boolean).join(' · ');
}

function pieceOptions(scores) {
  // Work is set on scores the teacher has shared (there's no built-in library).
  return scores.length ? scores.map((s) => `<option value="teacher:${s.id}">${esc(s.title)}</option>`).join('') : '<option value="" disabled selected>Share a score first (below)</option>';
}

function workForm(id, scores) {
  return `
    <details class="set-work">
      <summary class="btn small-btn">${ICONS.arrow} Set work</summary>
      <form data-work="${id}" novalidate>
        <label class="field">What <input name="title" type="text" maxlength="120" placeholder="e.g. Minuet: hands together, bars 5–8"></label>
        <label class="field">Piece <select name="piece">${pieceOptions(scores)}</select></label>
        <div class="row gap wrap">
          <label class="field inline">Bars <input name="from" type="number" min="1" inputmode="numeric"> to <input name="to" type="number" min="1" inputmode="numeric"></label>
          <label class="field inline">Tempo <input name="bpm" type="number" min="20" max="300" inputmode="numeric"> bpm</label>
        </div>
        <div class="row gap wrap">
          <label class="field inline">Checking <select name="strict"><option value="">Student's choice</option>${Object.entries(STRICT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field inline">Due <input name="due" type="date"></label>
        </div>
        <label class="field">Note <input name="note" type="text" maxlength="500" placeholder="Optional: what to listen for"></label>
        <button class="btn accent" type="submit">Set it</button>
      </form>
    </details>`;
}

function workList(list, done = []) {
  if (!list.length) return '<p class="empty">No work set yet.</p>';
  return `<ul class="log work">${list.map((a) => `
    <li><span><b>${done.includes(a.id) ? '✓ ' : ''}${esc(a.title)}</b><small class="muted"> ${esc(assignmentText(a))}${a.student_id ? '' : ' · everyone'}</small>${a.note ? `<br><small class="muted">“${esc(a.note)}”</small>` : ''}</span>
      <button class="btn small-btn" type="button" data-unassign="${a.id}" aria-label="Delete ${esc(a.title)}">✕</button></li>`).join('')}</ul>`;
}

function recordingList(list, teacher) {
  if (!list.length) return `<p class="empty">${teacher ? 'No takes sent this month.' : 'Nothing sent yet. After a check in Perform, press "Send this take to your teacher".'}</p>`;
  return `<ul class="log recordings">${list.map((r) => `
    <li class="rec">
      <div class="row between"><span><b>${esc(r.title)}</b><small class="muted"> · ${ago(r.created_at)}${r.seconds ? ` · ${Math.round(r.seconds)} s` : ''}${r.kind === 'notes' ? ' · keyboard' : ''}</small></span>
        <span class="row gap"><button class="btn small-btn" type="button" data-play="${r.id}" data-kind="${r.kind}">${ICONS.play} Play</button><button class="btn small-btn" type="button" data-unrec="${r.id}" aria-label="Delete this take">✕</button></span></div>
      ${teacher
        ? `<form class="row gap" data-comment="${r.id}"><input type="text" maxlength="1000" value="${esc(r.teacher_note ?? '')}" placeholder="Comment for the student" aria-label="Comment"><button class="btn small-btn" type="submit">Save</button></form>`
        : r.teacher_note ? `<p class="small teacher-note">${esc(r.teacher_note)}</p>` : '<p class="muted small">No comment yet.</p>'}
    </li>`).join('')}</ul>`;
}

/** Extra sections inside one student's details. */
export function studentTeaching(st, extras) {
  const s = st.summary ?? {};
  const work = extras.assignments.filter((a) => a.student_id === st.id || a.student_id == null);
  const recs = extras.recordings.filter((r) => r.student_id === st.id);
  return `
    ${s.weekBars?.length ? `<h4>Weakest bars this week</h4><ul class="log">${s.weekBars.map((p) => `<li><span>${esc(p.title)} <small class="muted">· ${p.runs} runs</small></span><b>${p.bars.map((b) => `bar ${b.bar}`).join(', ')}</b></li>`).join('')}</ul>` : ''}
    <h4>Work set</h4>
    ${workList(work, s.done ?? [])}
    ${workForm(st.id, extras.scores)}
    <h4>Takes sent to you</h4>
    ${recordingList(recs, true)}`;
}

/** Studio-wide cards: shared scores, work for everyone, assignment links. */
export function studioTeaching(extras) {
  return `
    <section class="card">
      <h3>Shared scores</h3>
      <p class="muted small">MusicXML or .mxl files you're allowed to share (your own arrangements, public-domain editions). Only your students see them, in Perform.</p>
      ${extras.scores.length ? `<ul class="log">${extras.scores.map((s) => `<li><span>${esc(s.title)}</span><button class="btn small-btn" type="button" data-unshare="${s.id}" aria-label="Remove ${esc(s.title)}">✕</button></li>`).join('')}</ul>` : ''}
      <label class="btn small-btn" for="share-file">Share a score</label>
      <input id="share-file" type="file" accept=".musicxml,.xml,.mxl" hidden>
    </section>
    <section class="card">
      <h3>Work for everyone</h3>
      ${workList(extras.assignments.filter((a) => a.student_id == null))}
      ${workForm('all', extras.scores)}
    </section>`;
}

const formValue = (form) => {
  const v = (n) => form.elements[n].value.trim();
  const num = (n) => (v(n) ? Number(v(n)) : null);
  const piece = v('piece');
  const pieceTitle = form.elements.piece.selectedOptions[0]?.textContent ?? '';
  return {
    title: v('title') || pieceTitle,
    piece_id: piece,
    from_bar: num('from'),
    to_bar: num('to') ?? num('from'),
    target_bpm: num('bpm'),
    strictness: v('strict') || null,
    due: v('due') || null,
    note: v('note') || null,
  };
};

let playing = null;
async function play(id, kind) {
  const rows = await rest(`recordings?id=eq.${id}&select=data,mime,kind`);
  const r = rows?.[0];
  if (!r) throw new Error('That take has expired.');
  playing?.pause?.();
  if (r.kind === 'audio') {
    playing = new Audio(`data:${r.mime || 'audio/webm'};base64,${r.data}`);
    await playing.play();
  } else {
    const notes = JSON.parse(r.data);
    const ac = audio();
    const start = ac.currentTime + 0.2;
    for (const n of notes) scheduleNote(n.midi, start + n.on / 1000, Math.max(0.08, ((n.off ?? n.on + 400) - n.on) / 1000));
  }
}

export function wireTeacher(root, { act, refresh, studioId }) {
  root.querySelectorAll('[data-work]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = formValue(form);
    if (!a.title) return;
    act(async () => {
      await rest('assignments', { method: 'POST', body: { ...a, studio_id: studioId, student_id: form.dataset.work === 'all' ? null : form.dataset.work }, headers: { Prefer: 'return=minimal' } });
      await refresh();
    });
  }));
  root.querySelectorAll('[data-unassign]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Delete this piece of work?')) return;
    act(async () => { await rest(`assignments?id=eq.${b.dataset.unassign}`, { method: 'DELETE' }); await refresh(); });
  }));
  root.querySelectorAll('[data-unshare]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Stop sharing this score? Students lose it from their piece list.')) return;
    act(async () => { await rest(`shared_scores?id=eq.${b.dataset.unshare}`, { method: 'DELETE' }); await refresh(); });
  }));
  root.querySelector('#share-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    act(async () => {
      const xml = /\.mxl$/i.test(file.name) ? await unzipMxl(await file.arrayBuffer()) : await file.text();
      const parsed = parseMusicXML(xml, { id: 'check' }); // throws on files the app can't read
      if (!parsed.notes.length) throw new Error('No notes found in that file.');
      await rest('shared_scores', { method: 'POST', body: { studio_id: studioId, title: (parsed.title || file.name).slice(0, 120), musicxml: xml }, headers: { Prefer: 'return=minimal' } });
      await refresh();
    });
  });
  root.querySelectorAll('[data-comment]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    act(async () => { await rpc('comment_recording', { p_id: form.dataset.comment, p_note: form.querySelector('input').value }); await refresh(); });
  }));
  wirePlayback(root, { act, refresh });
}

function wirePlayback(root, { act, refresh }) {
  root.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => act(() => play(b.dataset.play, b.dataset.kind))));
  root.querySelectorAll('[data-unrec]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Delete this take now? It would be deleted after 20 days anyway.')) return;
    act(async () => { await rest(`recordings?id=eq.${b.dataset.unrec}`, { method: 'DELETE' }); await refresh(); });
  }));
}

// ---- Student --------------------------------------------------------------------------------
export async function loadStudentExtras() {
  const [recordings, parentLink] = await Promise.all([myRecordings().catch(() => []), hasParentLink().catch(() => false)]);
  return { recordings: recordings ?? [], parentLink };
}

export function studentCards(extras, inStudio) {
  return `
    ${inStudio ? `<section class="card"><h3>Takes you sent</h3><p class="muted small">Kept for 20 days, then deleted.</p>${recordingList(extras.recordings, false)}</section>` : ''}
    <section class="card">
      <h3>Share with a parent</h3>
      <p class="muted small">A private link to a weekly summary (practice, streak, recent checks, exam readiness). No account needed; you can turn it off any time.</p>
      <p class="small" id="parent-link-out" hidden></p>
      <div class="row gap wrap">
        <button class="btn small-btn" type="button" id="parent-make">${extras.parentLink ? 'Make a new link' : 'Make a link'}</button>
        ${extras.parentLink ? '<button class="btn small-btn bad" type="button" id="parent-revoke">Turn off the link</button>' : ''}
      </div>
    </section>`;
}

export function wireStudent(root, { act, refresh }) {
  wirePlayback(root, { act, refresh });
  root.querySelector('#parent-make')?.addEventListener('click', () => act(async () => {
    const url = await makeParentLink();
    await refresh();
    const out = root.querySelector('#parent-link-out');
    out.hidden = false;
    out.innerHTML = `<input type="text" readonly value="${esc(url)}" aria-label="Parent link"> <button class="btn small-btn" type="button" id="parent-copy">Share</button><br><small class="muted">Any older link stopped working.</small>`;
    out.querySelector('#parent-copy').addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: 'My piano practice', url });
        else { await navigator.clipboard.writeText(url); out.querySelector('#parent-copy').textContent = 'Copied'; }
      } catch { /* dismissed */ }
    });
  }));
  root.querySelector('#parent-revoke')?.addEventListener('click', () => {
    if (!confirm('Turn off the parent link? Anyone with it will stop seeing your progress.')) return;
    act(async () => { await revokeParentLink(); await refresh(); });
  });
}

export { assignmentLink, parentUrl };
