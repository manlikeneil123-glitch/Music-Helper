// Merge rules for syncing progress between devices, and the teacher summary.
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
globalThis.document = { addEventListener() {} };
const { save, load, exportSynced, importSynced, clearSynced, setDataOwner, dataOwner } = await import('../app/js/store.js');
const { summarise } = await import('../app/js/sync.js');

let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };

// Device-only keys never leave the phone.
save('micTuning', { right: [0.2], wrong: [] });
save('tab', 'play');
save('goal', 30);
const out = exportSynced();
ok(!('micTuning' in out) && !('tab' in out), 'device-only settings are not synced');
ok(out.goal.v === 30 && out.goal.t > 0, 'synced keys carry value and time');

// Newer remote wins for plain values; older remote loses.
ok(importSynced({ goal: { v: 45, t: out.goal.t + 1000 } }).includes('goal') && load('goal') === 45, 'newer remote value wins');
ok(importSynced({ goal: { v: 10, t: 1 } }).length === 0 && load('goal') === 45, 'older remote value is ignored');

// Sessions from two phones are combined, not overwritten.
save('sessions', [{ day: '2026-10-28', start: 1000, ms: 60000 }]);
importSynced({ sessions: { v: [{ day: '2026-10-28', start: 1000, ms: 60000 }, { day: '2026-10-29', start: 5000, ms: 120000 }], t: 1 } });
ok(load('sessions').length === 2, 'sessions merge as a union without duplicates');

// Checks merge too, and flashcards keep the more-practised copy of each card.
save('checks', [{ pieceId: 'a', at: 1, score: 50 }]);
importSynced({ checks: { v: [{ pieceId: 'b', at: 2, score: 90 }], t: 1 } });
ok(load('checks').map((c) => c.pieceId).join() === 'a,b', 'checks merge in time order');
save('cards', { c4: { box: 1, seen: 3 }, d4: { box: 4, seen: 9 } });
importSynced({ cards: { v: { c4: { box: 3, seen: 8 }, d4: { box: 0, seen: 2 }, e4: { box: 1, seen: 1 } }, t: 1 } });
const cards = load('cards');
ok(cards.c4.box === 3 && cards.d4.box === 4 && cards.e4, 'cards keep whichever copy was practised more');

// Remote device-only keys are refused even if a server sends them.
importSynced({ micTuning: { v: { right: [], wrong: [0.9] }, t: Date.now() + 1e6 } });
ok(load('micTuning').right[0] === 0.2, 'remote cannot overwrite device-only settings');

// Fresh device takes everything.
clearSynced();
ok(load('goal') === undefined && load('micTuning').right[0] === 0.2, 'sign-out clears progress but keeps device settings');
importSynced({ goal: { v: 20, t: 5 }, profile: { v: { level: 'Grade 2 – 3' }, t: 5 } });
ok(load('goal') === 20 && load('profile').level === 'Grade 2 – 3', 'empty device adopts the account');
setDataOwner('u1');
ok(dataOwner() === 'u1', 'data owner is remembered');

// Teacher summary.
const now = new Date('2026-10-29T18:00:00');
const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() - offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const s = summarise({
  sessions: { v: [0, 1, 2, 9].map((o) => ({ day: day(o), start: o, ms: 600000 })) },
  checks: { v: [{ pieceId: 'p', at: 1, score: 60 }, { pieceId: 'p', at: 2, score: 88, ready: true, worstBar: 4 }] },
  cards: { v: { a: { box: 3 }, b: { box: 1 } } },
  profile: { v: { level: 'Grade 4 and above', board: 'Trinity' } },
}, { p: 'Minuet' }, now);
ok(s.streak === 3, 'streak counts consecutive days');
ok(s.week === 30 && s.days.length === 14, 'week minutes from the last 7 days only');
ok(s.notesKnown === 1, 'notes known counts box 3+');
ok(s.recent[0].score === 88 && s.recent[0].title === 'Minuet' && s.recent[0].worstBar === 4, 'recent checks newest first, titled');
ok(s.pieces[0].best === 88 && s.pieces[0].ready && s.pieces[0].runs === 2, 'per-piece best and ready');
ok(s.board === 'Trinity', 'board passed through');

console.log(`sync: ${n} checks passed`);
