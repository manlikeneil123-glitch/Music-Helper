// Every vibration goes through here, so the setting and the fallbacks live in one place.
// Android browsers vibrate (pulses under ~20 ms often don't move the motor). iPhone
// browsers have no vibration at all, so we say so in Settings rather than fake it.
const KEY = 'stave:haptics';
const PATTERNS = { selection: 20, light: 22, success: [24, 60, 32], error: [40, 50, 40] };

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function hapticsOn() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setHaptics(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
  if (on) tap('success');
}

/** What this device can do, in words for Settings. */
export const hapticsSupport = () => (canVibrate() ? 'Vibration' : 'Not available on this device (iPhone browsers can’t vibrate)');

/** A meaningful moment: a selection changed, something finished, a right or wrong answer. */
export function tap(kind = 'light') {
  if (!hapticsOn() || !canVibrate()) return;
  try { navigator.vibrate(PATTERNS[kind] ?? PATTERNS.light); } catch { /* blocked until a user gesture */ }
}
