// First-run welcome + setup. No accounts yet: answers stay on this device and
// tune the app (daily goal now; level, exam board and teacher link later).
import { ICONS } from './icons.js';
import { load, save } from './store.js';

const LEVELS = ['Just starting', 'Initial – Grade 1', 'Grade 2 – 3', 'Grade 4 and above'];
const BOARDS = ['ABRSM', 'Trinity', 'Not doing exams'];
const GOALS = [10, 20, 30, 45];

export const profile = () => load('profile', null);

export function mountWelcome(el, onDone) {
  const p = profile() ?? { teacher: true, level: LEVELS[0], board: BOARDS[0], goal: load('goal', 20), strictness: 'standard' };

  el.innerHTML = `
    <h1 class="hero">Read. Practise. Perform.</h1>
    <p class="lede">Your piano practice coach between lessons, or instead of them.</p>
    <div class="tiles">
      <div class="tile"><span class="chip">${ICONS.book}</span><b>Read</b><small>Note flashcards</small></div>
      <div class="tile"><span class="chip">${ICONS.metronome}</span><b>Practise</b><small>Timer and daily plan</small></div>
      <div class="tile"><span class="chip">${ICONS.piano}</span><b>Perform</b><small>Play and get feedback</small></div>
    </div>
    <form class="card setup" id="w-form" novalidate>
      <div class="segmented" role="group" aria-label="How are you learning?">
        <button type="button" data-teacher="yes">I have a teacher</button>
        <button type="button" data-teacher="no">Learning on my own</button>
      </div>
      <label class="field">Where are you now?
        <select id="w-level">${LEVELS.map((l) => `<option>${l}</option>`).join('')}</select>
      </label>
      <label class="field">Exam board
        <select id="w-board">${BOARDS.map((b) => `<option>${b}</option>`).join('')}</select>
      </label>
      <label class="field">How strict should checking be?
        <select id="w-strict">
          <option value="gentle">Gentle: encouraging, only clear mistakes</option>
          <option value="standard">Standard: like a lesson</option>
          <option value="exam">Exam: strict timing, steady tempo</option>
        </select>
      </label>
      <fieldset class="field goals">
        <legend>Daily practice goal</legend>
        <div class="choice-row">${GOALS.map((g) => `<button type="button" class="choice" data-goal="${g}">${g} min</button>`).join('')}</div>
      </fieldset>
      <button class="btn primary block" type="submit">Get started</button>
      <p class="fine">Free while we're testing. Everything's unlocked and there are no adverts. Your progress stays on this device unless you make an account. <a href="privacy.html">Privacy</a></p>
    </form>`;

  const form = el.querySelector('#w-form');
  const setTeacher = (yes) => {
    p.teacher = yes;
    form.querySelectorAll('[data-teacher]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.teacher === 'yes') === yes)));
  };
  const setGoal = (g) => {
    p.goal = g;
    form.querySelectorAll('[data-goal]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.goal) === g)));
  };
  form.querySelectorAll('[data-teacher]').forEach((b) => b.addEventListener('click', () => setTeacher(b.dataset.teacher === 'yes')));
  form.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => setGoal(Number(b.dataset.goal))));
  form.querySelector('#w-level').value = p.level;
  form.querySelector('#w-board').value = p.board;
  form.querySelector('#w-strict').value = p.strictness ?? 'standard';
  setTeacher(p.teacher);
  setGoal(GOALS.includes(p.goal) ? p.goal : 20);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    p.level = form.querySelector('#w-level').value;
    p.board = form.querySelector('#w-board').value;
    p.strictness = form.querySelector('#w-strict').value;
    p.at = Date.now();
    save('profile', p);
    save('goal', p.goal);
    onDone(p);
  });
}
