import { mountFlashcards, cardStats } from './flashcards.js';
import { mountTimer, onSessionsChange, minutesOn, goalMinutes, lastDays } from './timer.js';
import { mountCheck, onChecksChange, checkHistory, suggestedBpm, allPieces, findPiece, everyPiece, choosePiece, troubleBars, practiseAssignment, setSendTake, setShareSection, setOpenKit } from './check.js';
import { openAssignments, onTeachChange, teacherName, daysToLesson, refreshTeacherWork, restoreTeacherScores, acceptAssignmentLink, sendTake } from './teach.js';
import { openReportCard } from './reportcard.js';
import { renderStats, countUp } from './stats.js';
import { openAssignDialog } from './assignlink.js';
import { openKit } from './kit.js';
import { buildPlan } from './plan.js';
import { mountExam, renderExam, examWithReadiness, onExamChange } from './examview.js';
import { daysUntil, phaseFor, typeName, examTitle } from './exam.js';
import { qualityStreak, qualityWeek, qualityOn, onQualityChange, CARDS_TARGET } from './quality.js';
import { initMidi, renderKeyboard } from './input.js';
import { loadPiano } from './audio.js';
import { mountBackground, pulseBackground } from './background.js';
import { mountWelcome, profile, MARK } from './welcome.js';
import { ICONS } from './icons.js';
import { load, save, dayKey } from './store.js';
import { mountAccount, renderAccount, resumeAccount } from './account.js';
import { startSync, setPieceTitles } from './sync.js';
import { cloudReady, currentUser } from './cloud.js';
import { initSettings, still } from './settings.js';
import { tap } from './haptics.js';
import { newsLine, openWhatsNew } from './whatsnew.js';
import { mountOffline, installCard, wireInstall } from './pwa.js';
import { startTour } from './tour.js';
import { gettingStartedCard, wireGettingStarted } from './getstarted.js';
import { openMicSetup } from './micsetup.js';

const TABS = ['welcome', 'today', 'cards', 'practice', 'play', 'exam', 'account', 'stats'];
// The on-screen piano is for answering flashcards; Perform listens to a real piano.
const WITH_KEYBOARD = new Set(['cards']);

const reducedMotion = still;
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
  if (tab === 'stats') renderStats(view, { back: () => show('today'), report: openReportCard });
  if (tab === 'welcome') offerSignIn(view);
  stagger(view);
  view.classList.add('active');
  scrollTo(0, 0);
}

