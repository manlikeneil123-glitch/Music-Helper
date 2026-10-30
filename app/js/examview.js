// The Exam page: countdown, the three pieces and how ready they are, the other parts
// of the exam, this week's targets, and a mock exam in the order the day runs.
import { BOARDS, GRADES, RATINGS, gradeNumber, pieceReadiness, daysUntil, phaseFor, weekTargets, mockSteps, bandLabel } from './exam.js';
import { checkHistory, allPieces, performPiece } from './check.js';
import { renderScore } from './render.js';
import { load, save, dayKey } from './store.js';
import { profile } from './welcome.js';
import { ICONS } from './icons.js';

let root;
let goTo = () => {};
let editing = false;
let prep = null; // sight-reading preparation countdown

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const examPlan = () => load('exam', null);

function defaults() {
  const p = profile();
  const board = p?.board === 'Trinity' ? 'Trinity' : 'ABRSM';
  const grade = /Grade (\d)/.exec(p?.level ?? '')?.[1] ?? '1';
  return { board, grade, date: '', pieces: [{ title: '', pieceId: '' }, { title: '', pieceId: '' }, { title: '', pieceId: '' }], ratings: {}, choices: {} };
}

/** The exam with each piece's readiness worked out from its runs. */
export function examWithReadiness(exam = examPlan(), history = checkHistory()) {
  if (!exam) return null;
  return {
    ...exam,
    pieces: exam.pieces.map((p) => ({ ...p, readiness: p.pieceId ? pieceReadiness(history.filter((h) => h.pieceId === p.pieceId), exam.board) : null })),
  };
}

