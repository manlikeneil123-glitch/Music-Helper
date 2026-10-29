import { mountFlashcards, cardStats } from './flashcards.js';
import { mountTimer, onSessionsChange, minutesOn, goalMinutes, streak, lastDays } from './timer.js';
import { mountCheck, onChecksChange, checkHistory, suggestedBpm, allPieces } from './check.js';
import { initMidi, renderKeyboard } from './input.js';
import { mountBackground, pulseBackground } from './background.js';
import { mountWelcome, profile } from './welcome.js';
import { ICONS } from './icons.js';
import { PIECES } from './pieces.js';
import { load, save, dayKey } from './store.js';

const TABS = ['welcome', 'today', 'cards', 'practice', 'play'];
const WITH_KEYBOARD = new Set(['cards', 'play']);

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let switchToken = 0;

// Give each block of a view a stagger index, so it rises in reading order (the
// reel's "panels slide up from blur, one after another").
function stagger(view) {
  view.classList.remove('settled');
  let i = 0;
  const blocks = view.querySelectorAll(':scope > *:not(.dash):not(.stats4):not(.dash-bottom), .dash > *:not(.stats4):not(.dash-bottom), .stats4 > *, .dash-bottom > *');
  blocks.forEach((b) => { b.classList.add('rise'); b.style.setProperty('--i', i++); });
  view.querySelectorAll('.plan li').forEach((li, j) => li.style.setProperty('--j', j));
  view.querySelectorAll('.chart .bar').forEach((b, j) => b.style.setProperty('--i', j));
}

function activate(tab) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active', 'leaving'));
  const view = document.getElementById(`view-${tab}`);
  if (tab === 'today') renderToday();
  stagger(view);
  view.classList.add('active');
  scrollTo(0, 0);
}