// The tab bar's highlight: a pill that stretches to the new tab (its leading edge gets
// there first, the trailing edge catches up) while the tab's icon rises in a bead.
let blobAt = null;
function moveBlob(tab, animate = true) {
  const bar = document.querySelector('.tabbar');
  const btn = bar?.querySelector(`[data-tab="${tab}"]`);
  let blob = bar?.querySelector('.tab-blob');
  if (!btn) { if (blob) blob.hidden = true; return; }
  if (!blob) { blob = document.createElement('i'); blob.className = 'tab-blob'; blob.setAttribute('aria-hidden', 'true'); bar.prepend(blob); }
  blob.hidden = false;
  const to = { left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight };
  Object.assign(blob.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  const from = blobAt;
  blobAt = to;
  if (!animate || !from || reducedMotion() || (from.left === to.left && from.top === to.top)) return;
  const px = (r) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const span = { left: Math.min(from.left, to.left), top: Math.min(from.top, to.top) };
  span.width = Math.max(from.left + from.width, to.left + to.width) - span.left;
  span.height = Math.max(from.top + from.height, to.top + to.height) - span.top;
  blob.animate([px(from), { ...px(span), offset: 0.45 }, px(to)], { duration: 520, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' });
}

addEventListener('resize', () => moveBlob(document.body.dataset.tab, false));

function show(tab) {
  if (!TABS.includes(tab)) tab = 'today';
  // Signing in on a new phone brings the setup with it, so Account is open to everyone.
  if (!profile() && tab !== 'account') tab = 'welcome';
  const prev = document.querySelector('.view.active');
  document.querySelectorAll('.tabbar button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  document.body.dataset.tab = tab;
  moveBlob(tab);
  const keyboard = document.getElementById('keyboard');
  const wasHidden = keyboard.hidden;
  keyboard.hidden = !WITH_KEYBOARD.has(tab);
  if (wasHidden && !keyboard.hidden) {
    const c4 = keyboard.querySelector('[data-midi="60"]');
    if (c4) keyboard.scrollLeft = c4.offsetLeft - 8;
  }
  if (!['welcome', 'account', 'stats'].includes(tab)) save('tab', tab);
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
    profile: profile(), goal: goalMinutes(), history: checkHistory(), cards: cardStats(), pieces: [findPiece('c-scale'), ...allPieces()],
    bpmFor: suggestedBpm, trouble: troubleBars,
    assignments: openAssignments(), lessonIn: daysToLesson(profile()?.lessonDay), teacher: teacherName(),
    examType: load('exam', null)?.type,
  });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}


// Today = the dashboard. Every number here is the student's own data; nothing is
// padded out with sample figures.
function renderToday() {
  const root = document.getElementById('view-today');
  const goal = goalMinutes();
  const today = minutesOn(dayKey());
  const week = lastDays(7);
  const weekMins = week.reduce((a, d) => a + d.minutes, 0);
  const prevWeek = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return minutesOn(dayKey(d)); }).reduce((a, b) => a + b, 0);
  const history = checkHistory();
  const plan = lessonPlan();
  const last = history[history.length - 1];
  const prevScore = history[history.length - 2]?.score;
  const s = qualityStreak();
  const qWeek = qualityWeek();
  const qToday = qualityOn(dayKey());

  const p = profile();
  const goalDone = Math.min(1, today / goal);
  const deltaChip = (cur, before, unit = '') => {
    if (before == null || (cur === 0 && before === 0)) return '';
    const d = Math.round(cur - before);
    return `<span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}${unit} vs last ${unit === ' min' ? 'week' : 'run'}</span>`;
  };

  root.innerHTML = `
    ${newsLine()}
    <div class="dash-head">
      <div>
        <h2>${greeting()}</h2>
        <p class="lede"><span class="muted">${p?.level ?? ''}${p?.board && p.board !== 'Not doing exams' ? ` · ${p.board}${p.examType === 'performance' ? ` ${typeName(p.board, 'performance')}` : ''}` : ''}</span></p>
        ${examChip()}
      </div>
      <button class="btn primary" id="today-timer" type="button">${ICONS.play} Start practice</button>
    </div>
    ${gettingStartedCard()}
    <section class="card today-plan">
      <div class="chart-head"><h3>Today's plan</h3><span class="pill">${Math.floor(today)} / ${goal} min</span></div>
      <div class="goal" aria-hidden="true"><div style="width:${Math.round(goalDone * 100)}%"></div></div>
      ${plan.note ? `<p class="plan-note">${plan.note}</p>` : ''}
      <ol class="plan">${plan.map((x, i) => `
        <li><button type="button" data-i="${i}">
          <span class="mins">${x.mins}′</span>
          <span><b>${x.title}</b><small>${x.detail}</small></span>
        </button></li>`).join('')}
      </ol>
    </section>
    <button class="card stat-strip" type="button" id="today-stats" aria-label="Your stats: ${s} day streak, ${Math.round(weekMins)} minutes this week, last check ${last ? last.score : 'none yet'}. Open the stats page">
      <span title="A day counts when you get a clean run (85+), fix a bar in a drill, or read ${CARDS_TARGET} notes right. One rest day a week won't break it."><b data-count="${s}">${s}</b><span>day streak</span><span class="week-dots" aria-hidden="true">${qWeek.map((on, k) => `<i class="${on ? 'on' : ''}" style="--k:${k}"></i>`).join('')}</span></span>
      <span><b data-count="${Math.round(weekMins)}">${Math.round(weekMins)}</b><span>min this week</span>${deltaChip(weekMins, prevWeek || null, ' min')}</span>
      <span><b ${last ? `data-count="${last.score}"` : ''}>${last ? last.score : '–'}</b><span>last check</span>${last ? deltaChip(last.score, prevScore) : ''}</span>
      <span class="stat-more" aria-hidden="true">${ICONS.chart} Stats ${ICONS.arrow}</span>
    </button>
    ${installCard()}
    <p class="credit"><a href="help.html#credits">Credits</a></p>`;

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
    if (item.piece) choosePiece(item.piece);
    show(item.tab);
  }));
  root.querySelector('#news-open')?.addEventListener('click', () => openWhatsNew(refreshToday));
  wireInstall(root, refreshToday);
  wireGettingStarted(root, { tour: runTour, mic: () => { show('play'); openMicSetup({ onDone: () => show('today') }); }, show, redraw: refreshToday });
  root.querySelector('[data-go=exam]')?.addEventListener('click', () => show('exam'));
  root.querySelector('#today-stats').addEventListener('click', () => show('stats'));
  countUp(root);
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
  return `<button class="exam-chip" type="button" data-go="exam">${ICONS.trophy}<span><b>${examTitle(e)} in ${days} day${days === 1 ? '' : 's'}</b><small>${phaseFor(days, e.type).title}${bands.length ? ` · ${bands.filter((b) => b === 'below').length ? `${bands.filter((b) => b === 'below').length} piece${bands.filter((b) => b === 'below').length > 1 ? 's' : ''} below pass` : 'all pieces at pass or above'}` : ''}</small></span></button>`;
}
function p_noExam() {
  const p = profile();
  return p?.board && p.board !== 'Not doing exams' ? `<button class="exam-chip quiet" type="button" data-go="exam">${ICONS.trophy}<span><b>Got an exam date?</b><small>Plan backwards from it</small></span></button>` : '';
}