function setupForm(e) {
  return `
    <form class="card" id="exam-setup" novalidate>
      <h3>${e.date ? 'Edit your exam' : 'Set up your exam'}</h3>
      <div class="row gap wrap">
        <label class="field">Board <select id="ex-board">${Object.keys(BOARDS).map((b) => `<option ${b === e.board ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
        <label class="field">Grade <select id="ex-grade">${GRADES.map((g) => `<option value="${g}" ${g === e.grade ? 'selected' : ''}>${g === 'Initial' ? 'Initial' : `Grade ${g}`}</option>`).join('')}</select></label>
      </div>
      <label class="field">Exam date (a rough date is fine) <input id="ex-date" type="date" value="${e.date}" min="${dayKey()}"></label>
      <button class="btn primary block" type="submit">Save</button>
      ${e.date ? '<button class="btn ghost link" type="button" id="ex-cancel">Cancel</button>' : ''}
      <p class="fine">The app follows the published ${'ABRSM and Trinity'} structure. It isn't connected to either board.</p>
    </form>`;
}

function readinessChip(r) {
  if (!r) return '<span class="band none">Not in the app</span>';
  if (!r.band) return `<span class="band none" title="${esc(r.note)}">${r.runs ? '1 run' : 'No runs yet'}</span>`;
  return `<span class="band ${r.band}" title="Pitch & Time from your last ${r.runs} full runs: around ${r.range} of ${r.of}. Weakest: ${r.weakest}.">${r.label}</span>`;
}

function piecesCard(e) {
  const spec = BOARDS[e.board].piece;
  const options = allPieces().filter((p) => p.id !== 'c-scale');
  return `
    <section class="card">
      <div class="row between"><h3>Your pieces</h3><span class="muted small">${spec.count} × ${spec.marks} marks</span></div>
      <ul class="exam-pieces">${e.pieces.map((p, i) => `
        <li>
          <div class="row between"><b class="small">${spec.labels[i]}</b>${readinessChip(p.readiness)}</div>
          <input type="text" data-title="${i}" value="${esc(p.title)}" placeholder="Piece title" maxlength="80" aria-label="${spec.labels[i]} title">
          <select data-link="${i}" aria-label="Score for ${spec.labels[i]}">
            <option value="">Score not in the app yet</option>
            ${options.map((o) => `<option value="${o.id}" ${o.id === p.pieceId ? 'selected' : ''}>Check with: ${esc(o.title)}</option>`).join('')}
          </select>
          ${p.readiness?.band ? `<p class="muted small">Pitch & Time around <b>${p.readiness.range}</b> of ${p.readiness.of}. Weakest: ${p.readiness.weakest}.</p>` : ''}
        </li>`).join('')}
      </ul>
      <p class="muted small">Readiness bands use your last 3 full runs in Perform and measure <b>pitch and time only</b> (right notes, rhythm, tempo, keeping going, pulse). Tone, shape and performance aren't measured, so this isn't a mark. Import a score in Perform to link it here.</p>
    </section>`;
}

function partsCard(e) {
  const parts = BOARDS[e.board].parts(gradeNumber(e.grade));
  return `
    <section class="card">
      <h3>The rest of the exam</h3>
      <p class="muted small">The app can't check these yet, so rate them yourself (or with your teacher).</p>
      ${parts.map((part) => `
        <div class="exam-part">
          <div class="row between wrap"><b class="small">${part.choose ? `<select data-choice="${part.id}" aria-label="${part.label}">${part.choose.map((c) => `<option ${c === (e.choices?.[part.id] ?? part.choose[0]) ? 'selected' : ''}>${c}</option>`).join('')}</select>` : part.label}</b><span class="muted small">${part.marks} marks</span></div>
          <div class="segmented mini rating" role="group" aria-label="How ready: ${part.label}">${RATINGS.map((r, k) => `<button type="button" data-rate="${part.id}" data-v="${k}" aria-pressed="${(e.ratings?.[part.id] ?? 0) === k}">${r}</button>`).join('')}</div>
        </div>`).join('')}
    </section>`;
}

function mockCard(e) {
  const mock = load('mockRun', null);
  const past = load('mocks', []).slice(-3).reverse();
  const steps = mockSteps(e);
  if (mock) {
    const i = mock.results.length;
    const step = steps[i];
    return `
      <section class="card mock" id="mock">
        <div class="row between"><h3>Mock exam</h3><span class="pill">${i + 1} of ${steps.length}</span></div>
        <ol class="mock-steps">${steps.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${esc(s.title)}${k < i ? ` <small class="muted">${esc(mock.results[k].summary)}</small>` : ''}</li>`).join('')}</ol>
        ${step ? stepPanel(step, e) : ''}
        <button class="btn ghost link" type="button" id="mock-quit">Stop the mock exam</button>
      </section>`;
  }
  return `
    <section class="card mock" id="mock">
      <h3>Mock exam</h3>
      <p class="muted small">Everything in the order of the real exam: your pieces in Exam conditions (one take, no metronome, no stopping), then ${steps.slice(e.pieces.length).map((s) => s.title.toLowerCase()).join(', ')}. About ${10 + e.pieces.length * 3} minutes.</p>
      <button class="btn primary block" type="button" id="mock-start">${ICONS.play} Start mock exam</button>
      ${past.length ? `<h4>Past mocks</h4><ul class="log">${past.map((m) => `<li><span>${new Date(m.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span class="muted small">${m.results.map((r) => esc(r.summary)).join(' · ')}</span></li>`).join('')}</ul>` : ''}
    </section>`;
}

function stepPanel(step, e) {
  if (step.kind === 'piece') {
    return step.pieceId
      ? `<p>Play <b>${esc(step.title)}</b> once, all the way through. Don't stop for slips.</p><button class="btn accent block" type="button" id="mock-go">${ICONS.play} Play it</button>`
      : `<p><b>${esc(step.title)}</b> isn't linked to a score, so the app can't check it. Play it to yourself as if the examiner were listening, then say how it went.</p>${rateButtons()}`;
  }
  if (step.kind === 'sight') {
    if (prep) return `<p>Look at it: <b id="prep-left">${prep.left}</b> seconds left. Then it starts.</p><div class="score-scroll paper" id="prep-score"></div>`;
    return `<p>Sight-reading: you get 30 seconds to look at a piece you haven't practised much, then play it through once.</p><button class="btn accent block" type="button" id="mock-go">Show me the piece</button>`;
  }
  if (step.kind === 'scales') {
    return `<p>${esc(step.title)}: play your scales and arpeggios from memory, as the examiner would ask. The app checks C major for evenness; then rate the rest.</p>
      <button class="btn accent block" type="button" id="mock-go">${ICONS.play} Play C major</button>${rateButtons()}`;
  }
  return `<p><b>${esc(step.title)}</b>: the app can't test this yet. Do it with your teacher or a practice app, then say how it went.</p>${rateButtons()}`;
}

const rateButtons = () => `<div class="segmented mini rating" role="group" aria-label="How did it go?">${RATINGS.slice(1).map((r, k) => `<button type="button" data-mock-rate="${k + 1}">${r === 'Secure' ? 'Went well' : r === 'Nearly there' ? 'OK' : 'Struggled'}</button>`).join('')}</div>`;

function render() {
  if (!root) return;
  const raw = examPlan();
  const e = examWithReadiness(raw);
  if (!raw || editing) {
    root.innerHTML = `<h2>Exam</h2><p class="lede">Plan backwards from your exam date and see how ready each part is.</p>${setupForm(raw ?? defaults())}`;
    return wireSetup(raw ?? defaults());
  }
  const days = daysUntil(e.date);
  const phase = phaseFor(days);
  const targets = weekTargets(e);
  root.innerHTML = `
    <h2>Exam</h2>
    <section class="card exam-head">
      <div>
        <span class="muted small">${e.board} ${e.grade === 'Initial' ? 'Initial' : `Grade ${e.grade}`} · ${new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })}</span>
        <div class="countdown"><b>${days < 0 ? '✓' : days}</b><span>${days < 0 ? 'done' : days === 1 ? 'day to go' : 'days to go'}</span></div>
      </div>
      <div class="phase"><span class="pill">${phase.title}</span><p class="small">${phase.text}</p></div>
      <button class="btn small-btn" type="button" id="ex-edit">Edit</button>
    </section>
    ${targets.length ? `<section class="card"><h3>This week</h3><ul class="targets">${targets.map((t) => `<li><b>${esc(t.part)}</b><span>${esc(t.text)}</span></li>`).join('')}</ul></section>` : ''}
    ${piecesCard(e)}
    ${partsCard(e)}
    ${mockCard(e)}`;
  wire(e);
}

function wireSetup(e) {
  root.querySelector('#ex-cancel')?.addEventListener('click', () => { editing = false; render(); });
  root.querySelector('#exam-setup').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const date = root.querySelector('#ex-date').value;
    if (!date) return alert('Pick a date, even a rough one: the plan counts back from it.');
    save('exam', { ...e, board: root.querySelector('#ex-board').value, grade: root.querySelector('#ex-grade').value, date });
    editing = false;
    render();
    changed();
  });
}

