import { mountFlashcards, cardStats } from './flashcards.js';
import { mountTimer, onSessionsChange, minutesOn, goalMinutes, lastDays } from './timer.js';
import { mountCheck, onChecksChange, checkHistory, suggestedBpm, allPieces, troubleBars, practiseAssignment, setSendTake, setShareSection } from './check.js';
import { openAssignments, onTeachChange, teacherName, daysToLesson, refreshTeacherWork, restoreTeacherScores, acceptAssignmentLink, sendTake } from './teach.js';
import { openReportCard } from './reportcard.js';
import { openAssignDialog } from './assignlink.js';
import { buildPlan } from './plan.js';
import { mountExam, renderExam, examWithReadiness, onExamChange } from './examview.js';
import { daysUntil, phaseFor } from './exam.js';
import { qualityStreak, qualityWeek, qualityOn, onQualityChange, CARDS_TARGET } from './quality.js';
import { initMidi, renderKeyboard } from './input.js';
import { loadPiano } from './audio.js';
import { mountBackground, pulseBackground } from './background.js';
import { mountWelcome, profile } from './welcome.js';
import { ICONS } from './icons.js';
import { PIECES } from './pieces.js';
import { load, save, dayKey } from './store.js';
import { mountAccount, renderAccount, resumeAccount } from './account.js';
import { startSync, setPieceTitles } from './sync.js';
import { cloudReady, currentUser } from './cloud.js';

const TABS = ['welcome', 'today', 'cards', 'practice', 'play', 'exam', 'account'];
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
  if (tab === 'account') renderAccount();
  if (tab === 'exam') renderExam();
  if (tab === 'welcome') offerSignIn(view);
  stagger(view);
  view.classList.add('active');
  scrollTo(0, 0);
}

function show(tab) {
  if (!TABS.includes(tab)) tab = 'today';
  // Signing in on a new phone brings the setup with it, so Account is open to everyone.
  if (!profile() && tab !== 'account') tab = 'welcome';
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
  if (tab !== 'welcome' && tab !== 'account') save('tab', tab);
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
  const s = qualityStreak();
  const pill = document.getElementById('top-streak');
  pill.hidden = !p || s === 0;
  pill.innerHTML = `${ICONS.flame} ${s} day${s === 1 ? '' : 's'}`;
  pill.title = 'Quality streak: days with a clean run, a fixed bar or 20 notes read';
  const avatar = document.getElementById('top-avatar');
  avatar.hidden = !p;
  const user = currentUser();
  if (user) {
    avatar.textContent = (user.username ?? '?').slice(0, 2).toUpperCase();
    avatar.title = `@${user.username}: your account`;
  } else if (p) {
    const level = p.level ?? '';
    avatar.textContent = /Grade (\d)/.exec(level)?.[1] ? `G${/Grade (\d)/.exec(level)[1]}` : level === 'Just starting' ? 'New' : 'Me';
    avatar.title = `${level}${p.board && p.board !== 'Not doing exams' ? ` · ${p.board}` : ''}. Your account and setup.`;
  }
}

