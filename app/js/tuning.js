// Per-user mic tuning. When a student says "the app got that note wrong", we keep the
// evidence the mic had for that note and move this device's "note is present" bar to
// fit it. Bounded, so a few bad taps can't break checking, and biased towards strict:
// letting real mistakes through is worse than an occasional false alarm.
import { load, save } from './store.js';
import { THRESHOLDS } from './micanalysis.js';

const KEY = 'micTuning';
const KEEP = 40; // corrections kept per kind
const MIN_RIGHT = 3; // "it was right" reports needed before loosening
const MIN_WRONG = 2; // "it was wrong" reports needed before tightening
const LOWEST = 0.18; // never accept a note on less evidence than this
const HIGHEST = 0.42; // never demand more than this
const NOTHING_HEARD = 0.06; // below this the mic heard nothing: don't learn from it

const state = () => load(KEY, { right: [], wrong: [] });

function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** The thresholds analyseAudio/liveCheck should use on this device. */
export function micThresholds() {
  const { right, wrong } = state();
  let present = THRESHOLDS.present;
  // Notes the student says were right: lower the bar to just under most of them.
  if (right.length >= MIN_RIGHT) present = Math.min(present, Math.max(LOWEST, quantile(right, 0.2) * 0.95));
  // Notes the student says were wrong but passed: raise the bar above them. Applied
  // last, so when the two disagree the stricter one wins.
  if (wrong.length >= MIN_WRONG) present = Math.max(present, Math.min(HIGHEST, quantile(wrong, 0.8) * 1.05));
  const f = present / THRESHOLDS.present;
  return {
    ...THRESHOLDS,
    present,
    absent: THRESHOLDS.absent * Math.min(1, f),
    // A looser bar for the written note means a wrong neighbour must be clearer to win.
    wrongNeighbour: THRESHOLDS.wrongNeighbour / Math.min(1, f),
    wrongRatio: THRESHOLDS.wrongRatio / f,
  };
}

/**
 * kind: 'right' (app flagged it, student played it) or 'wrong' (app passed it, student
 * didn't). presence: the mic's evidence for that note. Returns false when there's
 * nothing to learn from (the mic heard nothing there).
 */
export function reportVerdict(kind, presence) {
  if (kind === 'right' && presence < NOTHING_HEARD) return false;
  const s = state();
  s[kind] = [...s[kind], Math.round(presence * 1000) / 1000].slice(-KEEP);
  save(KEY, s);
  return true;
}

export function resetTuning() {
  save(KEY, { right: [], wrong: [] });
}

export function describeTuning() {
  const { right, wrong } = state();
  const n = right.length + wrong.length;
  if (!n) return 'Not tuned to you yet. After a mic check, tell the app when it got a note wrong.';
  const p = micThresholds().present;
  const d = Math.round((p / THRESHOLDS.present - 1) * 100);
  const how = d === 0 ? 'standard sensitivity' : d < 0 ? `${-d}% more forgiving than standard` : `${d}% stricter than standard`;
  const waiting = right.length < MIN_RIGHT && wrong.length < MIN_WRONG ? ' (needs a few more before it changes anything)' : '';
  return `Tuned from ${n} correction${n > 1 ? 's' : ''}: ${how}${waiting}.`;
}
