// Read-only weekly summary for a parent, from the secret link a student shares. No
// account, no app install; the token is in the #hash so it never reaches server logs.
import { cloudReady, publicRpc } from './cloud.js';

const root = document.getElementById('parent');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const BAND = { distinction: 'Distinction level', merit: 'Merit level', pass: 'Pass level', below: 'Below pass' };
const tone = (score) => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');
const ago = (t) => {
  const d = Math.round((Date.now() - new Date(t).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

function render(v) {
  const s = v.summary;
  if (!s) {
    root.innerHTML = `<h1>@${esc(v.username)}</h1><p class="muted">Nothing practised with the app yet. Check back after a few sessions.</p>`;
    return;
  }
  const max = Math.max(10, ...s.days.map((d) => d.minutes));
  root.innerHTML = `
    <p class="muted small">Music Helper · practice summary</p>
    <h1>@${esc(v.username)}</h1>
    <p class="muted">Last practised ${ago(v.updated_at)}${s.level ? ` · ${esc(s.level)}` : ''}</p>
    <section class="card">
      <div class="big">
        <div><b>${s.streak}</b><span class="muted small">day streak</span></div>
        <div><b>${s.week}′</b><span class="muted small">this week</span></div>
        <div><b>${s.recent?.filter((c) => Date.now() - c.at < 7 * 86400000).length ?? 0}</b><span class="muted small">checked runs</span></div>
      </div>
      <div class="mini-chart" role="img" aria-label="Minutes per day, last 14 days">${s.days.map((d) => `<i style="height:${Math.max(2, (d.minutes / max) * 44)}px" title="${d.day}: ${d.minutes} min"></i>`).join('')}</div>
      <p class="muted small">The streak counts days with real progress (a clean run, a bar fixed, or 20 notes read), not just time.</p>
    </section>
    ${s.exam && s.exam.days >= 0 ? `<section class="card"><h3>${esc(s.exam.board)} ${s.exam.grade === 'Initial' ? 'Initial' : `Grade ${esc(s.exam.grade)}`} in ${s.exam.days} days</h3>
      <ul class="log">${s.exam.pieces.map((p) => `<li><span>${esc(p.title || 'Piece')}</span>${p.band ? `<span class="band ${p.band}">${BAND[p.band]}</span>` : '<span class="muted small">no reading yet</span>'}</li>`).join('')}</ul>
      <p class="muted small">Readiness covers right notes and rhythm only, from the last few runs. It isn't an exam mark.</p></section>` : ''}
    ${s.recent?.length ? `<section class="card"><h3>Recent checks</h3><ul class="log recent">${s.recent.slice(0, 6).map((c) => `<li><span class="who"><span class="mini-badge ${tone(c.score)}">${c.score}</span><span>${esc(c.title)}</span></span><small class="muted">${ago(c.at)}</small></li>`).join('')}</ul></section>` : ''}
    ${s.weekBars?.length ? `<section class="card"><h3>Working on</h3><ul class="log">${s.weekBars.map((p) => `<li><span>${esc(p.title)}</span><span class="muted">${p.bars.map((b) => `bar ${b.bar}`).join(', ')}</span></li>`).join('')}</ul></section>` : ''}
    <p class="fine">This link was shared by @${esc(v.username)} and can be turned off by them at any time. <a href="privacy.html">Privacy</a></p>`;
}

async function main() {
  const token = /[#&]t=([0-9a-f]{32,})/.exec(location.hash)?.[1];
  if (!cloudReady() || !token) {
    root.innerHTML = '<h1>Link not valid</h1><p class="muted">Ask for a new link from the Account page in Music Helper.</p>';
    return;
  }
  try {
    const v = await publicRpc('parent_view', { p_token: token });
    if (!v) throw new Error('gone');
    render(v);
  } catch {
    root.innerHTML = '<h1>This link has been turned off</h1><p class="muted">Ask for a new one if you still need it.</p>';
  }
}
main();