// The "teacher" layer: look at everything the student has done and decide
// what today's practice should be — the part a self-learner never gets.
function lessonPlan() {
  return buildPlan({
    profile: profile(), goal: goalMinutes(), history: checkHistory(), cards: cardStats(), pieces: allPieces(),
    bpmFor: suggestedBpm, trouble: troubleBars,
    assignments: openAssignments(), lessonIn: daysToLesson(profile()?.lessonDay), teacher: teacherName(),
  });
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
  const s = qualityStreak();
  const qWeek = qualityWeek();
  const qToday = qualityOn(dayKey());

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
        ${examChip()}
      </div>
      <button class="btn primary" id="today-timer" type="button">${ICONS.play} Start practice</button>
    </div>
    <div class="dash">
      <div class="stats4 span2">
        <div class="stat"><span class="chip gold">${ICONS.flame}</span><span class="label" title="A day counts when you get a clean run (85+), fix a bar in a drill, or read ${CARDS_TARGET} notes right">Quality streak</span><b>${s}<small> day${s === 1 ? '' : 's'}</small></b><span class="week-dots" aria-hidden="true">${qWeek.map((on, k) => `<i class="${on ? 'on' : ''}" style="--k:${k}"></i>`).join('')}</span><span class="delta">${qToday.clean || qToday.bars ? 'today counts ✓' : qToday.cards >= CARDS_TARGET ? 'today counts ✓' : `today: a clean run or ${Math.max(0, CARDS_TARGET - qToday.cards)} notes`}</span></div>
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
        ${plan.note ? `<p class="plan-note">${plan.note}</p>` : ''}
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
    <button class="btn" id="today-report" type="button">${ICONS.trophy} This week's report card</button>
    <button class="btn ghost link" id="today-setup" type="button">Change your setup</button>
    <p class="credit">Background photo: <a href="https://unsplash.com/photos/a-grand-piano-in-front-of-a-large-window-Iu2pgfqkK2g" target="_blank" rel="noopener">Oswald on Unsplash</a> · Piano sound: Salamander Grand Piano by Alexander Holm (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>)</p>`;

  root.querySelectorAll('.plan button').forEach((b) => b.addEventListener('click', () => {
    const item = plan[b.dataset.i];
    const deck = document.getElementById('card-deck');
    if (item.deck && deck && deck.value !== item.deck) {
      deck.value = item.deck;
      deck.dispatchEvent(new Event('change'));
    }
    if (item.assignment) {
      show('play');
      if (!practiseAssignment(item.assignment)) alert("That piece isn't on this device yet. Ask your teacher to share the score, or import it in Perform.");
      return;
    }
    if (item.piece) {
      const sel = document.getElementById('check-piece');
      sel.value = item.piece;
      sel.dispatchEvent(new Event('change'));
    }
    show(item.tab);
  }));
  root.querySelector('#today-setup').addEventListener('click', openSetup);
  root.querySelector('[data-go=exam]')?.addEventListener('click', () => show('exam'));
  root.querySelector('#today-report').addEventListener('click', openReportCard);
  root.querySelector('#today-timer').addEventListener('click', () => {
    show('practice');
    const btn = document.getElementById('timer-start');
    if (btn.textContent !== 'Pause') btn.click();
  });
}

// "ABRSM Grade 3 in 23 days · Polish": the exam leads the day once there is one.
function examChip() {
  const e = examWithReadiness();
  const days = e ? daysUntil(e.date) : null;
  if (days == null || days < 0) return p_noExam();
  const bands = e.pieces.filter((x) => x.readiness?.band).map((x) => x.readiness.band);
  return `<button class="exam-chip" type="button" data-go="exam">${ICONS.trophy}<span><b>${e.board} ${e.grade === 'Initial' ? 'Initial' : `Grade ${e.grade}`} in ${days} day${days === 1 ? '' : 's'}</b><small>${phaseFor(days).title}${bands.length ? ` · ${bands.filter((b) => b === 'below').length ? `${bands.filter((b) => b === 'below').length} piece${bands.filter((b) => b === 'below').length > 1 ? 's' : ''} below pass` : 'all pieces at pass or above'}` : ''}</small></span></button>`;
}
function p_noExam() {
  const p = profile();
  return p?.board && p.board !== 'Not doing exams' ? `<button class="exam-chip quiet" type="button" data-go="exam">${ICONS.trophy}<span><b>Got an exam date?</b><small>Plan backwards from it</small></span></button>` : '';
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

// A new phone for an existing student: sign in instead of setting up again.
function offerSignIn(view) {
  if (!cloudReady() || profile() || view.querySelector('#w-signin')) return;
  view.querySelector('#w-form')?.insertAdjacentHTML('afterend', '<button class="btn ghost link" id="w-signin" type="button">Already have an account? Sign in</button>');
  view.querySelector('#w-signin')?.addEventListener('click', () => show('account'));
}

function showWelcome() {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active', 'leaving'));
  const view = document.getElementById('view-welcome');
  document.body.dataset.tab = 'welcome';
  document.getElementById('keyboard').hidden = true;
  updateTopbar();
  offerSignIn(view);
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
onQualityChange(() => { refreshToday(); updateTopbar(); });
mountAccount(document.getElementById('view-account'), { openSetup });
mountExam(document.getElementById('view-exam'), { show });
onExamChange(refreshToday);
restoreTeacherScores();
setShareSection(openAssignDialog);
const canSend = () => setSendTake(currentUser() && teacherName() ? sendTake : null);
canSend();
onTeachChange(() => { refreshToday(); canSend(); });
setPieceTitles(() => Object.fromEntries(allPieces().map((x) => [x.id, x.title])));
startSync();
document.getElementById('top-avatar').addEventListener('click', () => show('account'));
addEventListener('mh:account', updateTopbar);

document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
// Opened an assignment link from a teacher (no account needed). If the app is
// already open, the browser only changes the #hash, so listen for that too.
function takeAssignmentLink() {
  const linked = acceptAssignmentLink(location.hash);
  if (!linked) return null;
  history.replaceState(null, '', location.pathname + location.search);
  setTimeout(() => alert(`New work${linked.from ? ` from ${linked.from}` : ''}: ${linked.title}. It's at the top of Today's plan.`), 600);
  return linked;
}
const linked = takeAssignmentLink();
show(linked && profile() ? 'today' : load('tab', 'today'));
addEventListener('hashchange', () => takeAssignmentLink() && profile() && show('today'));
resumeAccount().then((reloading) => {
  if (reloading) return;
  updateTopbar();
  refreshTeacherWork().catch(() => {});
});
// The load sequence: photo blurred → sharp (background.js), then chrome and panels.
const booted = new MutationObserver(() => {
  if (!document.body.classList.contains('booting')) { document.body.classList.add('booted'); stagger(document.querySelector('.view.active')); booted.disconnect(); }
});
booted.observe(document.body, { attributes: true, attributeFilter: ['class'] });
initMidi();
// Browsers only allow audio after a tap; fetch the piano samples on the first one.
addEventListener('pointerdown', () => loadPiano(), { once: true });
addEventListener('keydown', () => loadPiano(), { once: true });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