const listeners = new Set();
export const onExamChange = (fn) => listeners.add(fn);
const changed = () => listeners.forEach((fn) => fn());

function update(fn) {
  const e = examPlan();
  fn(e);
  save('exam', e);
  changed();
}

function wire(e) {
  root.querySelector('#ex-edit').addEventListener('click', () => { editing = true; render(); });
  root.querySelectorAll('[data-title]').forEach((inp) => inp.addEventListener('change', () => update((x) => { x.pieces[inp.dataset.title].title = inp.value.trim(); })));
  root.querySelectorAll('[data-link]').forEach((sel) => sel.addEventListener('change', () => {
    update((x) => {
      const p = x.pieces[sel.dataset.link];
      p.pieceId = sel.value;
      if (sel.value && !p.title) p.title = allPieces().find((o) => o.id === sel.value)?.title ?? '';
    });
    render();
  }));
  root.querySelectorAll('[data-choice]').forEach((sel) => sel.addEventListener('change', () => { update((x) => { (x.choices ??= {})[sel.dataset.choice] = sel.value; }); render(); }));
  root.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => { update((x) => { (x.ratings ??= {})[b.dataset.rate] = Number(b.dataset.v); }); render(); }));
  root.querySelector('#mock-start')?.addEventListener('click', () => { save('mockRun', { at: Date.now(), results: [] }); render(); });
  root.querySelector('#mock-quit')?.addEventListener('click', () => { if (confirm('Stop this mock exam? Results so far are discarded.')) { save('mockRun', null); prep = null; render(); } });
  root.querySelectorAll('[data-mock-rate]').forEach((b) => b.addEventListener('click', () => record({ rating: Number(b.dataset.mockRate), summary: RATINGS[Number(b.dataset.mockRate)] })));
  root.querySelector('#mock-go')?.addEventListener('click', () => runStep(e));
}

