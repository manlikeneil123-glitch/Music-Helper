// Copies this device's progress to the student's account and back. On-device stays
// the source of truth while offline; the server copy is merged in on sign-in and on
// start-up, and every save is pushed a few seconds later.
import { onSave, exportSynced, importSynced, dayKey } from './store.js';
import { cloudReady, currentUser, rest } from './cloud.js';
import { qualityStreak } from './quality.js';
import { pieceReadiness, daysUntil, examSpec } from './exam.js';

const PUSH_DELAY = 4000;
let timer = null;
let titles = () => ({});
let status = { state: 'idle', at: 0, error: '' };
const listeners = new Set();

export const syncStatus = () => status;
export function onSyncStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(next) {
  status = { ...status, ...next };
  listeners.forEach((fn) => fn(status));
}

/**
 * What a teacher sees, worked out on the student's phone so the teacher's view
 * reads one small object per student instead of their whole history.
 */
export function summarise(data, titleOf = {}, now = new Date()) {
  const sessions = data.sessions?.v ?? [];
  const checks = data.checks?.v ?? [];
  const cards = data.cards?.v ?? {};
  const minutesOn = (day) => sessions.filter((s) => s.day === day).reduce((a, s) => a + s.ms, 0) / 60000;
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { day: dayKey(d), minutes: Math.round(minutesOn(dayKey(d))) };
  });
  const streak = qualityStreak(data.quality?.v ?? {}, now);
  const pieces = {};
  for (const c of checks) {
    const p = (pieces[c.pieceId] ??= { title: titleOf[c.pieceId] ?? 'Imported piece', runs: 0, best: 0, last: 0, ready: false });
    p.runs++;
    p.best = Math.max(p.best, c.score);
    p.last = c.score;
    p.ready ||= Boolean(c.ready);
  }
  const profile = data.profile?.v ?? {};
  const ex = data.exam?.v;
  const exam = ex?.date ? {
    board: ex.board, type: ex.type ?? 'practical', grade: ex.grade, date: ex.date, days: daysUntil(ex.date, now),
    pieces: ex.pieces.slice(0, examSpec(ex.board, ex.type).piece.count).map((p) => ({ title: p.title || titleOf[p.pieceId] || '', band: p.pieceId ? pieceReadiness(checks.filter((c) => c.pieceId === p.pieceId), ex.board, now.getTime(), 2, ex.type).band : null })),
    ratings: ex.ratings ?? {},
  } : null;
  const mocks = (data.mocks?.v ?? []).slice(-1).map((m) => ({ at: m.at, results: m.results.map((r) => r.summary) }));
  return {
    level: profile.level ?? '',
    board: profile.board ?? '',
    streak,
    week: days.slice(7).reduce((a, x) => a + x.minutes, 0),
    days,
    notesKnown: Object.values(cards).filter((c) => (c.box ?? 0) >= 3).length,
    recent: checks.slice(-10).reverse().map((c) => ({ title: titleOf[c.pieceId] ?? 'Imported piece', score: c.score, at: c.at, worstBar: c.worstBar ?? null, hands: c.hands ?? 'both', input: c.input ?? '' })),
    pieces: Object.values(pieces),
    exam,
    lastMock: mocks[0] ?? null,
    weekBars: weekBars(checks, titleOf, now),
    done: Object.keys(data.assignmentDone?.v ?? {}).slice(-100),
  };
}

// Where this week's mistakes clustered, per piece: the bars to start the lesson on.
function weekBars(checks, titleOf, now) {
  const since = now.getTime() - 7 * 86400000;
  const per = {};
  for (const c of checks) {
    if (c.at < since || !c.barErrors) continue;
    const p = (per[c.pieceId] ??= { title: titleOf[c.pieceId] ?? 'Imported piece', runs: 0, bars: {} });
    p.runs++;
    for (const [bar, n] of Object.entries(c.barErrors)) p.bars[bar] = (p.bars[bar] ?? 0) + n;
  }
  return Object.values(per)
    .map((p) => ({ title: p.title, runs: p.runs, bars: Object.entries(p.bars).map(([bar, n]) => ({ bar: Number(bar), perRun: +(n / p.runs).toFixed(1) })).filter((b) => b.perRun >= 0.5).sort((a, b) => b.perRun - a.perRun).slice(0, 3) }))
    .filter((p) => p.bars.length);
}

/** Piece titles for summaries (check.js knows them; sync shouldn't import it). */
export function setPieceTitles(fn) {
  titles = fn;
}

async function push() {
  clearTimeout(timer);
  timer = null;
  const user = currentUser();
  if (!cloudReady() || !user) return;
  setStatus({ state: 'saving', error: '' });
  try {
    const data = exportSynced();
    data.summary = { v: summarise(data, titles()), t: Date.now() };
    await rest('progress?on_conflict=user_id', {
      method: 'POST',
      body: { user_id: user.id, data, updated_at: new Date().toISOString() },
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
    setStatus({ state: 'saved', at: Date.now() });
  } catch (e) {
    setStatus({ state: 'error', error: e.message });
  }
}

export function pushSoon() {
  if (!cloudReady() || !currentUser()) return;
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_DELAY);
  setStatus({ state: 'pending' });
}

export const pushNow = push;

/** Merge the account's copy into this device. Returns the names that changed. */
export async function pull() {
  const user = currentUser();
  if (!cloudReady() || !user) return [];
  setStatus({ state: 'loading', error: '' });
  try {
    const rows = await rest(`progress?user_id=eq.${user.id}&select=data`);
    const remote = rows?.[0]?.data ?? {};
    delete remote.summary;
    const changed = importSynced(remote);
    setStatus({ state: 'saved', at: Date.now() });
    return changed;
  } catch (e) {
    setStatus({ state: 'error', error: e.message });
    return [];
  }
}

export function startSync() {
  onSave(pushSoon);
  // Phones kill backgrounded tabs without warning: flush when the app is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) push();
  });
  addEventListener('online', () => currentUser() && push());
}
