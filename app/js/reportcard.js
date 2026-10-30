// Weekly report card: one image a student can send to a teacher or parent (WhatsApp,
// Messages). It reports what got better — clean runs, bars fixed, readiness — not
// minutes, which say nothing about whether practice worked.
import { load, dayKey } from './store.js';
import { checkHistory, allPieces } from './check.js';
import { qualityWeek } from './quality.js';
import { examWithReadiness } from './examview.js';
import { daysUntil, examTitle } from './exam.js';
import { currentUser } from './cloud.js';
import { lastDays } from './timer.js';

/** The numbers on the card (pure apart from reading storage). */
export function weekReport(now = Date.now()) {
  const since = now - 7 * 86400000;
  const before = now - 14 * 86400000;
  const runs = checkHistory().filter((h) => h.at >= since);
  const quality = load('quality', {});
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return dayKey(d); });
  const titles = Object.fromEntries(allPieces().map((p) => [p.id, p.title]));
  const pieces = Object.values(runs.reduce((acc, r) => {
    const p = (acc[r.pieceId] ??= { id: r.pieceId, title: titles[r.pieceId] ?? 'Imported piece', runs: 0, best: 0, first: r.score, last: r.score, bars: {} });
    p.runs++;
    p.best = Math.max(p.best, r.score);
    p.last = r.score;
    for (const [bar, n] of Object.entries(r.barErrors ?? {})) p.bars[bar] = (p.bars[bar] ?? 0) + n;
    return acc;
  }, {}));
  // A bar "fixed" this week: had mistakes last week, none in this week's last run.
  const lastWeek = checkHistory().filter((h) => h.at >= before && h.at < since);
  const fixed = pieces.reduce((n, p) => {
    const old = new Set(lastWeek.filter((h) => h.pieceId === p.id).flatMap((h) => Object.keys(h.barErrors ?? {})));
    const latest = runs.filter((h) => h.pieceId === p.id).pop()?.barErrors ?? {};
    return n + [...old].filter((b) => !latest[b]).length;
  }, 0);
  return {
    days: qualityWeek(quality, new Date(now)),
    minutes: Math.round(lastDays(7).reduce((a, d) => a + d.minutes, 0)),
    cleanRuns: runs.filter((r) => r.score >= 85).length,
    drills: days.reduce((a, d) => a + (quality[d]?.bars ?? 0), 0),
    notesRead: days.reduce((a, d) => a + (quality[d]?.cards ?? 0), 0),
    barsFixed: fixed,
    pieces: pieces.sort((a, b) => b.runs - a.runs).slice(0, 4).map((p) => ({ ...p, trouble: Object.entries(p.bars).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([b]) => b) })),
    exam: examWithReadiness(),
  };
}

const BAND = { distinction: ['Distinction level', '#5fd68f'], merit: ['Merit level', '#8ab4ff'], pass: ['Pass level', '#f2b45a'], below: ['Below pass', '#ff7a7a'] };

function draw(r) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const font = (size, weight = 600) => `${weight} ${size}px Geist, system-ui, -apple-system, sans-serif`;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1b2230');
  bg.addColorStop(1, '#0d1014');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const text = (t, x, y, size, color = '#f3f5f8', weight = 600, align = 'left') => {
    g.font = font(size, weight);
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(t, x, y);
  };
  const panel = (x, y, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.beginPath();
    g.roundRect(x, y, w, h, 28);
    g.fill();
  };
  const end = new Date();
  const start = new Date(Date.now() - 6 * 86400000);
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const who = currentUser()?.username;
  text('Stave · weekly report', 72, 110, 34, '#a9b0bb', 600);
  text(who ? `@${who}` : 'My piano practice', 72, 180, 64, '#f3f5f8', 800);
  text(`${fmt(start)} – ${fmt(end)}`, 72, 232, 34, '#a9b0bb', 500);

  // Quality days
  panel(60, 280, W - 120, 170);
  text('Days that counted', 100, 340, 32, '#a9b0bb');
  const labels = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(undefined, { weekday: 'narrow' }));
  r.days.forEach((on, i) => {
    const x = 120 + i * 128;
    g.fillStyle = on ? '#5fd68f' : 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.arc(x, 395, 26, 0, Math.PI * 2);
    g.fill();
    text(labels[i], x, 405, 24, on ? '#0d1014' : '#a9b0bb', 700, 'center');
  });

  // Numbers
  const stats = [[r.cleanRuns, 'clean runs'], [r.barsFixed + r.drills, 'bars fixed'], [r.notesRead, 'notes read'], [r.minutes, 'minutes']];
  stats.forEach(([n, label], i) => {
    const x = 60 + i * 245;
    panel(x, 480, 225, 170);
    text(String(n), x + 30, 572, 72, '#f3f5f8', 800);
    text(label, x + 30, 620, 28, '#a9b0bb', 500);
  });

  // Pieces
  let y = 720;
  text('Pieces', 72, y, 40, '#f3f5f8', 800);
  y += 30;
  if (!r.pieces.length) {
    text('No checked runs this week.', 72, y + 50, 30, '#a9b0bb', 500);
    y += 80;
  }
  for (const p of r.pieces) {
    panel(60, y, W - 120, 112);
    const exam = r.exam?.pieces.find((x) => x.pieceId === p.id)?.readiness;
    text(p.title.length > 34 ? `${p.title.slice(0, 33)}…` : p.title, 96, y + 50, 34, '#f3f5f8', 700);
    text(`${p.runs} run${p.runs === 1 ? '' : 's'} · best ${p.best}${p.last > p.first ? ` · up ${p.last - p.first}` : ''}${p.trouble.length ? ` · work on bar ${p.trouble.join(', ')}` : ''}`, 96, y + 92, 26, '#a9b0bb', 500);
    if (exam?.band) {
      const [label, color] = BAND[exam.band];
      text(label, W - 96, y + 50, 28, color, 700, 'right');
    }
    y += 130;
  }

  // Exam
  const days = r.exam ? daysUntil(r.exam.date) : null;
  if (days != null && days >= 0) {
    panel(60, H - 230, W - 120, 120);
    text(examTitle(r.exam), 96, H - 160, 36, '#f3f5f8', 800);
    text(`${days} day${days === 1 ? '' : 's'} to go`, W - 96, H - 160, 36, '#f2b45a', 800, 'right');
    text('Readiness is for pitch and time only. Not an official mark.', 96, H - 124, 24, '#a9b0bb', 500);
  }
  text('Practice checked by the app, not just timed.', W / 2, H - 50, 26, '#6f7783', 500, 'center');
  return c;
}

export async function openReportCard() {
  const canvas = draw(weekReport());
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'practice-report.png', { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const dlg = document.createElement('dialog');
  dlg.className = 'card report-dialog';
  dlg.innerHTML = `
    <img src="${url}" alt="This week's practice report card">
    <div class="row gap">
      <button class="btn primary" type="button" data-act="share">Share</button>
      <a class="btn" href="${url}" download="practice-report.png">Save</a>
      <button class="btn" type="button" data-act="close">Close</button>
    </div>`;
  document.body.append(dlg);
  const close = () => { dlg.close(); dlg.remove(); URL.revokeObjectURL(url); };
  dlg.querySelector('[data-act=close]').addEventListener('click', close);
  dlg.addEventListener('cancel', close);
  const share = dlg.querySelector('[data-act=share]');
  if (!navigator.canShare?.({ files: [file] })) share.hidden = true;
  share.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [file], title: 'My practice this week' });
    } catch {
      // Share sheet dismissed.
    }
  });
  dlg.showModal();
}
