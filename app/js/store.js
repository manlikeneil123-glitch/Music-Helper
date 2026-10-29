// Tiny persistence layer. Everything lives on-device for the prototype;
// a real build would sync this to a backend so teachers can see it.
const PREFIX = 'mh:v1:';

export function load(name, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(name, value) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — the app still works in memory.
  }
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
