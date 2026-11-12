// Stats: the dashboard behind Today's three numbers. Count-up tiles, minutes per day
// split by what was practised, check scores over time, and this week's goal ring.
import { runMark, bestMark, markText, bandTone, BAND_NAME } from './marking.js';
import { allSessions, goalMinutes, FOCUSES } from './timer.js';
import { checkHistory, findPiece, allPieces } from './check.js';
import { cardStats, DECKS } from './flashcards.js';
import { dayKey } from './store.js';
import { ICONS } from './icons.js';
import { still } from './settings.js';

// One colour per focus, in this fixed order (checked for colour-blind separation).
export const FOCUS_COLOURS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)'];
const RANGES = { 7: 'Week', 30: 'Month', 90: '3 months' };
let range = 7;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

const fmtDay = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Minutes per bucket (a day, or a week for 3 months), split by focus. */
export function buckets(sessions, days, now = new Date()) {
  const size = days > 30 ? 7 : 1;
  const out = Array.from({ length: Math.ceil(days / size) }, (_, i) => {
    const end = new Date(now);
    end.setDate(end.getDate() - (Math.ceil(days / size) - 1 - i) * size);
    const start = new Date(end);
    start.setDate(start.getDate() - size + 1);
    return { start, end, keys: new Set(Array.from({ length: size }, (_, k) => { const d = new Date(start); d.setDate(d.getDate() + k); return dayKey(d); })), by: FOCUSES.map(() => 0) };
  });
  for (const s of sessions) {
    const b = out.find((x) => x.keys.has(s.day));
    if (b) b.by[Math.max(0, FOCUSES.indexOf(s.focus))] += s.ms / 60000;
  }
  return out.map(({ start, end, by }) => ({ start, end, by, total: by.reduce((a, m) => a + m, 0) }));
}

function tile(value, label, unit = '') {
  const b = typeof value === 'number' ? `<b data-count="${value}">${still() ? value : 0}</b>` : `<b>${value}</b>`;
  return `<div class="stat-tile">${b}${unit}<span>${label}</span></div>`;
}

function barsChart(data) {
  const max = Math.max(1, ...data.map((b) => b.total));
  const weekly = range > 30;
  const labelEvery = data.length > 14 ? Math.ceil(data.length / 6) : 1;
  return `
    <div class="sbars" style="--n:${data.length}" role="img" aria-label="Minutes practised per ${weekly ? 'week' : 'day'}, ${data.map((b) => `${fmtDay(b.end)} ${Math.round(b.total)}`).join(', ')}">
      ${data.map((b, i) => `
        <div class="scol${i === data.length - 1 ? ' now' : ''}">
          <div class="bar" style="height:${(b.total / max) * 100}%;--i:${i}">${b.by.map((m, f) => (m > 0 ? `<i style="flex:${m};background:${FOCUS_COLOURS[f]}"></i>` : '')).join('')}</div>
          <span>${i % labelEvery === 0 || i === data.length - 1 ? (weekly ? fmtDay(b.start) : range === 7 ? b.end.toLocaleDateString(undefined, { weekday: 'narrow' }) : b.end.getDate()) : ''}</span>
          <span class="tip" aria-hidden="true">${weekly ? `Week of ${fmtDay(b.start)}` : fmtDay(b.end)}: ${Math.round(b.total)} min</span>
        </div>`).join('')}
    </div>`;
}

function splitBar(totals) {
  const sum = totals.reduce((a, m) => a + m, 0);
  if (!sum) return '';
  return `
    <div class="split" aria-hidden="true">${totals.map((m, f) => (m ? `<i style="flex:${m};background:${FOCUS_COLOURS[f]}"></i>` : '')).join('')}</div>
    <ul class="legend">${totals.map((m, f) => (m ? `<li><i style="background:${FOCUS_COLOURS[f]}"></i>${FOCUSES[f]}<b>${Math.round(m)} min</b><span class="muted">${Math.round((m / sum) * 100)}%</span></li>` : '')).join('')}</ul>`;
}

function scoreLine(checks) {
  if (checks.length < 2) return '<p class="empty">Play two or more pieces through in Perform to see your marks over time.</p>';
  const pts = checks.slice(-30).map((c) => runMark(c));
  const of = pts[pts.length - 1].of;
  const merit = of === 30 ? 24 : of === 25 ? 19 : 17; // lowest Merit mark for the board
  const x = (i) => (i / (pts.length - 1)) * 300;
  const y = (s) => 110 - (s / of) * 100;
  const line = pts.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y((c.mark / c.of) * of).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return `
    <div class="line-chart">
      <svg viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label="Your last ${pts.length} marks out of ${of}, oldest first: ${pts.map((c) => c.mark).join(', ')}">
        <defs><linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        <line class="grid" x1="0" x2="300" y1="${y(merit)}" y2="${y(merit)}" vector-effect="non-scaling-stroke"/>
        <path class="area" d="${line} L300 120 L0 120 Z" fill="url(#score-fill)"/>
        <path class="stroke" d="${line}" pathLength="1" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="ref" style="top:${(y(merit) / 120) * 100}%">${merit}, Merit</span>
      <span class="last" style="top:${(y(last.mark) / 120) * 100}%">${last.mark}</span>
    </div>`;
}

