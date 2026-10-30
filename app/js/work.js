// Pure rules for teacher-set work: when a take completes it, assignment links, and
// lesson-day arithmetic. No DOM or storage, so tests can call them directly.

/** Did this take complete the assignment? Pure, so it can be tested. */
export function completes(a, take) {
  if (take.pieceId !== a.piece_id) return false;
  const fastEnough = (bpm) => !a.target_bpm || bpm >= a.target_bpm * 0.95;
  if (a.from_bar) {
    const to = a.to_bar ?? a.from_bar;
    if (take.section) return take.secure && take.section.from <= a.from_bar && take.section.to >= to && fastEnough(take.bpm);
    const errorsInRange = Object.entries(take.barErrors ?? {}).some(([bar, n]) => n > 0 && bar >= a.from_bar && bar <= to);
    return (take.hands ?? 'both') === 'both' && take.score >= 85 && !errorsInRange && fastEnough(take.playedBpm);
  }
  return !take.section && (take.hands ?? 'both') === 'both' && take.score >= 85 && fastEnough(take.playedBpm);
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** a: { title, piece_id, from_bar, to_bar, target_bpm, strictness, due, note, from } */
export function assignmentLink(a, base = `${globalThis.location?.origin ?? ''}${globalThis.location?.pathname ?? '/'}`) {
  const keep = Object.fromEntries(Object.entries(a).filter(([, v]) => v != null && v !== ''));
  return `${base}#assign=${b64(JSON.stringify(keep))}`;
}

export function readAssignmentLink(hash) {
  const m = /#assign=([\w-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const a = JSON.parse(unb64(m[1]));
    if (typeof a.title !== 'string' || typeof a.piece_id !== 'string') return null;
    const n = (v, lo, hi) => (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : null);
    return {
      id: `link:${m[1].slice(0, 40)}`,
      source: 'link',
      title: a.title.slice(0, 120),
      piece_id: a.piece_id.slice(0, 80),
      from_bar: n(a.from_bar, 1, 999),
      to_bar: n(a.to_bar, 1, 999),
      target_bpm: n(a.target_bpm, 20, 300),
      strictness: ['gentle', 'standard', 'exam'].includes(a.strictness) ? a.strictness : null,
      due: /^\d{4}-\d{2}-\d{2}$/.test(a.due ?? '') ? a.due : null,
      note: typeof a.note === 'string' ? a.note.slice(0, 500) : null,
      from: typeof a.from === 'string' ? a.from.slice(0, 40) : null,
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ---- Lesson day (C8) ---------------------------------------------------------------------
/** Days until the next lesson (0 = today), from the weekday in the profile. */
export function daysToLesson(lessonDay, now = new Date()) {
  if (lessonDay == null || lessonDay === '') return null;
  return (Number(lessonDay) - now.getDay() + 7) % 7;
}

