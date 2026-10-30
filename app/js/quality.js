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
// add to it). Two missed days in a row, or two rest days within a week, do.
const REST_EVERY = 7;

/** Quality days in the current streak, ending today (or yesterday, if today isn't done yet). */
export function qualityStreak(all = load(KEY, {}), now = new Date()) {
  const d = new Date(now);
  if (!isQualityDay(all[dayKey(d)])) d.setDate(d.getDate() - 1);
  let n = 0;
  let lastRest = -Infinity; // days back from the start of the walk
  for (let back = 0; ; back++, d.setDate(d.getDate() - 1)) {
    if (isQualityDay(all[dayKey(d)])) { n++; continue; }
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    // A rest day needs a quality day either side and no other rest within a week.
    if (n > 0 && isQualityDay(all[dayKey(prev)]) && back - lastRest >= REST_EVERY) { lastRest = back; continue; }
    return n;
  }
}

export function qualityWeek(all = load(KEY, {}), now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return isQualityDay(all[dayKey(d)]);
  });
}

export const CARDS_TARGET = CARDS_FOR_A_DAY;
