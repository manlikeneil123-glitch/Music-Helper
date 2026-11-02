// Age on this device, kept apart so screens can ask without importing all of account.js.

// The birth month and year are asked once per device: a second visit shows the first
// answer, so the question can't be retried with a different year.
export function bornOnDevice() {
  try {
    return localStorage.getItem('stave:born') || document.cookie.match(/(?:^|; )stave_born=(\d{4}-\d{2})/)?.[1] || '';
  } catch {
    return '';
  }
}
/** Same rule as the server: under 13 until the end of the birth month 13 years on. */
export function under13(born, now = new Date()) {
  const [y, m] = born.split('-').map(Number);
  return new Date(y + 13, m, 0, 23, 59, 59) > now;
}
