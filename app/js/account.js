// Accounts: username + password, no email. Students can join their teacher's studio
// with a code; teachers see each student's practice and checks. Progress still lives
// on the phone first — the account is a backup and the teacher's window onto it.
import { ICONS } from './icons.js';
import { cloudReady, currentUser, usernameError, signUp, signIn, signOut, rpc, changePassword, CloudError } from './cloud.js';
import { pull, pushNow, syncStatus, onSyncStatus } from './sync.js';
import { clearSynced, dataOwner, setDataOwner } from './store.js';

let root;
let mode = 'create'; // signed-out form: 'create' | 'signin'
let me = null; // the server's view of this account: { username, role, studio }
let students = null;
let busy = false;
let onOpenSetup = () => {};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const tone = (score) => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');

function ago(t) {
  if (!t) return 'never';
  const mins = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

function syncLine() {
  const s = syncStatus();
  if (s.state === 'error') return `<span class="sync bad">Not saved to your account: ${esc(s.error)}</span>`;
  if (s.state === 'saving' || s.state === 'loading') return '<span class="sync">Saving…</span>';
  if (s.state === 'pending') return '<span class="sync">Changes waiting to save…</span>';
  if (s.at) return `<span class="sync good">${ICONS.check} Saved to your account ${ago(s.at)}</span>`;
  return '<span class="sync">Progress saves to your account as you practise.</span>';
}

function notReady() {
  return `
    <section class="card">
      <h3>Accounts aren't switched on yet</h3>
      <p class="muted">Everything you do is saved on this device. Accounts will back it up, carry it to a new phone and let your teacher follow your practice.</p>
      <p class="fine">For whoever runs this app: create a free Supabase project, run <code>supabase/schema.sql</code>, then put the project URL and anon key in <code>app/js/config.js</code>. Steps are in <code>supabase/README.md</code>.</p>
    </section>`;
}

function signedOut() {
  const creating = mode === 'create';
  return `
    <form class="card account-form" id="acct-form" novalidate>
      <div class="segmented" role="group" aria-label="Account">
        <button type="button" data-mode="create" aria-pressed="${creating}">Create account</button>
        <button type="button" data-mode="signin" aria-pressed="${!creating}">Sign in</button>
      </div>
      <label class="field">Username
        <input id="acct-user" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="e.g. ana_plays" required>
      </label>
      <label class="field">Password
        <span class="pw"><input id="acct-pass" type="password" autocomplete="${creating ? 'new-password' : 'current-password'}" minlength="8" required><button type="button" class="btn small-btn" id="acct-show">Show</button></span>
      </label>
      ${creating ? `
      <fieldset class="field">
        <legend>I'm a…</legend>
        <div class="segmented" role="group" aria-label="Role">
          <button type="button" data-role="student" aria-pressed="true">Student</button>
          <button type="button" data-role="teacher" aria-pressed="false">Teacher</button>
        </div>
      </fieldset>
      <label class="field inline"><input type="checkbox" id="acct-age"> I'm 13 or over, or a parent or carer is setting this up.</label>
      <p class="warn-note">No email needed, so there's no way to reset a forgotten password. Write it down or save it in your phone's password manager.</p>` : ''}
      <p class="error" id="acct-error" role="alert" hidden></p>
      <button class="btn primary block" type="submit" id="acct-go">${creating ? 'Create account' : 'Sign in'}</button>
      <p class="fine">${creating ? 'What you\'ve done on this device so far moves into your new account.' : 'Your progress on this device merges with your account.'} We store your username, your practice and your check results — no name, email or recordings. <a href="privacy.html">Privacy</a></p>
    </form>`;
}

function studioForStudent() {
  const s = me.studio;
  if (s) {
    return `
      <section class="card">
        <h3>Your teacher</h3>
        <p><b>@${esc(s.teacher)}</b> <span class="muted">· ${esc(s.name)}</span></p>
        <p class="muted small">They can see your practice minutes, streak and check results, and nothing else.</p>
        <button class="btn small-btn" type="button" id="acct-leave">Leave studio</button>
      </section>`;
  }
  return `
    <form class="card" id="acct-join" novalidate>
      <h3>Join your teacher</h3>
      <p class="muted small">Ask your teacher for their studio code. They'll see your practice and check results so lessons can start where you left off.</p>
      <div class="row gap"><input id="acct-code" type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="8" placeholder="Studio code" aria-label="Studio code"><button class="btn accent" type="submit">Join</button></div>
    </form>`;
}

function studentRow(st) {
  const s = st.summary;
  if (!s) {
    return `<li class="student"><div class="row between"><b>@${esc(st.username)}</b><small class="muted">joined ${ago(st.joined_at)}, nothing synced yet</small></div></li>`;
  }
  const last = s.recent?.[0];
  const max = Math.max(10, ...s.days.map((d) => d.minutes));
  return `
    <li class="student">
      <details>
        <summary>
          <span class="who"><b>@${esc(st.username)}</b><small class="muted">${esc(s.level)}${s.board && s.board !== 'Not doing exams' ? ` · ${esc(s.board)}` : ''}</small></span>
          <span class="nums">
            <span title="Practice this week">${ICONS.clock}${s.week}′</span>
            <span title="Day streak">${ICONS.flame}${s.streak}</span>
            ${s.exam?.days >= 0 ? `<span title="Days to exam">${ICONS.trophy}${s.exam.days}d</span>` : ''}
            ${last ? `<span class="mini-badge ${tone(last.score)}" title="Last check">${last.score}</span>` : ''}
          </span>
        </summary>
        <div class="student-detail">
          <p class="muted small">Last active ${ago(st.updated_at)} · ${s.notesKnown} notes known</p>
          ${s.exam ? `<p class="small"><b>${esc(s.exam.board)} ${s.exam.grade === 'Initial' ? 'Initial' : `Grade ${esc(s.exam.grade)}`}</b> ${s.exam.days >= 0 ? `in ${s.exam.days} days` : 'done'} · ${s.exam.pieces.map((p) => `${esc(p.title || '?')}: ${p.band ? `<span class="band ${p.band}">${{ distinction: 'Distinction', merit: 'Merit', pass: 'Pass', below: 'Below pass' }[p.band]}</span>` : '<span class="muted">no reading</span>'}`).join(' · ')}</p>` : ''}
          ${s.lastMock ? `<p class="muted small">Last mock exam (${ago(s.lastMock.at)}): ${s.lastMock.results.map(esc).join(' · ')}</p>` : ''}
          <div class="mini-chart" role="img" aria-label="Minutes per day, last 14 days: ${s.days.map((d) => d.minutes).join(', ')}">
            ${s.days.map((d) => `<i style="height:${Math.max(2, (d.minutes / max) * 44)}px" title="${d.day}: ${d.minutes} min"></i>`).join('')}
          </div>
          ${s.recent?.length ? `<h4>Recent checks</h4><ul class="log recent">${s.recent.slice(0, 6).map((c) => `
            <li><span class="who"><span class="mini-badge ${tone(c.score)}">${c.score}</span><span>${esc(c.title)}${c.hands !== 'both' ? ` <small class="muted">(${c.hands === 'rh' ? 'RH' : 'LH'})</small>` : ''}${c.worstBar ? ` <small class="muted">· weakest bar ${c.worstBar}</small>` : ''}</span></span><small class="muted">${ago(c.at)}</small></li>`).join('')}</ul>` : '<p class="empty">No checks yet.</p>'}
          ${s.pieces?.length ? `<h4>Pieces</h4><ul class="log">${s.pieces.map((p) => `<li><span>${esc(p.title)} <small class="muted">· ${p.runs} run${p.runs === 1 ? '' : 's'}</small></span><b>${p.ready ? '✓ ready' : `best ${p.best}`}</b></li>`).join('')}</ul>` : ''}
          <div class="row gap wrap">
            <button class="btn small-btn" type="button" data-reset="${st.id}" data-name="${esc(st.username)}">Reset password</button>
            <button class="btn small-btn bad" type="button" data-remove="${st.id}" data-name="${esc(st.username)}">Remove from studio</button>
          </div>
        </div>
      </details>
    </li>`;
}

function studioForTeacher() {
  const s = me.studio;
  if (!s) {
    return `
      <form class="card" id="acct-studio" novalidate>
        <h3>Set up your studio</h3>
        <p class="muted small">You'll get a code to give your students. When they join, you'll see their practice and check results here.</p>
        <label class="field">Studio name <input id="acct-studio-name" type="text" maxlength="60" placeholder="e.g. Piano with Miss T"></label>
        <button class="btn accent" type="submit">Create studio</button>
      </form>`;
  }
  return `
    <section class="card">
      <div class="row between"><h3>${esc(s.name)}</h3><span class="pill">${students?.length ?? '…'} student${students?.length === 1 ? '' : 's'}</span></div>
      <p class="muted small">Students join from their Account page with this code:</p>
      <div class="studio-code"><b id="acct-code-text">${esc(s.code)}</b>
        <button class="btn small-btn" type="button" id="acct-share">Share</button>
        <button class="btn small-btn" type="button" id="acct-rotate" title="The old code stops working; students already in stay in">New code</button>
      </div>
    </section>
    <section class="card">
      <div class="row between"><h3>Students</h3><button class="btn small-btn" type="button" id="acct-refresh">Refresh</button></div>
      ${students == null ? '<p class="empty">Loading…</p>' : students.length ? `<ul class="log students">${students.map(studentRow).join('')}</ul>` : '<p class="empty">No one has joined yet. Share your code with your students.</p>'}
    </section>`;
}

function signedIn() {
  const role = me?.role ?? currentUser()?.role ?? 'student';
  return `
    <section class="card">
      <div class="row between">
        <div><h3>@${esc(me?.username ?? currentUser()?.username ?? '')}</h3><span class="muted small">${role === 'teacher' ? 'Teacher' : 'Student'} account</span></div>
        <button class="btn small-btn" type="button" id="acct-sync">Sync now</button>
      </div>
      <p class="small" id="acct-sync-line">${syncLine()}</p>
      <p class="error" id="acct-error" role="alert" hidden></p>
    </section>
    ${me ? (role === 'teacher' ? studioForTeacher() : studioForStudent()) : '<section class="card"><p class="empty">Loading your account…</p></section>'}
    <section class="card">
      <button class="btn ghost" type="button" id="acct-setup">${ICONS.arrow} Change your setup (level, board, goal)</button>
      <details class="pw-change">
        <summary class="btn ghost">${ICONS.arrow} Change password</summary>
        <form id="acct-pw" novalidate>
          <label class="field">Current password <input id="pw-old" type="password" autocomplete="current-password"></label>
          <label class="field">New password <input id="pw-new" type="password" autocomplete="new-password" minlength="8"></label>
          <button class="btn accent" type="submit">Change password</button>
        </form>
      </details>
      <a class="btn ghost" href="privacy.html">${ICONS.arrow} Privacy: what's stored and who sees it</a>
      <div class="row gap">
        <button class="btn" type="button" id="acct-out">Sign out</button>
        <button class="btn bad" type="button" id="acct-delete">Delete account</button>
      </div>
      <p class="fine">Signing out removes your progress from this device (it's kept in your account), so the next person can't see it.</p>
    </section>`;
}

function render() {
  if (!root) return;
  dispatchEvent(new Event('mh:account')); // the top bar shows who's signed in
  const open = [...root.querySelectorAll('.student details[open] [data-remove]')].map((b) => b.dataset.remove);
  root.innerHTML = `
    <h2>Account</h2>
    <p class="lede">${currentUser() ? 'Your progress, backed up.' : 'Back up your progress and connect with your teacher.'}</p>
    ${!cloudReady() ? notReady() : currentUser() ? signedIn() : signedOut()}
    ${!currentUser() ? `<button class="btn ghost link" id="acct-setup" type="button">Change your setup</button>` : ''}`;
  open.forEach((id) => root.querySelector(`[data-remove="${id}"]`)?.closest('details')?.setAttribute('open', ''));
  wire();
}

function showError(msg) {
  const el = root.querySelector('#acct-error');
  if (!el) return alert(msg);
  el.textContent = msg;
  el.hidden = !msg;
}

/** Run a server action with the buttons locked and errors shown in place. */
async function act(fn) {
  if (busy) return;
  busy = true;
  root.querySelectorAll('button').forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (e) {
    // Redraw signed-in pages to drop half-done state; leave the sign-in form alone so
    // a typo in the password doesn't also wipe the username.
    if (currentUser()) render();
    showError(e instanceof CloudError ? e.message : `Something went wrong: ${e.message}`);
  } finally {
    busy = false;
    root.querySelectorAll('button').forEach((b) => (b.disabled = false));
  }
}

async function refreshMe() {
  me = await rpc('me');
  if (me?.role === 'teacher' && me.studio) students = await rpc('studio_students');
}

// Modules read storage once at start-up, so new data from the account needs a reload.
async function afterSignIn(user) {
  if (dataOwner() && dataOwner() !== user.id) clearSynced();
  setDataOwner(user.id);
  const changed = await pull();
  await pushNow();
  if (changed.length) return location.reload();
  await refreshMe();
  render();
}

function wire() {
  root.querySelector('#acct-setup')?.addEventListener('click', () => onOpenSetup());
  const form = root.querySelector('#acct-form');
  if (form) {
    let role = 'student';
    form.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; render(); }));
    form.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
      role = b.dataset.role;
      form.querySelectorAll('[data-role]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    form.querySelector('#acct-show').addEventListener('click', (e) => {
      const pass = form.querySelector('#acct-pass');
      pass.type = pass.type === 'password' ? 'text' : 'password';
      e.target.textContent = pass.type === 'password' ? 'Show' : 'Hide';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = form.querySelector('#acct-user').value.trim().toLowerCase();
      const password = form.querySelector('#acct-pass').value;
      const bad = usernameError(username) || (password.length < 8 ? 'Passwords need at least 8 characters.' : '')
        || (mode === 'create' && !form.querySelector('#acct-age').checked ? 'Tick the box to confirm you\'re 13 or over, or ask a parent or carer to set this up.' : '');
      if (bad) return showError(bad);
      act(async () => {
        const user = mode === 'create' ? await signUp(username, password, role) : await signIn(username, password);
        await afterSignIn(user);
      });
    });
    return;
  }
  root.querySelector('#acct-sync')?.addEventListener('click', () => act(async () => {
    const changed = await pull();
    await pushNow();
    if (changed.length) return location.reload();
    await refreshMe();
    render();
  }));
  root.querySelector('#acct-out')?.addEventListener('click', () => act(async () => {
    await pushNow();
    if (syncStatus().state === 'error' && !confirm("Your latest progress couldn't be saved to your account. Sign out anyway and lose it on this device?")) return;
    clearSynced();
    setDataOwner(null);
    await signOut();
    location.reload();
  }));
  root.querySelector('#acct-delete')?.addEventListener('click', () => {
    const name = me?.username ?? currentUser()?.username;
    const typed = prompt(`This deletes your account and everything saved in it, for good. Your teacher will lose access too.\n\nType your username (${name}) to confirm.`);
    if (typed?.trim().toLowerCase() !== name) return;
    act(async () => {
      await rpc('delete_me');
      setDataOwner(null);
      await signOut();
      alert('Account deleted. Your progress is still on this device until you clear it.');
      location.reload();
    });
  });
  root.querySelector('#acct-join')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = root.querySelector('#acct-code').value;
    if (!code.trim()) return showError('Type the code your teacher gave you.');
    act(async () => {
      me = await rpc('join_studio', { p_code: code });
      await pushNow();
      render();
    });
  });
  root.querySelector('#acct-leave')?.addEventListener('click', () => {
    if (!confirm(`Leave ${me.studio.name}? @${me.studio.teacher} will stop seeing your progress.`)) return;
    act(async () => { me = await rpc('leave_studio'); render(); });
  });
  root.querySelector('#acct-studio')?.addEventListener('submit', (e) => {
    e.preventDefault();
    act(async () => {
      me = await rpc('create_studio', { p_name: root.querySelector('#acct-studio-name').value });
      students = [];
      render();
    });
  });
  root.querySelector('#acct-share')?.addEventListener('click', async () => {
    const text = `Join my piano studio on Music Helper: open ${location.origin}${location.pathname}, go to Account, create a student account and enter the code ${me.studio.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Music Helper studio code', text });
      else { await navigator.clipboard.writeText(text); showError(''); root.querySelector('#acct-share').textContent = 'Copied'; }
    } catch {
      // Share sheet dismissed.
    }
  });
  root.querySelector('#acct-rotate')?.addEventListener('click', () => {
    if (!confirm('Make a new code? The old one stops working. Students already in your studio stay.')) return;
    act(async () => { me = await rpc('new_studio_code'); render(); });
  });
  root.querySelector('#acct-refresh')?.addEventListener('click', () => act(async () => { await refreshMe(); render(); }));
  root.querySelector('#acct-pw')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const current = root.querySelector('#pw-old').value;
    const next = root.querySelector('#pw-new').value;
    if (next.length < 8) return showError('New passwords need at least 8 characters.');
    if (next === current) return showError('Pick a password different from the current one.');
    act(async () => {
      await changePassword(current, next);
      render();
      showError('');
      alert('Password changed. Use the new one next time you sign in.');
    });
  });
  root.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
    const temp = prompt(`Set a temporary password for @${b.dataset.name} (8+ characters). Tell them in the lesson, and ask them to change it from their Account page. They'll be signed out on their devices.`);
    if (temp == null) return;
    if (temp.length < 8) return showError('Temporary passwords need at least 8 characters.');
    act(async () => {
      await rpc('reset_student_password', { p_student: b.dataset.reset, p_password: temp });
      showError('');
      alert(`Done. @${b.dataset.name} can sign in with the temporary password now.`);
    });
  }));
  root.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm(`Remove @${b.dataset.name} from your studio? They keep their account and progress; you stop seeing it.`)) return;
    act(async () => { await rpc('remove_student', { p_student: b.dataset.remove }); await refreshMe(); render(); });
  }));
}

/** Called each time the Account page opens. */
export function renderAccount() {
  render();
  if (cloudReady() && currentUser()) {
    act(async () => { await refreshMe(); render(); });
  }
}

export function mountAccount(el, { openSetup }) {
  root = el;
  onOpenSetup = openSetup;
  onSyncStatus(() => {
    const line = root.querySelector('#acct-sync-line');
    if (line) line.innerHTML = syncLine();
  });
}

/** On start-up: bring in anything saved from another device. Returns true if reloading. */
export async function resumeAccount() {
  const user = currentUser();
  if (!cloudReady() || !user) return false;
  if (!dataOwner()) setDataOwner(user.id);
  const changed = await pull();
  let reloaded = false;
  try {
    reloaded = sessionStorage.getItem('mh:reloaded') === '1';
  } catch {
    // No session storage: allow one reload regardless.
  }
  if (changed.length && !reloaded) {
    try { sessionStorage.setItem('mh:reloaded', '1'); } catch { /* fine */ }
    location.reload();
    return true;
  }
  return false;
}
