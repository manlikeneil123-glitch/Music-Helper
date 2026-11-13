// Practice-quality streak: a day counts when something got better (a clean run, a bar
// fixed in a drill, or 20 notes read right), not when a timer ran. Minutes are easy
// to game and say nothing about whether practice worked.
import { load, save, dayKey } from './store.js';

const KEY = 'quality'; // { 'YYYY-MM-DD': { clean, bars, cards } }
const CARDS_FOR_A_DAY = 20;
const listeners = new Set();

export function onQualityChange(fn) {
  listeners.add(fn);
}

/** kind: 'clean' (a run scoring 85+), 'bars' (a drill finished), 'cards' (a right answer). */
export function logWin(kind, day = dayKey()) {
  const all = load(KEY, {});
  const d = (all[day] ??= { clean: 0, bars: 0, cards: 0 });
  d[kind] = (d[kind] ?? 0) + 1;
  save(KEY, all);
  listeners.forEach((fn) => fn());
}

export const isQualityDay = (d) => Boolean(d && (d.clean > 0 || d.bars > 0 || d.cards >= CARDS_FOR_A_DAY));

export function qualityOn(day, all = load(KEY, {})) {
  return all[day] ?? { clean: 0, bars: 0, cards: 0 };
}

// Fair and kind: one rest day in any seven doesn't break the streak (it just doesn't
// add to it). On top of that, streak freezes (like the learning apps): 2 to start and
// 1 more for every 30 days of streak; each covers one other missed day automatically.
const REST_EVERY = 7;
const FREEZES = 2;
const EARN_EVERY = 30;

/**
 * The current streak, ending today (or yesterday, if today isn't done yet).
 * Returns { days, freezesUsed, freezesLeft }: worked out from the practice days alone,
 * so it needs no stored state and agrees on every device.
 */
export function streakInfo(all = load(KEY, {}), now = new Date()) {
  const d = new Date(now);
  // Today not done yet: the streak is still alive, so start from yesterday, which may be the rest day.
  const pending = !isQualityDay(all[dayKey(d)]);
  if (pending) d.setDate(d.getDate() - 1);
  let n = 0;
  let used = 0; // freezes spent on gaps that have practice before them
  let gap = 0; // freezes spent since the last practice day found (count only if more practice follows)
  let lastRest = -Infinity; // days back from the start of the walk
  const allowed = () => FREEZES + Math.floor(n / EARN_EVERY);
  for (let back = 0; back < 3700; back++, d.setDate(d.getDate() - 1)) {
    if (isQualityDay(all[dayKey(d)])) { n++; used += gap; gap = 0; continue; }
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    // A rest day needs a quality day either side and no other rest within a week.
    if (!gap && (n > 0 || (pending && back === 0)) && isQualityDay(all[dayKey(prev)]) && back - lastRest >= REST_EVERY) { lastRest = back; continue; }
    if ((n > 0 || pending) && used + gap < allowed()) { gap++; continue; }
    break;
  }
  return { days: n, freezesUsed: used, freezesLeft: Math.max(0, FREEZES + Math.floor(n / EARN_EVERY) - used) };
}

/** Quality days in the current streak. */
export const qualityStreak = (all, now) => streakInfo(all, now).days;

export function qualityWeek(all = load(KEY, {}), now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return isQualityDay(all[dayKey(d)]);
  });
}

export const CARDS_TARGET = CARDS_FOR_A_DAY;