function runTour() {
  startTour({ show, onEnd: () => show('today') });
}
addEventListener('stave:tour', runTour); // from Settings

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
  const link = (id) => `<button class="btn ghost link" id="${id}" type="button">Already have an account? Sign in</button>`;
  view.querySelector('#w-start')?.insertAdjacentHTML('afterend', link('w-signin-splash'));
  view.querySelector('#w-form')?.insertAdjacentHTML('afterend', link('w-signin'));
  view.querySelectorAll('#w-signin, #w-signin-splash').forEach((b) => b.addEventListener('click', () => show('account')));
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

document.getElementById('top-mark').innerHTML = MARK;
document.querySelectorAll('.tabbar [data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
initSettings();
mountBackground();
mountOffline();
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
setOpenKit(openKit);
const canSend = () => setSendTake(currentUser() && teacherName() ? sendTake : null);
canSend();
onTeachChange(() => { refreshToday(); canSend(); });
setPieceTitles(() => Object.fromEntries(everyPiece().map((x) => [x.id, x.title])));
startSync();
document.getElementById('top-avatar').addEventListener('click', () => show('account'));
addEventListener('mh:account', updateTopbar);

document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
// A light tick when a selection changes (tabs, switches, choice chips). Presses that
// start something give their own feedback where they finish.
document.addEventListener('click', (e) => { if (e.target.closest?.('.tabbar button, .segmented button, .choice')) tap('selection'); });
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
// Home-screen shortcuts open straight into a tab (?go=practice), then tidy the address.
const go = new URLSearchParams(location.search).get('go');
if (go) history.replaceState(null, '', location.pathname + location.hash);
show(linked && profile() ? 'today' : TABS.includes(go) ? go : load('tab', 'today'));
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
