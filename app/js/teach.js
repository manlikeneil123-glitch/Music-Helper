// The student's side of having a teacher: work they set (from the studio, or from an
// assignment link for teachers without accounts), scores they shared, takes sent to
// them, and a read-only link for a parent.
import { load, save, dayKey } from './store.js';
import { cloudReady, currentUser, rest, rpc } from './cloud.js';
import { setTeacherScores, onTakeDone } from './check.js';
import { completes, assignmentLink, readAssignmentLink, daysToLesson } from './work.js';

export { completes, assignmentLink, readAssignmentLink, daysToLesson };

const listeners = new Set();
export const onTeachChange = (fn) => listeners.add(fn);
const changed = () => listeners.forEach((fn) => fn());

// ---- Assignments ------------------------------------------------------------------------
// Server rows look like { id, title, piece_id, from_bar, to_bar, target_bpm, strictness,
// due, note, created_at }. Link assignments use the same shape with source: 'link'.
const cached = () => load('teacherWork', { assignments: [], scores: [], at: 0 });
const doneMap = () => load('assignmentDone', {});

export function assignments() {
  const done = doneMap();
  const all = [...cached().assignments, ...load('linkAssignments', [])];
  return all
    .map((a) => ({ ...a, doneAt: done[a.id] ?? null }))
    .sort((a, b) => Boolean(a.doneAt) - Boolean(b.doneAt) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
}

export const openAssignments = () => assignments().filter((a) => !a.doneAt);

export function markDone(id, done = true) {
  const m = doneMap();
  if (done) m[id] = Date.now();
  else delete m[id];
  save('assignmentDone', m);
  changed();
}

onTakeDone((take) => {
  const hits = openAssignments().filter((a) => completes(a, take));
  hits.forEach((a) => markDone(a.id));
});

// ---- From the server (when in a studio) --------------------------------------------------
export async function refreshTeacherWork() {
  if (!cloudReady() || !currentUser()) return;
  const me = await rpc('me').catch(() => null);
  if (!me?.studio || me.role !== 'student') {
    if (cached().assignments.length || cached().scores.length) save('teacherWork', { assignments: [], scores: [], at: Date.now() });
    setTeacherScores([]);
    return changed();
  }
  const [rows, scores] = await Promise.all([
    rest('assignments?select=id,title,piece_id,from_bar,to_bar,target_bpm,strictness,due,note,created_at&order=created_at.desc&limit=50'),
    rest('shared_scores?select=id,title,musicxml&order=created_at.desc&limit=20'),
  ]);
  save('teacherWork', { assignments: rows ?? [], scores: scores ?? [], teacher: me.studio.teacher, at: Date.now() });
  setTeacherScores(scores ?? []);
  changed();
}

/** Shared scores from the last fetch, so they're there offline too. */
export function restoreTeacherScores() {
  setTeacherScores(cached().scores ?? []);
}

export const teacherName = () => cached().teacher ?? null;

// ---- Assignment links (teachers without accounts) ----------------------------------------
/** Opened an assignment link: keep it. Returns the assignment, or null. */
export function acceptAssignmentLink(hash) {
  const a = readAssignmentLink(hash);
  if (!a) return null;
  const list = load('linkAssignments', []).filter((x) => x.id !== a.id);
  save('linkAssignments', [a, ...list].slice(0, 30));
  changed();
  return a;
}

export function removeLinkAssignment(id) {
  save('linkAssignments', load('linkAssignments', []).filter((x) => x.id !== id));
  changed();
}

// ---- Sending a take to the teacher ------------------------------------------------------
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

/** take: { title, kind: 'audio', blob, seconds, score } or { title, kind: 'notes', notes, seconds, score } */
export async function sendTake(take) {
  const me = await rpc('me');
  if (!me?.studio) throw new Error('Join your teacher\'s studio first (Account page).');
  const data = take.kind === 'audio' ? await blobToBase64(take.blob) : JSON.stringify(take.notes);
  if (data.length > 1_900_000) throw new Error('That take is too long to send (about 6 minutes is the limit).');
  await rest('recordings', {
    method: 'POST',
    body: { studio_id: me.studio.id, title: take.title.slice(0, 160), kind: take.kind, mime: take.blob?.type ?? null, data, seconds: Math.round(take.seconds ?? 0), score: take.score ?? null },
    headers: { Prefer: 'return=minimal' },
  });
}

export const myRecordings = () => rest('recordings?select=id,title,kind,seconds,score,teacher_note,created_at&order=created_at.desc&limit=20');

// ---- Parent link ------------------------------------------------------------------------
export const parentUrl = (token) => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}parent.html#t=${token}`;
export const hasParentLink = () => rpc('has_parent_link');
export const makeParentLink = async () => parentUrl(await rpc('create_parent_link'));
export const revokeParentLink = () => rpc('revoke_parent_link');

export const todayKey = () => dayKey();
