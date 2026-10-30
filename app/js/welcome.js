// First-run welcome + setup. No accounts yet: answers stay on this device and
// tune the app (daily goal now; level, exam board and teacher link later).
import { ICONS } from './icons.js';
import { load, save } from './store.js';

const LEVELS = ['Just starting', 'Initial – Grade 1', 'Grade 2 – 3', 'Grade 4 and above'];
const BOARDS = ['ABRSM', 'Trinity', 'Not doing exams'];
const GOALS = [10, 20, 30, 45];

export const profile = () => load('profile', null);

// The Stave mark: five glass lines and one rising note.
export const MARK = `<svg viewBox="0 0 48 48"><g stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round">${[12, 18, 24, 30, 36].map((y) => `<line x1="6" x2="42" y1="${y}" y2="${y}"/>`).join('')}</g><rect x="29.2" y="6" width="3.4" height="24" rx="1.7" fill="url(#mark-g)"/><ellipse cx="24.6" cy="30" rx="7.6" ry="5.6" transform="rotate(-22 24.6 30)" fill="url(#mark-g)"/></svg>`;

export function mountWelcome(el, onDone) {
  const p = profile() ?? { teacher: true, level: LEVELS[0], board: BOARDS[0], goal: load('goal', 20), strictness: 'standard' };

  // Two steps: a splash that says what Stave is, then the setup. "Change your setup"
  // (a profile already exists) goes straight to the second.
  el.innerHTML = `
    <div class="splash" ${profile() ? 'hidden' : ''}>
      <div class="glass-hero">
        <span class="brand-mark big" aria-hidden="true">${MARK}</span>
        <h1 class="wordmark">Stave</h1>
        <p class="tagline">Piano practice that gets you exam&#8209;ready.</p>
        <svg class="stave-anim" viewBox="0 0 320 84" aria-hidden="true">
          ${[0, 1, 2, 3, 4].map((k) => `<line x1="6" x2="314" y1="${14 + k * 14}" y2="${14 + k * 14}"/>`).join('')}
          ${[[44, 56], [92, 49], [140, 42], [188, 35], [236, 28], [284, 21]].map(([x, y], k) => `<g class="n" style="--k:${k}"><ellipse cx="${x}" cy="${y}" rx="8.5" ry="6.2" transform="rotate(-20 ${x} ${y})"/><line x1="${x + 7.6}" x2="${x + 7.6}" y1="${y - 2}" y2="${y - 38}"/></g>`).join('')}
        </svg>
        <ul class="pitch">
          <li><span class="chip blue">${ICONS.book}</span><span><b>Read</b><small>Note flashcards that learn what you miss</small></span></li>
          <li><span class="chip green">${ICONS.metronome}</span><span><b>Practise</b><small>A daily plan built from your grade and your weak bars</small></span></li>
          <li><span class="chip gold">${ICONS.piano}</span><span><b>Perform</b><small>Play into the mic and see every note you got right</small></span></li>
        </ul>
        <button class="btn primary block big" type="button" id="w-start">Get started</button>
        <p class="fine">Free while we're testing. No adverts. <a href="privacy.html">Privacy</a></p>
      </div>
    </div>
    <div class="setup-step" ${profile() ? '' : 'hidden'}>
    <div class="setup-head">
      <div><h2>${profile() ? 'Your setup' : 'Set up in 30 seconds'}</h2><p class="lede">So today's plan fits you. You can change this any time.</p></div>
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
      <label class="field" id="w-lesson-field">Lesson day
        <select id="w-lesson"><option value="">No regular lesson</option>${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select>
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
      <p class="fine">Your progress stays on this device unless you make an account. <a href="privacy.html">Privacy</a></p>
    </form>
    </div>`;

  el.querySelector('#w-start').addEventListener('click', () => {
    el.querySelector('.splash').hidden = true;
    const step = el.querySelector('.setup-step');
    step.hidden = false;
    step.classList.add('enter');
    scrollTo(0, 0);
  });

  const form = el.querySelector('#w-form');
  const setTeacher = (yes) => {
    p.teacher = yes;
    form.querySelectorAll('[data-teacher]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.teacher === 'yes') === yes)));
    form.querySelector('#w-lesson-field').hidden = !yes;
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
  form.querySelector('#w-lesson').value = p.lessonDay ?? '';
  setTeacher(p.teacher);
  setGoal(GOALS.includes(p.goal) ? p.goal : 20);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    p.level = form.querySelector('#w-level').value;
    p.board = form.querySelector('#w-board').value;
    p.strictness = form.querySelector('#w-strict').value;
    p.lessonDay = p.teacher && form.querySelector('#w-lesson').value !== '' ? Number(form.querySelector('#w-lesson').value) : null;
    p.at = Date.now();
    save('profile', p);
    save('goal', p.goal);
    onDone(p);
  });
}