function currentStep(e) {
  const mock = load('mockRun', null);
  return mock ? mockSteps(e)[mock.results.length] : null;
}

function runStep(e) {
  const step = currentStep(e);
  if (!step) return;
  if (step.kind === 'piece') {
    goTo('play');
    const piece = allPieces().find((p) => p.id === step.pieceId);
    performPiece(step.pieceId, { exam: true, bpm: piece?.targetBpm, onDone: (r, entry) => pieceDone(e, r, entry) });
  } else if (step.kind === 'scales') {
    goTo('play');
    performPiece('c-scale', { exam: true, onDone: (r) => { goTo('exam'); setTimeout(() => alert(`C major: ${r.score}/100, pulse ${r.pulse?.score ?? '–'}. Now rate your scales overall.`), 400); } });
  } else if (step.kind === 'sight') {
    startPrep(e);
  }
}

function pieceDone(e, r, entry) {
  const band = entry ? pieceReadiness([entry], e.board, Date.now(), 1) : null;
  const slow = entry?.targetBpm && entry.playedBpm < entry.targetBpm * 0.95 ? `, ${entry.playedBpm} of ${entry.targetBpm} bpm` : '';
  record({ score: r.score, band: band?.band ?? null, summary: band?.band ? `${bandLabel(band.band)} (${r.score}${slow})` : `${r.score}/100${slow}` });
  goTo('exam');
}

// Sight-reading: the least-practised piece that isn't one of the exam pieces.
function sightPiece(e) {
  const runs = (id) => checkHistory().filter((h) => h.pieceId === id).length;
  const skip = new Set(['c-scale', ...e.pieces.map((p) => p.pieceId)]);
  return allPieces().filter((p) => !skip.has(p.id)).sort((a, b) => runs(a.id) - runs(b.id))[0];
}

function startPrep(e) {
  const piece = sightPiece(e);
  if (!piece) return record({ summary: 'skipped (no piece)' });
  prep = { left: 30, piece };
  render();
  const box = root.querySelector('#prep-score');
  const view = renderScore(piece, { mode: 'page', width: box.clientWidth || 340 });
  box.replaceChildren(...view.systems.map((s) => s.svg));
  prep.timer = setInterval(() => {
    prep.left--;
    const left = root.querySelector('#prep-left');
    if (left) left.textContent = prep.left;
    if (prep.left > 0) return;
    clearInterval(prep.timer);
    const p = prep.piece;
    prep = null;
    goTo('play');
    performPiece(p.id, { exam: true, bpm: Math.max(40, Math.round((p.targetBpm * 0.75) / 2) * 2), onDone: (r) => { record({ score: r.score, summary: `Sight-reading ${r.score}/100` }); goTo('exam'); } });
  }, 1000);
}

function record(result) {
  const e = examWithReadiness();
  const mock = load('mockRun', null);
  if (!mock) return;
  mock.results.push(result);
  if (mock.results.length >= mockSteps(e).length) {
    save('mocks', [...load('mocks', []), { at: mock.at, board: e.board, grade: e.grade, results: mock.results }].slice(-10));
    save('mockRun', null);
    setTimeout(() => alert('Mock exam finished. Your results are under "Past mocks". The weakest part is where this week\'s practice should go.'), 300);
  } else {
    save('mockRun', mock);
  }
  render();
  changed();
}

export function renderExam() {
  render();
}

export function mountExam(el, { show }) {
  root = el;
  goTo = show;
}
