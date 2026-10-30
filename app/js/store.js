// Tiny persistence layer. Everything lives on-device first; when the student has an
// account, sync.js copies the synced keys to the server and back.
const PREFIX = 'mh:v1:';
const STAMPS = 'mh:meta:stamps'; // name -> last local change (ms), for merging with the server

// Per-device settings that make no sense on another phone (a mic's tuning, the
// open tab, a running timer) stay local.
const LOCAL_ONLY = new Set(['tab', 'inputMode', 'micCal', 'micTuning', 'timer']);
const listeners = new Set();

export function load(name, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function stamps() {
  try {
    return JSON.parse(localStorage.getItem(STAMPS)) ?? {};
  } catch {
    return {};
  }
}

function write(name, value, at) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(value));
    const s = stamps();
    s[name] = at;
    localStorage.setItem(STAMPS, JSON.stringify(s));
  } catch {
    // Storage full or blocked (private mode) — the app still works in memory.
  }
}

export function save(name, value) {
  write(name, value, Date.now());
  if (!LOCAL_ONLY.has(name)) listeners.forEach((fn) => fn(name));
}

/** Called after every save of a synced key. */
export function onSave(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Everything that syncs, as { name: { v, t } }. */
export function exportSynced() {
  const out = {};
  const s = stamps();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith(PREFIX)) continue;
      const name = key.slice(PREFIX.length);
      if (LOCAL_ONLY.has(name)) continue;
      out[name] = { v: JSON.parse(localStorage.getItem(key)), t: s[name] ?? 0 };
    }
  } catch {
    // Unreadable storage: sync whatever we got.
  }
  return out;
}

// Practice logs, check history and flashcard boxes can all grow on two phones at
// once, so they merge instead of the newer copy winning outright.
const MERGE = {
  sessions: (a, b) => unionBy([...a, ...b], (x) => `${x.start}|${x.ms}`).sort((x, y) => x.start - y.start),
  checks: (a, b) => unionBy([...a, ...b], (x) => `${x.at}|${x.pieceId}`).sort((x, y) => x.at - y.at).slice(-300),
  quality: (a, b) => {
    const out = { ...a };
    for (const [day, d] of Object.entries(b)) {
      const o = out[day] ?? {};
      out[day] = Object.fromEntries(['clean', 'bars', 'cards'].map((k) => [k, Math.max(o[k] ?? 0, d[k] ?? 0)]));
    }
    return out;
  },
  cards: (a, b) => {
    const out = { ...a };
    for (const [id, card] of Object.entries(b)) if (!out[id] || (card.seen ?? 0) > (out[id].seen ?? 0)) out[id] = card;
    return out;
  },
};

function unionBy(items, keyOf) {
  const seen = new Map();
  for (const x of items) if (x && !seen.has(keyOf(x))) seen.set(keyOf(x), x);
  return [...seen.values()];
}

/**
 * Merge the server's copy into this device. Returns the names that changed here,
 * so the caller can redraw (or reload, since modules read storage at start-up).
 */
export function importSynced(remote) {
  const changed = [];
  const s = stamps();
  for (const [name, entry] of Object.entries(remote ?? {})) {
    if (LOCAL_ONLY.has(name) || !entry || !('v' in entry)) continue;
    const local = load(name, undefined);
    let next;
    let at;
    if (local === undefined) [next, at] = [entry.v, entry.t];
    else if (MERGE[name] && typeof local === 'object' && typeof entry.v === 'object') {
      next = MERGE[name](local, entry.v);
      at = Math.max(s[name] ?? 0, entry.t ?? 0);
    } else if ((entry.t ?? 0) > (s[name] ?? 0)) [next, at] = [entry.v, entry.t];
    else continue;
    if (JSON.stringify(next) === JSON.stringify(local)) continue;
    write(name, next, at);
    changed.push(name);
  }
  return changed;
}

/** Forget this device's synced progress (sign-out on a shared phone). Device settings stay. */
export function clearSynced() {
  try {
    const names = Object.keys(exportSynced());
    names.forEach((name) => localStorage.removeItem(PREFIX + name));
    localStorage.removeItem(STAMPS);
  } catch {
    // Nothing to clear.
  }
}

// Which account the progress on this device belongs to, so signing in as someone
// else on a shared iPad never merges two students together.
const OWNER = 'mh:meta:owner';
export const dataOwner = () => {
  try {
    return localStorage.getItem(OWNER);
  } catch {
    return null;
  }
};
export function setDataOwner(id) {
  try {
    if (id) localStorage.setItem(OWNER, id);
    else localStorage.removeItem(OWNER);
  } catch {
    // Private mode.
  }
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