function show(tab) {
  if (!TABS.includes(tab)) tab = 'today';
  if (!profile()) tab = 'welcome';
  const prev = document.querySelector('.view.active');
  document.querySelectorAll('.tabbar button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  document.body.dataset.tab = tab;
  const keyboard = document.getElementById('keyboard');
  const wasHidden = keyboard.hidden;
  keyboard.hidden = !WITH_KEYBOARD.has(tab);
  if (wasHidden && !keyboard.hidden) {
    const c4 = keyboard.querySelector('[data-midi="60"]');
    if (c4) keyboard.scrollLeft = c4.offsetLeft - 8;
  }
  if (tab !== 'welcome') save('tab', tab);
  updateTopbar();
  const token = ++switchToken;
  // The old page blurs out, the photo refocuses, then the new page rises in.
  if (prev && prev.id !== `view-${tab}` && !reducedMotion()) {
    prev.classList.add('leaving');
    pulseBackground();
    setTimeout(() => token === switchToken && activate(tab), 170);
  } else {
    activate(tab);
  }
}

function updateTopbar() {
  const p = profile();
  const s = streak();
  const pill = document.getElementById('top-streak');
  pill.hidden = !p || s === 0;
  pill.innerHTML = `${ICONS.flame} ${s} day${s === 1 ? '' : 's'}`;
  const avatar = document.getElementById('top-avatar');
  avatar.hidden = !p;
  if (p) {
    const level = p.level ?? '';
    avatar.textContent = /Grade (\d)/.exec(level)?.[1] ? `G${/Grade (\d)/.exec(level)[1]}` : level === 'Just starting' ? 'New' : 'Me';
    avatar.title = `${level}${p.board && p.board !== 'Not doing exams' ? ` · ${p.board}` : ''}. Change your setup.`;
  }
}

// The "teacher" layer: look at everything the student has done and decide
// what today's practice should be — the part a self-learner never gets.
function lessonPlan() {
  const history = checkHistory();
  const cards = cardStats();
  const plan = [];

  plan.push({ tab: 'play', piece: 'c-scale', mins: 5, title: 'Warm-up: C major scale', detail: `Right hand at ${suggestedBpm(PIECES[0])} bpm. Thumb tucks under on F.` });

  plan.push({
    tab: 'cards', mins: 5, title: 'Note reading',
    detail: cards.weak ? `${cards.weak} note${cards.weak === 1 ? '' : 's'} need${cards.weak === 1 ? 's' : ''} work — they'll come up more often.` : `${cards.mastered}/${cards.total} notes mastered. Keep the streak going.`,
  });

  const pieceStates = allPieces().slice(1).map((p) => {
    const runs = history.filter((h) => h.pieceId === p.id);
    const best = Math.max(0, ...runs.map((r) => r.score));
    return { p, runs, best, ready: runs.some((r) => r.ready), last: runs[runs.length - 1] };
  });
  const focus = pieceStates.find((s) => !s.ready) ?? pieceStates[0];
  plan.push({
    tab: 'play', piece: focus.p.id, mins: 10, title: `Piece: ${focus.p.title}`,
    detail: focus.last
      ? `${focus.last.worstBar ? `Fix bar ${focus.last.worstBar} first, then ` : ''}full run at ${suggestedBpm(focus.p)} bpm. Best so far: ${focus.best}.`
      : `New piece! Listen once, then play slowly at ${suggestedBpm(focus.p)} bpm.`,
  });
  return plan;
}

const SPARK_W = 64, SPARK_H = 26;
function spark(values, tone) {
  if (values.length < 2 || values.every((v) => v === values[0] && v === 0)) return '';
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * SPARK_W, SPARK_H - 3 - ((v - min) / span) * (SPARK_H - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `<svg class="spark ${tone}" viewBox="0 0 ${SPARK_W} ${SPARK_H}" aria-hidden="true"><path d="${d}" pathLength="1"/></svg>`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

const tone = (score) => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');

// Today = the dashboard. Every number here is the student's own data; nothing is
// padded out with sample figures.
function renderToday() {
  const root = document.getElementById('view-today');
  const goal = goalMinutes();
  const today = minutesOn(dayKey());
  const week = lastDays(7);
  const weekMins = week.reduce((a, d) => a + d.minutes, 0);
  const prevWeek = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return minutesOn(dayKey(d)); }).reduce((a, b) => a + b, 0);
  const cards = cardStats();
  const history = checkHistory();
  const plan = lessonPlan();
  const pieces = allPieces();
  const titleOf = (id) => pieces.find((x) => x.id === id)?.title ?? id;
  const lastScores = history.slice(-8).map((h) => h.score);
  const last = history[history.length - 1];
  const prevScore = history[history.length - 2]?.score;
  const s = streak();

  const p = profile();
  const max = Math.max(goal, ...week.map((d) => d.minutes), 1);
  const pct = (v) => Math.min(100, (v / max) * 100);
  const goalDone = Math.min(1, today / goal);
  const deltaChip = (cur, before, unit = '') => {
    if (before == null || (cur === 0 && before === 0)) return '';
    const d = Math.round(cur - before);
    return `<span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}${unit} vs last ${unit === ' min' ? 'week' : 'run'}</span>`;
  };

  root.innerHTML = `
    <div class="dash-head">
      <div>
        <h2>${greeting()}</h2>
        <p class="lede">${p?.teacher ? 'Your plan for between lessons.' : 'Your plan for today.'} <span class="muted">${p?.level ?? ''}${p?.board && p.board !== 'Not doing exams' ? ` · ${p.board}` : ''}</span></p>
      </div>
      <button class="btn primary" id="today-timer" type="button">${ICONS.play} Start practice</button>
    </div>
    <div class="dash">
      <div class="stats4 span2">
        <div class="stat"><span class="chip gold">${ICONS.flame}</span><span class="label">Day streak</span><b>${s}<small> day${s === 1 ? '' : 's'}</small></b><span class="week-dots" aria-hidden="true">${week.map((d, k) => `<i class="${d.minutes > 0 ? 'on' : ''}" style="--k:${k}"></i>`).join('')}</span></div>
        <div class="stat"><span class="chip blue">${ICONS.clock}</span><span class="label">This week</span><b>${Math.round(weekMins)}<small> min</small></b>${deltaChip(weekMins, prevWeek || null, ' min')}${spark(week.map((d) => d.minutes), 'blue')}</div>
        <div class="stat"><span class="chip green">${ICONS.trophy}</span><span class="label">Last check</span><b>${last ? last.score : '–'}${last ? '<small>/100</small>' : ''}</b>${last ? deltaChip(last.score, prevScore) : '<span class="delta">play a piece in Perform</span>'}${spark(lastScores, 'green')}</div>
        <div class="stat"><span class="chip violet">${ICONS.note}</span><span class="label">Notes known</span><b>${cards.mastered}<small>/${cards.total}</small></b>${cards.weak ? `<span class="delta down">${cards.weak} need work</span>` : ''}</div>
      </div>
      <section class="card">
        <div class="chart-head">
          <div><h3>Practice</h3><span class="muted small">Minutes per day, last 7 days</span></div>
          <span class="pill">${Math.round(weekMins)} min this week</span>
        </div>
        <div class="chart" role="img" aria-label="Practice minutes for the last 7 days: ${week.map((d) => `${d.label} ${Math.round(d.minutes)}`).join(', ')}">
          <div class="goal-line" style="bottom:${22 + pct(goal) * 1.3}px"><span>goal ${goal}′</span></div>
          ${week.map((d, i) => `<div class="col${i === 6 ? ' today' : ''}"><span class="val">${d.minutes >= 1 ? Math.round(d.minutes) : ''}</span><div class="bar" style="height:${Math.max(4, pct(d.minutes) * 1.3)}px"></div><span>${i === 6 ? 'Today' : d.label}</span></div>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="chart-head"><h3>Today · ${plan.reduce((a, x) => a + x.mins, 0)} min</h3></div>
        <ol class="plan">${plan.map((x, i) => `
          <li><button type="button" data-i="${i}">
            <span class="mins">${x.mins}′</span>
            <span><b>${x.title}</b><small>${x.detail}</small></span>
          </button></li>`).join('')}
        </ol>
      </section>
      <div class="dash-bottom span2">
        <section class="card">
          <h3>Recent checks</h3>
          ${history.length ? `<ul class="log recent">${history.slice(-4).reverse().map((h) => `
            <li><span class="who"><span class="mini-badge ${tone(h.score)}">${h.score}</span><span>${titleOf(h.pieceId)}${h.hands && h.hands !== 'both' ? ` <small class="muted">(${h.hands === 'rh' ? 'right hand' : 'left hand'})</small>` : ''}</span></span><small class="muted">${ago(h.at)}</small></li>`).join('')}</ul>`
            : '<p class="empty">No checks yet. Play a piece in Perform and your results show up here.</p>'}
        </section>
        <section class="card">
          <h3>Pieces</h3>
          <ul class="log">${pieces.map((x) => {
            const runs = history.filter((h) => h.pieceId === x.id);
            const best = runs.length ? Math.max(...runs.map((r) => r.score)) : null;
            const ready = runs.some((r) => r.ready);
            return `<li><span>${x.title}<small class="muted"> · ${runs.length} run${runs.length === 1 ? '' : 's'}</small></span><b>${best == null ? '–' : ready ? '✓ ready' : `best ${best}`}</b></li>`;
          }).join('')}</ul>
        </section>
        <section class="card ring-card">
          <div class="ring-wrap">
            <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
              <defs><linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ab4ff"/><stop offset="1" stop-color="#2f6fe6"/></linearGradient></defs>
              <circle class="track" cx="50" cy="50" r="42"/>
              <circle class="fill" cx="50" cy="50" r="42" pathLength="1" style="stroke-dashoffset:${(1 - goalDone).toFixed(3)}"/>
            </svg>
            <b>${Math.round(goalDone * 100)}%</b>
          </div>
          <div><h3>Daily goal</h3><p class="muted small" style="margin:0">${Math.floor(today)} of ${goal} minutes today.${goalDone >= 1 ? ' Done. Nice work.' : ''}</p></div>
        </section>
      </div>
    </div>
    <button class="btn ghost link" id="today-setup" type="button">Change your setup</button>
    <p class="credit">Background photo: <a href="https://unsplash.com/photos/a-grand-piano-in-front-of-a-large-window-Iu2pgfqkK2g" target="_blank" rel="noopener">Oswald on Unsplash</a></p>`;

  root.querySelectorAll('.plan button').forEach((b) => b.addEventListener('click', () => {
    const item = plan[b.dataset.i];
    if (item.piece) {
      const sel = document.getElementById('check-piece');
      sel.value = item.piece;
      sel.dispatchEvent(new Event('change'));
    }
    show(item.tab);
  }));
  root.querySelector('#today-setup').addEventListener('click', openSetup);
  root.querySelector('#today-timer').addEventListener('click', () => {
    show('practice');
    const btn = document.getElementById('timer-start');
    if (btn.textContent !== 'Pause') btn.click();
  });
}

function openSetup() {
  mountWelcome(document.getElementById('view-welcome'), finishWelcome);
  showWelcome();
}

// Data changed while Today is open: redraw in place without replaying the entrance.
function refreshToday() {
  if (document.body.dataset.tab !== 'today') return;
  const view = document.getElementById('view-today');
  renderToday();
  view.classList.add('settled');
  updateTopbar();
}

function showWelcome() {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active', 'leaving'));
  const view = document.getElementById('view-welcome');
  document.body.dataset.tab = 'welcome';
  document.getElementById('keyboard').hidden = true;
  updateTopbar();
  stagger(view);
  view.classList.add('active');
  scrollTo(0, 0);
}

function finishWelcome(p) {
  const goal = document.getElementById('timer-goal');
  if (goal) goal.value = p.goal;
  const strict = document.getElementById('check-strict');
  if (strict && p.strictness) {
    strict.value = p.strictness;
    strict.dispatchEvent(new Event('change'));
  }
  show('today');
}

document.querySelectorAll('.tabbar [data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
mountBackground();
mountWelcome(document.getElementById('view-welcome'), finishWelcome);
mountFlashcards(document.getElementById('view-cards'));
mountTimer(document.getElementById('view-practice'));
mountCheck(document.getElementById('view-play'));
renderKeyboard(document.getElementById('keyboard'), { from: 36, to: 96 });
onSessionsChange(refreshToday);
onChecksChange(refreshToday);
document.getElementById('top-avatar').addEventListener('click', openSetup);

document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
show(load('tab', 'today'));
// The load sequence: photo blurred → sharp (background.js), then chrome and panels.
const booted = new MutationObserver(() => {
  if (!document.body.classList.contains('booting')) { document.body.classList.add('booted'); stagger(document.querySelector('.view.active')); booted.disconnect(); }
});
booted.observe(document.body, { attributes: true, attributeFilter: ['class'] });
initMidi();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