function goalRing(minutes, goal) {
  const pct = Math.min(1, minutes / goal);
  return `
    <div class="ring-card">
      <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset="1" stop-color="#ff7a59"/></linearGradient></defs>
        <circle class="track" cx="50" cy="50" r="42"/>
        <circle class="fill" cx="50" cy="50" r="42" pathLength="1" stroke="url(#ring-g)" style="stroke-dashoffset:${1 - pct}"/>
      </svg>
      <div><b class="ring-num"><span data-count="${Math.round(pct * 100)}">${still() ? Math.round(pct * 100) : 0}</span>%</b><p class="muted small">of this week's goal: ${Math.round(minutes)} of ${goal} minutes</p></div>
    </div>`;
}

export function renderStats(root, { back, report }) {
  const sessions = allSessions();
  const days = range;
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const fromKey = dayKey(from);
  const inRange = sessions.filter((s) => s.day >= fromKey);
  const minutes = inRange.reduce((a, s) => a + s.ms, 0) / 60000;
  const practised = new Set(inRange.map((s) => s.day)).size;
  const checks = checkHistory().filter((c) => c.at >= from.setHours(0, 0, 0, 0));
  const marks = checks.map((c) => runMark(c)).filter(Boolean);
  const avg = marks.length ? Math.round(marks.reduce((a, m) => a + m.mark, 0) / marks.length) : 0;
  const mastered = Object.keys(DECKS).reduce((a, k) => a + cardStats(k).mastered, 0);
  const totals = FOCUSES.map((f, i) => inRange.filter((s) => Math.max(0, FOCUSES.indexOf(s.focus)) === i).reduce((a, s) => a + s.ms / 60000, 0));
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekMins = sessions.filter((s) => s.day >= dayKey(monday)).reduce((a, s) => a + s.ms, 0) / 60000;
  const history = checkHistory();
  const pieces = allPieces();

  root.innerHTML = `
    <div class="stats-head">
      <button class="btn ghost small-btn" type="button" id="stats-back">${ICONS.arrow} Today</button>
      <h2>Your stats</h2>
      <div class="segmented" role="group" aria-label="Time range">${Object.entries(RANGES).map(([d, l]) => `<button type="button" data-range="${d}" aria-pressed="${Number(d) === range}">${l}</button>`).join('')}</div>
    </div>
    <section class="stat-tiles" aria-label="Totals for this ${RANGES[range].toLowerCase()}">
      ${tile(Math.round(minutes), 'minutes practised')}
      ${tile(practised, `day${practised === 1 ? '' : 's'} practised`)}
      ${tile(marks.length ? avg : '–', marks.length ? `average mark out of ${marks[0].of}, ${marks.length} play-through${marks.length === 1 ? '' : 's'}` : 'average mark (none yet)')}
      ${tile(mastered, 'flashcards learned')}
    </section>
    <section class="card">
      <div class="chart-head"><div><h3>Practice</h3><span class="muted small">Minutes per ${range > 30 ? 'week' : 'day'}, by what you practised</span></div></div>
      ${minutes ? barsChart(buckets(inRange, days)) + splitBar(totals) : '<p class="empty">No practice in this time yet. Start the timer in Practise and it shows up here.</p>'}
    </section>
    <div class="stats-pair">
      <section class="card">
        <h3>Your marks</h3>
        ${scoreLine(history)}
      </section>
      <section class="card">
        <h3>This week</h3>
        ${goalRing(weekMins, goalMinutes() * 7)}
      </section>
    </div>
    ${pieces.length ? `<section class="card">
      <h3>Pieces</h3>
      <ul class="log">${pieces.map((x) => {
        const runs = history.filter((h) => h.pieceId === x.id);
        const best = bestMark(runs);
        return `<li><span>${esc(x.title)}<small class="muted"> · played ${runs.length} time${runs.length === 1 ? '' : 's'}</small></span><b>${best ? `best ${markText(best)} ${BAND_NAME[best.band]}` : '–'}</b></li>`;
      }).join('')}</ul>
    </section>` : ''}
    ${history.length ? `<section class="card"><h3>Recent play-throughs</h3><ul class="log recent">${history.slice(-5).reverse().map((h) => `<li><span class="who"><span class="mini-badge ${bandTone(runMark(h).band)}">${markText(runMark(h))}</span><span>${esc(findPiece(h.pieceId)?.title ?? 'A removed piece')}</span></span><small class="muted">${ago(h.at)}</small></li>`).join('')}</ul></section>` : ''}
    <button class="btn block" id="stats-report" type="button">${ICONS.trophy} This week's report card</button>`;

  root.querySelector('#stats-back').addEventListener('click', back);
  root.querySelector('#stats-report').addEventListener('click', report);
  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    range = Number(b.dataset.range);
    renderStats(root, { back, report });
    root.querySelector(`[data-range="${range}"]`)?.focus();
  }));
  countUp(root);
}

/** Numbers roll up from zero, fast then settling. */
export function countUp(root) {
  const els = root.querySelectorAll('[data-count]');
  if (still()) return els.forEach((el) => (el.textContent = el.dataset.count));
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 900);
    const e = 1 - (1 - k) ** 3;
    els.forEach((el) => (el.textContent = Math.round(Number(el.dataset.count) * e)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
