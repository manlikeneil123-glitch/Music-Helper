// Practice timer + log. Timer state is timestamp-based and persisted, so it
// survives the tab sleeping, the phone locking, or the app being closed.
import { load, save, dayKey } from './store.js';
import { tap } from './haptics.js';

let goalBuzzed = false;

let state = load('timer', { running: false, startedAt: 0, accumulated: 0, focus: 'Pieces' });
let sessions = load('sessions', []); // [{ day, start, ms, focus }]
let tick = null;
let root;
const changeListeners = new Set();

export const FOCUSES = ['Warm-up & scales', 'Pieces', 'Sight-reading', 'Theory', 'Free play'];

export function onSessionsChange(fn) {
  changeListeners.add(fn);
}

const elapsed = () => state.accumulated + (state.running ? Date.now() - state.startedAt : 0);

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (h ? `${h}:` : '') + `${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

export function goalMinutes() {
  return load('goal', 20);
}

export function minutesOn(day) {
  return sessions.filter((s) => s.day === day).reduce((a, s) => a + s.ms, 0) / 60000;
}

export function streak() {
  let count = 0;
  const d = new Date();
  // Today counts if practised; if not, the streak is still alive from yesterday.
  if (minutesOn(dayKey(d)) === 0) d.setDate(d.getDate() - 1);
  while (minutesOn(dayKey(d)) > 0) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function lastDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return { day: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), minutes: minutesOn(dayKey(d)) };
  });
}

function persist() {
  save('timer', state);
}

function render() {
  root.querySelector('#timer-display').textContent = fmt(elapsed());
  const startBtn = root.querySelector('#timer-start');
  startBtn.textContent = state.running ? 'Pause' : elapsed() > 0 ? 'Resume' : 'Start';
  startBtn.classList.toggle('primary', !state.running);
  root.querySelector('#timer-finish').disabled = elapsed() < 1000;
  root.querySelector('#timer-discard').disabled = elapsed() === 0;
  root.querySelector('.timer-ring').classList.toggle('running', state.running);

  const today = minutesOn(dayKey()) + elapsed() / 60000;
  const goal = goalMinutes();
  root.querySelector('#timer-today').textContent = `${Math.floor(today)} / ${goal} min today`;
  root.querySelector('#timer-goalbar').style.width = `${Math.min(100, (today / goal) * 100)}%`;
  // One buzz the moment today's goal is reached (Android; iPhone browsers can't vibrate).
  if (state.running && today >= goal && !goalBuzzed) { goalBuzzed = true; tap('success'); }
  if (today < goal) goalBuzzed = false;

  const days = lastDays(7);
  const max = Math.max(goal, ...days.map((d) => d.minutes));
  root.querySelector('#timer-week').innerHTML = days
    .map((d) => `<div class="bar-col" title="${Math.round(d.minutes)} min"><div class="bar" style="height:${(d.minutes / max) * 100}%"></div><span>${d.label}</span></div>`)
    .join('');
  root.querySelector('#timer-streak').textContent = `${streak()} day streak`;

  root.querySelector('#timer-log').innerHTML =
    sessions
      .slice(-5)
      .reverse()
      .map((s) => `<li><span>${new Date(s.start).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${s.focus}</span><b>${fmt(s.ms)}</b></li>`)
      .join('') || '<li class="muted">No sessions yet — press Start and play.</li>';
}

function toggle() {
  if (state.running) {
    state.accumulated = elapsed();
    state.running = false;
  } else {
    state.startedAt = Date.now();
    state.running = true;
  }
  persist();
  render();
}

function finish() {
  const ms = elapsed();
  if (ms < 1000) return;
  sessions.push({ day: dayKey(), start: Date.now() - ms, ms, focus: state.focus });
  save('sessions', sessions);
  state = { running: false, startedAt: 0, accumulated: 0, focus: state.focus };
  persist();
  render();
  changeListeners.forEach((fn) => fn());
}

export function mountTimer(el) {
  root = el;
  root.innerHTML = `
    <h2>Practise</h2>
    <div class="timer-ring"><div id="timer-display" class="timer-display">0:00</div></div>
    <label class="field">What are you working on?
      <select id="timer-focus">${FOCUSES.map((f) => `<option>${f}</option>`).join('')}</select>
    </label>
    <div class="row gap">
      <button class="btn" id="timer-discard" type="button">Discard</button>
      <button class="btn primary" id="timer-start" type="button">Start</button>
      <button class="btn" id="timer-finish" type="button">Finish</button>
    </div>
    <section class="card">
      <div class="row between"><b id="timer-today"></b><span class="pill" id="timer-streak"></span></div>
      <div class="goal"><div id="timer-goalbar"></div></div>
      <div class="week" id="timer-week"></div>
      <label class="field inline">Daily goal
        <input id="timer-goal" type="number" min="5" max="240" step="5" inputmode="numeric"> min
      </label>
    </section>
    <section class="card">
      <h3>Recent sessions</h3>
      <ul class="log" id="timer-log"></ul>
    </section>`;

  const focus = root.querySelector('#timer-focus');
  focus.value = state.focus;
  focus.addEventListener('change', () => {
    state.focus = focus.value;
    persist();
  });
  const goal = root.querySelector('#timer-goal');
  goal.value = goalMinutes();
  goal.addEventListener('change', () => {
    save('goal', Math.max(5, Number(goal.value) || 20));
    render();
    changeListeners.forEach((fn) => fn());
  });
  root.querySelector('#timer-start').addEventListener('click', toggle);
  root.querySelector('#timer-finish').addEventListener('click', finish);
  // Two-tap confirm instead of confirm(), which some embedded views block.
  const discard = root.querySelector('#timer-discard');
  let armed = null;
  discard.addEventListener('click', () => {
    if (!armed) {
      discard.textContent = 'Tap to confirm';
      armed = setTimeout(() => { armed = null; discard.textContent = 'Discard'; }, 3000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    discard.textContent = 'Discard';
    state = { running: false, startedAt: 0, accumulated: 0, focus: state.focus };
    persist();
    render();
  });

  clearInterval(tick);
  tick = setInterval(() => state.running && render(), 500);
  render();
}
