// "Perform": pick a piece, hear it, then either
//   Perform — play it through with a count-in and get teacher-style feedback, or
//   Learn   — the app waits on each note/chord until you find it.
// Input is a MIDI/on-screen keyboard or, for acoustic pianos, the microphone.
// Bar drills loop the weakest bar until it's clean 3 times in a row; the tempo is
// locked at the speed you've earned so mistakes don't get practised in at speed.
import { PIECES } from './pieces.js';
import { normalize, timeline, totalBeats, excerpt, density, barMap, barCount as barsIn } from './score.js';
import { renderScore } from './render.js';
import { readScoreFile, parseMusicXML } from './musicxml.js';
import { analyse, STRICTNESS, guessBeatMs, locatePart } from './analysis.js';
import { analyseAudio, firstOnsetSec, encodeWav, liveCheck } from './micanalysis.js';
import { audio, click, scheduleNote, ctxToPerf, stopScheduled } from './audio.js';
import { onNote, onStatus } from './input.js';
import { micThresholds, reportVerdict, resetTuning, describeTuning } from './tuning.js';
import { micSupported, openMic, startRecording, calibration } from './mic.js';
import { openMicSetup, micSummary, micVerdict } from './micsetup.js';
import { midiName } from './music.js';
import { load, save } from './store.js';
import { setBackgroundPaused } from './background.js';
import { ICONS } from './icons.js';
import { logWin } from './quality.js';
import { dayKey } from './store.js';
import { tap } from './haptics.js';
import { openScan } from './scan.js';
import { examMark, markingBoard, BAND_NAME, bandTone, bestMark } from './marking.js';
import { celebrate } from './celebrate.js';
import { expressivePlan } from './expressive.js';


const COUNT_IN = 4;
const DRILL_STREAK = 3;
const ADD_STREAK = 2; // clean runs before "add a bar" grows the section
const MAX_IMPORTS = 6;
const STATUS_COLOR = { correct: 'good', wrong: 'bad', missed: 'miss', early: 'warn', late: 'warn', unclear: 'unclear' };

let root;
// Built-in music isn't offered to students (owner decision): the C major scale is kept
// for the warm-up check, the rest only for the microphone test kit and the tests.
const WARMUP = 'c-scale';
let library = PIECES.map(normalize);
let emptyMode = false; // no pieces of the student's own yet
let imported = load('imports', []).map(normalize);
let base = library[0]; // the piece as chosen
let piece = base; // what's being played now (hand filter / drill excerpt applied)
let rec = null; // active Perform take
let learn = null; // active Learn session
let drill = null; // { from, to, end, kind: 'loop' | 'add', streak, runs, bpm }
let history = load('checks', []); // [{ pieceId, hands, at, score, ready, bpm, playedBpm, worstBar, input, barErrors, keptGoing, pulse }]
let lastResult = null;
let lastTake = null; // last mic take, for the test lab
let lastNotes = null; // last keys/MIDI take: { events, seconds }, for sending to the teacher
let sendHook = null; // set by app.js: (take) => Promise, when a teacher can receive takes
let lastMic = null; // { args, evidence, record, reported } of the last mic analysis, to re-run after a correction
let scoreView = null; // renderScore() output
let mode = load('inputMode', 'mic'); // 'mic' | 'keys' (a MIDI keyboard, or computer keys A–K)
let practice = load('practiceMode', 'perform'); // 'perform' | 'learn'
let layout = load('scoreLayout', 'scroll'); // 'scroll' | 'page'
let hands = 'both';
let strictness = load('profile', null)?.strictness ?? 'standard';
let tempoUnlocked = false;
let readAhead = load('readAhead', false); // hide each bar as you reach it
let examMode = load('examConditions', false); // no metronome, no beat light
let midiStatus = null;
const changeListeners = new Set();

export function onChecksChange(fn) {
  changeListeners.add(fn);
}
export const checkHistory = () => history;
let fromTeacher = []; // scores the teacher shared with their studio
/** The student's pieces: their imports and their teacher's shared scores. */
export const allPieces = () => [...fromTeacher, ...imported];
/** Any piece by id, including the hidden built-ins (warm-up, test kit, old history). */
export const findPiece = (id) => allPieces().find((p) => p.id === id) ?? library.find((p) => p.id === id);
export const pieceTitle = (id) => findPiece(id)?.title ?? 'A removed piece';
/** Everything, hidden built-ins included: for titles of old checks. */
export const everyPiece = () => [...library, ...allPieces()];

/** Scores shared by the teacher: [{ id, title, musicxml }]. Bad files are skipped. */
export function setTeacherScores(list) {
  fromTeacher = list.flatMap((x) => {
    try {
      return [normalize({ ...parseMusicXML(x.musicxml, { id: `teacher:${x.id}` }), title: x.title, level: 'From your teacher' })];
    } catch {
      return [];
    }
  });
  if (!root) return;
  fillPieceSelect();
  if (emptyMode && fromTeacher.length && !rec && !learn) selectPiece(fromTeacher[0].id);
  if (load('checkPiece', null)?.startsWith('teacher:') && !rec && !learn) selectPiece(load('checkPiece', null));
  changeListeners.forEach((fn) => fn());
}

// Assignments tick themselves off from what happens here.
const takeListeners = new Set();
export const onTakeDone = (fn) => takeListeners.add(fn);
/** fn(take) → Promise, or null when there's no teacher to send to. */
export const setSendTake = (fn) => (sendHook = fn);
let shareHook = null;
let kitHook = null;
export const setOpenKit = (fn) => (kitHook = fn);
export const setShareSection = (fn) => (shareHook = fn);
const tellTake = (info) => takeListeners.forEach((fn) => fn(info));

/** Open a teacher's assignment: the piece, its strictness, and its bars at its tempo. */
export function practiseAssignment(a) {
  if (rec || learn) return false;
  if (drill) endDrill(false);
  if (!allPieces().some((p) => p.id === a.piece_id)) return false;
  selectPiece(a.piece_id);
  if (a.strictness) {
    strictness = a.strictness;
    $('#check-strict').value = strictness;
  }
  practice = 'perform';
  syncPracticeButtons();
  if (a.from_bar) {
    startDrill(a.from_bar, a.to_bar ?? a.from_bar, 'loop', { bpm: a.target_bpm });
  } else if (a.target_bpm) {
    tempoUnlocked = true;
    updateTempoLock();
    $('#check-bpm').value = a.target_bpm;
    updateBpmLabel();
    setStatus(`Your teacher set ${a.target_bpm} bpm. Press Start when you're ready.`, '');
  }
  return true;
}

// The exam page runs single takes here (mock exam, sight-reading) and wants the result.
let pendingTake = null;
/** Select a piece and start one Perform take; onDone(result, entry) when it's analysed. */
export function performPiece(pieceId, { exam = true, bpm: tempo = null, onDone = null } = {}) {
  if (rec || learn) return false;
  if (drill) endDrill(false);
  selectPiece(pieceId, { hidden: true });
  practice = 'perform';
  syncPracticeButtons();
  examMode = exam;
  $('#check-exam').checked = exam;
  if (tempo) {
    // A mock exam is at the real tempo: there's no tempo lock in the exam room.
    tempoUnlocked = true;
    updateTempoLock();
    $('#check-bpm').value = tempo;
    updateBpmLabel();
  }
  pendingTake = onDone;
  setTimeout(() => !rec && start(), 700);
  return true;
}

const bpm = () => Number(root.querySelector('#check-bpm').value);
const $ = (sel) => root.querySelector(sel);
const tone = (score) => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');

// ---- Which notes are being practised ----------------------------------------------
function applyHands(score, which) {
  if (which === 'both' || score.staves < 2) return score;
  const staff = which === 'rh' ? 1 : 2;
  return { ...score, id: `${score.id}:${which}`, notes: score.notes.filter((n) => (n.staff ?? 1) === staff), _normalized: true };
}

function refreshPiece() {
  let p = base;
  if (drill) p = excerpt(p, drill.from, drill.to);
  piece = applyHands(p, hands);
  lastResult = null;
  drawScore();
}

// ---- Score display ------------------------------------------------------------------
function drawScore(result = lastResult) {
  const box = $('#check-score');
  const colours = new Map();
  if (result) for (const n of result.notes) colours.set(`${n.beat + (result.part?.offset ?? 0)}|${n.midi}|${n.staff ?? 1}`, STATUS_COLOR[n.status]);
  const shown = drill ? excerpt(base, drill.from, drill.to) : base;
  const inSheet = freeTempo(); // the sheet shows whole lines, like a page
  scoreView = renderScore(shown, {
    mode: inSheet ? 'page' : layout,
    width: box.clientWidth || 600,
    statusOf: result ? (n) => colours.get(`${n.beat}|${n.midi}|${n.staff ?? 1}`) ?? null : null,
    dimStaff: hands === 'rh' ? 2 : hands === 'lh' ? 1 : null,
  });
  box.classList.toggle('page', inSheet || layout === 'page');
  box.replaceChildren(...scoreView.systems.map((s) => s.svg));
  // Perform: the student reads from their printed book; the music here lives in the sheet
  // ("Look at the music"), not on the page. Learn and bar practice keep it on the page.
  const home = freeTempo() ? $('#ss-body') : $('#score-home');
  if (box.parentElement !== home) home.append(box);
  $('#score-home').hidden = freeTempo();
  renderHeat();
}

function moveCursor(beat) {
  if (!scoreView) return;
  const at = scoreView.setCursor(beat);
  if (!at) return;
  const box = $('#check-score');
  if (layout === 'scroll') box.scrollLeft = Math.max(0, at.x - box.clientWidth / 3);
  else {
    const svg = scoreView.systems[at.system].svg;
    const top = svg.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (top < box.scrollTop || top + svg.clientHeight > box.scrollTop + box.clientHeight) box.scrollTop = top - 8;
  }
}

// Hear it / Play in the score sheet: one playback at a time, stoppable.
let playing = null;
function togglePlay() {
  if (playing) {
    clearTimeout(playing);
    playing = null;
    stopScheduled();
  } else {
    const p = listen();
    if (p) playing = setTimeout(() => { playing = null; playLabels(); }, (p.end - audio().currentTime) * 1000);
  }
  playLabels();
}
function playLabels() {
  $('#ss-play').innerHTML = playing ? 'Stop' : `${ICONS.play} Play`;
  $('#check-listen').innerHTML = playing
    ? '<b class="plus-glyph" aria-hidden="true">■</b><span><b>Stop playing</b><small>Tap to stop</small></span>'
    : `${ICONS.play}<span><b>Hear the piece</b><small>How it should sound</small></span>`;
}

function listen() {
  if (rec || learn) return null;
  const ac = audio();
  const tempo = freeTempo() ? base.targetBpm : bpm();
  const start = ac.currentTime + 0.15;
  const plan = expressivePlan(piece, tempo);
  for (const n of plan) scheduleNote(n.midi, start + n.at, n.dur, n.vel);
  return { start, end: start + Math.max(...plan.map((n) => n.at + n.dur)), spb: 60 / tempo };
}

function animateCursor(t0, msPerBeat, done, cancelled = () => false) {
  const end = t0 + totalBeats(piece) * msPerBeat;
  const tl = timeline(piece);
  const pulse = $('#check-pulse');
  let lastIdx = -2;
  let lastBeat = null;
  let hiddenTo = 0;
  const frame = () => {
    const now = performance.now();
    if (now > end || cancelled()) {
      pulse.classList.remove('on', 'accent');
      return done?.();
    }
    const beat = (now - t0) / msPerBeat;
    // Read-ahead: the bar you're in disappears, so your eyes have to be on the next one.
    if (readAhead && rec && beat >= 0) {
      const map = barMap(piece);
      const barEnd = map.starts[Math.min(map.count, map.indexAt(beat) + 1)];
      if (barEnd !== hiddenTo) scoreView?.hideThrough((hiddenTo = barEnd));
    }
    // Visual metronome: the mic should hear only the piano, so the beat is shown, not clicked.
    const whole = Math.floor(beat);
    if (whole !== lastBeat && !(examMode && rec && beat >= 0)) {
      lastBeat = whole;
      pulse.classList.remove('on', 'accent');
      void pulse.offsetWidth;
      pulse.classList.add('on');
      if (whole >= 0 && barMap(piece).starts.includes(whole)) pulse.classList.add('accent');
    }
    // Snap the cursor to the current note, like a page-turner following along.
    const idx = beat < 0 ? -1 : tl.findLastIndex((n) => n.beat <= beat);
    if (idx !== lastIdx) {
      lastIdx = idx;
      moveCursor(idx >= 0 ? tl[idx].beat : null);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---- Perform ------------------------------------------------------------------------
async function start() {
  if (practice === 'learn') return learn ? stopLearn(true) : startLearn();
  if (rec) return stop();
  keepAwake(true);
  let recorder = null;
  if (mode === 'mic') {
    try {
      await openMic();
    } catch {
      setStatus('Microphone access was blocked. Allow the microphone for this site in your browser settings, or use a MIDI keyboard (Options).', 'bad');
      return;
    }
    // Free up the phone's CPU/GPU for audio while recording.
    setBackgroundPaused(true);
    recorder = startRecording({ onLevel: showLevel });
  }
  if (freeTempo()) return startFree(recorder);
  const ac = audio();
  const spb = 60 / bpm();
  const begin = ac.currentTime + 0.25;
  const metronome = $('#check-metro').checked && !examMode;
  const beats = totalBeats(piece);
  for (let b = 0; b < COUNT_IN; b++) click(begin + b * spb, b === 0);
  const downbeats = new Set(barMap(piece).starts);
  if (metronome) for (let b = 0; b < beats; b++) click(begin + (COUNT_IN + b) * spb, downbeats.has(b));

  const beat0Ctx = begin + COUNT_IN * spb;
  const t0 = ctxToPerf(beat0Ctx);
  const msPerBeat = spb * 1000;
  rec = { t0, beat0Ctx, msPerBeat, events: [], open: new Map(), pedal: [], pedalDown: null, sawPedal: false, source: null, cancelled: false, recorder };
  setStatus('Count-in: 1 2 3 4', 'warn');
  setStartLabel(true);
  $('#check-result').hidden = true;

  setTimeout(() => rec && setStatus(mode === 'mic' ? 'Play! Listening.' : 'Play!', 'good'), (beat0Ctx - ac.currentTime) * 1000 - 50);
  const session = rec;
  animateCursor(t0, msPerBeat, null, () => session.cancelled);
  rec.timer = setTimeout(() => endWhenQuiet(session), t0 - performance.now() + (beats + 1.5) * msPerBeat);
}

// Perform: no count-in, no metronome, no set speed. Stave listens from the moment
// Start is pressed until the player taps "I've finished": pauses, quiet bars and
// slow starts never end the take. The screen is kept awake while it listens.
const freeTempo = () => practice === 'perform' && !drill;
const MAX_LISTEN_MS = 20 * 60000; // a safety net, far longer than any exam piece
function startFree(recorder) {
  const t0 = performance.now();
  rec = { t0, beat0Ctx: audio().currentTime, msPerBeat: 60000 / base.targetBpm, events: [], open: new Map(), pedal: [], pedalDown: null, sawPedal: false, source: null, cancelled: false, recorder, free: true };
  setStatus('', '');
  setStartLabel(true);
  $('#check-result').hidden = true;
  document.body.classList.add('perf-listening');
  const session = rec;
  const tick = () => {
    if (rec !== session) return;
    const ms = performance.now() - t0;
    $('#lp-time').textContent = `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    const heard = session.events.length || session.lastLoud;
    const now = session.lastHeard && performance.now() - session.lastHeard < 600;
    $('#lp-state').textContent = now ? 'Hearing you' : heard ? 'Still listening' : 'Waiting for you to start';
    $('#listen-panel').classList.toggle('hearing', Boolean(now));
    if (ms > MAX_LISTEN_MS) return stop();
    session.timer = setTimeout(tick, 250);
  };
  tick();
}

// Keep the phone's screen on while Stave listens: if it locks, the microphone stops.
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* not allowed right now (low battery, not visible): nothing to do */ }
}
// Coming back to the page drops the lock; take it again if still listening.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (rec || learn)) keepAwake(true); });

// A student who paused or went back is still playing when the music "should" have
// ended. Keep listening while notes are still coming (up to 16 extra beats), so the
// end of the piece isn't marked as missed.
const EXTRA_BEATS = 16;
function endWhenQuiet(session) {
  if (rec !== session) return;
  const now = performance.now();
  const lastNote = session.events.length ? session.t0 + session.events[session.events.length - 1].on : 0;
  const last = Math.max(lastNote, session.lastLoud ?? 0);
  const over = (now - session.t0) / session.msPerBeat - totalBeats(piece) - 1.5;
  if (now - last < 1.5 * session.msPerBeat && over < EXTRA_BEATS) {
    session.timer = setTimeout(() => endWhenQuiet(session), session.msPerBeat);
    return;
  }
  stop();
}

function stop() {
  if (!rec) return;
  clearTimeout(rec.timer);
  rec.cancelled = true;
  const r = rec;
  rec = null;
  keepAwake(false);
  document.body.classList.remove('perf-listening');
  setBackgroundPaused(false);
  setStartLabel(false);
  moveCursor(null);

  if (r.free && !r.events.length && performance.now() - r.t0 < 2000) {
    r.recorder?.stop();
    setStatus('Stopped. Tap Start listening, then play.', '');
    return;
  }

  if (performance.now() < r.t0) {
    r.recorder?.stop();
    pendingTake = null;
    setStatus('Cancelled.', '');
    if (drill) endDrill(false);
    return;
  }

  if (r.recorder) {
    const take = r.recorder.stop();
    lastTake = { ...take, beat0Sec: r.beat0Ctx - take.startCtx, pieceId: piece.id, bpm: bpm() };
    lastNotes = null;
    $('#lab-download').hidden = false;
    setStatus('Analysing', '');
    // Let the status paint before the (short) analysis blocks the thread.
    setTimeout(() => {
      const cal = calibration();
      runMic({
        samples: take.samples, sampleRate: take.sampleRate, expected: timeline(piece), msPerBeat: r.msPerBeat,
        beat0Sec: lastTake.beat0Sec, latencyMs: cal?.latencyMs ?? 120, tuningCents: cal?.tuningCents ?? 0, free: Boolean(r.free),
      }, true);
    }, 30);
    return;
  }

  const now = performance.now() - r.t0;
  for (const e of r.open.values()) e.off = now;
  if (r.pedalDown != null) r.pedal.push({ on: r.pedalDown, off: now });
  let played = r.events.filter((e) => r.free || e.on >= -0.75 * r.msPerBeat);
  let msPerBeat = r.msPerBeat;
  if (r.free && played.length) {
    // Beat 0 is their first note; the speed is theirs; the bars are whichever they played.
    part = findPart(played);
    const tl = timeline(part?.piece ?? piece);
    msPerBeat = guessBeatMs(tl, played.map((e) => e.on)) ?? msPerBeat;
    const shift = Math.min(...played.map((e) => e.on)) - (tl[0]?.beat ?? 0) * msPerBeat;
    played = played.map((e) => ({ ...e, on: e.on - shift, off: e.off == null ? null : e.off - shift }));
    r.pedal = r.pedal.map((p) => ({ on: p.on - shift, off: p.off - shift }));
  }
  lastNotes = { events: played.map((e) => ({ midi: e.midi, on: Math.round(e.on), off: e.off == null ? null : Math.round(e.off), velocity: e.velocity })), seconds: now / 1000 };
  lastTake = null;
  // Judge pedalling only when a pedal can be used: a MIDI keyboard is connected
  // (its pedal reports CC64) or Space was pressed on the computer keyboard.
  if (!r.free) part = null;
  const pedalPossible = r.sawPedal || (r.source === 'midi' && midiStatus?.midi === 'connected');
  finish({ played, source: r.source, msPerBeat, pedalEvents: pedalPossible ? r.pedal : null });
}

// Perform: they may have played just one part. Find which bars, and mark those.
let part = null; // { from, to, piece, offset } for the take being marked
function findPart(played) {
  const tl = timeline(piece);
  const loc = locatePart(tl, played);
  if (!loc || loc.share < 0.5 || (loc.from === tl[0].bar && loc.to === tl[tl.length - 1].bar)) return null;
  const s = normalize(piece);
  return { from: loc.from, to: loc.to, piece: excerpt(s, loc.from, loc.to), offset: barMap(s).starts[loc.from - 1 - (s.barOffset ?? 0)] };
}

function runMic(args, record) {
  let mic = analyseAudio({ ...args, thresholds: micThresholds() });
  part = args.free ? findPart(mic.played) : null;
  if (part) {
    args = { ...args, expected: timeline(part.piece) };
    mic = analyseAudio({ ...args, thresholds: micThresholds() });
  }
  // A re-score of the same take keeps its list of corrections already made.
  const reported = lastMic?.args === args ? lastMic.reported : new Set();
  lastMic = { args, evidence: mic.evidence, record, reported };
  $('#mic-tune-status').textContent = describeTuning();
  finish({ played: mic.played, source: 'mic', msPerBeat: mic.msPerBeat ?? args.msPerBeat, unclear: mic.unclear, spread: mic.spread, record });
}

function finish({ played, source, msPerBeat, unclear = [], spread = [], pedalEvents = null, record = true }) {
  const marked = part?.piece ?? piece;
  const d = density(marked);
  const result = analyse({
    expected: timeline(marked), played, unclear, spread, msPerBeat, beatsPerBar: marked.beatsPerBar, source,
    strictness, score: marked, pedalEvents, dense: d.maxChord >= 4 || (d.twoHands && d.minDur <= 0.25),
    targetMsPerBeat: drill ? null : 60000 / base.targetBpm,
  });
  const { board, type } = markingBoard();
  result.exam = examMark(result, board, type);
  result.part = part ? { from: part.from, to: part.to, offset: part.offset } : null;
  part = null;
  lastResult = result;
  if (played.length && record && !drill) {
    history.push({
      pieceId: base.id, hands, at: Date.now(), score: result.score, ready: result.ready && hands === 'both', bpm: bpm(), playedBpm: Math.round(result.playedBpm),
      worstBar: result.worstBar, input: source, barErrors: result.barErrors, keptGoing: result.continuity?.score ?? null, pulse: result.pulse?.score ?? null,
      pitch: +result.pitchAccuracy.toFixed(3), rhythm: +result.rhythmAccuracy.toFixed(3), targetBpm: base.targetBpm,
      exam: examMode || undefined,
      mark: result.exam.mark, of: result.exam.of, band: result.exam.band, board,
      part: result.part ? [result.part.from, result.part.to] : undefined,
    });
    if (result.score >= 85) logWin('clean');
    save('checks', history.slice(-300));
    changeListeners.forEach((fn) => fn());
  }
  drawScore(result);
  tap(result.score >= 85 ? 'success' : 'light');
  if (drill) return drillRunDone(result);
  showResult(result, source);
  if (record) tellTake({ pieceId: base.id, hands, bpm: bpm(), playedBpm: result.playedBpm, score: result.score, barErrors: result.barErrors, source });
  if (pendingTake) {
    const done = pendingTake;
    pendingTake = null;
    done(result, history[history.length - 1]);
  }
  updateTempoLock();
  setStatus(freeTempo() ? '' : 'Done. See your feedback below.', '');
}

// Four steps, Below pass → Distinction, lit up to the band.
const LEVELS = ['below', 'pass', 'merit', 'distinction'];
const meter = (band) => `<span class="meter ${band ? bandTone(band) : ''}" aria-hidden="true">${LEVELS.map((l, i) => `<i class="${band && i <= LEVELS.indexOf(band) ? 'on' : ''}" style="--n:${i}"></i>`).join('')}</span>`;

// The examiner's sheet: an estimated mark for the board, then each criterion.
function markSheet(m, part = null) {
  return `<div class="mark-sheet">
      <div class="mark-head">
        <div class="score-badge ${bandTone(m.band)}"><b data-count="${m.mark}">${m.mark}</b><small>/${m.of}</small></div>
        <div><p class="kicker">${m.board} mark${part ? ` · bars ${part.from}–${part.to}` : ''}</p><b class="mark-band ${bandTone(m.band)}">${BAND_NAME[m.band]}</b></div>
      </div>
    </div>`;
}

// Each thing the examiner listens for, with its band and a comment.
function markCriteria(m) {
  return `<div class="mark-sheet">
      <dl class="criteria">${m.criteria.map((c) => `<div><dt>${c.label}${c.max ? ` <span class="muted">${c.mark}/${c.max}</span>` : ''}</dt><dd><span class="crit-band">${meter(c.band)}<span class="band-chip ${c.band ? bandTone(c.band) : ''}">${c.band ? BAND_NAME[c.band] : 'Not heard'}</span></span><span class="crit-text">${c.comment}</span></dd></div>`).join('')}</dl>
      <p class="fine">An estimate, marked a little strictly so the real exam doesn't surprise you.${m.rough ? ' Tone and shape are rough with the microphone; a digital piano with a cable hears them exactly.' : ''} An examiner hears more than any app can.</p>
    </div>`;
}

function showResult(r, source) {
  const box = $('#check-result');
  box.hidden = false;
  // The result takes the place of the big button until they play again.
  document.body.classList.toggle('perf-result', freeTempo());
  const pct = (x) => `${Math.round(x * 100)}%`;
  const canDrill = r.worstBar != null && !r.ready && r.counts.correct + r.counts.early + r.counts.late > 0;
  const crits = r.exam.criteria.filter((c) => c.band);
  const order = ['below', 'pass', 'merit', 'distinction'];
  const top = [...crits].sort((a, b) => order.indexOf(b.band) - order.indexOf(a.band))[0];
  const low = [...crits].sort((a, b) => order.indexOf(a.band) - order.indexOf(b.band))[0];
  box.innerHTML = `
    ${markSheet(r.exam, r.part)}
    <div class="two-things">
      ${top ? `<p class="good-thing"><b>Well done</b>${top.comment}</p>` : ''}
      <p class="next-thing"><b>Next time</b>${r.feedback.next}</p>
    </div>
    <div class="result-actions">
      <button class="btn primary block" type="button" id="again">Play again</button>
      ${freeTempo() ? '<button class="btn block" id="see-notes" type="button">See your notes on the music</button>' : ''}
    </div>
    <details class="why"><summary>See all the marks</summary>
    ${markCriteria(r.exam)}
    <p class="muted small">${r.feedback.headline} Notes ${pct(r.pitchAccuracy)} · Rhythm ${pct(r.rhythmAccuracy)} · ${Math.round(r.playedBpm)} beats a minute${source === 'mic' ? ' · microphone' : ''} · ${STRICTNESS[r.strictness].label} marking</p>
    ${r.continuity || r.pulse ? `<div class="subscores">
      ${r.continuity ? `<span class="sub ${tone(r.continuity.score)}" title="Stops, restarts and hesitations"><b>${r.continuity.score}</b> Kept going</span>` : ''}
      ${r.pulse ? `<span class="sub ${tone(r.pulse.score)}" title="How evenly you kept the beat${examMode ? ', with no metronome' : ''}"><b>${r.pulse.score}</b> Pulse${examMode ? ' (no metronome)' : ''}</span>` : ''}
      ${r.continuity?.slips ? `<span class="sub" title="Slips you played straight through"><b>${r.continuity.recovered}/${r.continuity.slips}</b> Slips recovered</span>` : ''}
    </div>` : ''}
    <ul class="feedback-list">${r.feedback.lines.map((l) => `<li class="${l.kind}">${l.text}</li>`).join('')}</ul>
    ${freeTempo() ? '<button class="btn block" id="see-notes" type="button">See your notes on the score</button>' : ''}
    ${canDrill ? `<button class="btn primary block" id="drill-start" type="button">Practise bar ${r.worstBar} until it's right ${DRILL_STREAK} times in a row</button>` : ''}
    <div class="legend"><span class="good">● correct</span><span class="warn">● timing</span><span class="bad">● wrong</span><span class="miss">● missed</span>${source === 'mic' ? '<span class="unclear">● unclear</span>' : ''}</div>
    ${sendHook && (lastTake?.compressed || lastNotes) ? `<button class="btn block" id="send-take" type="button">${ICONS.mic} Send this take to your teacher</button>` : ''}
    ${source === 'mic' && lastMic ? verdictPanel(r) : ''}
    </details>`;
  box.querySelector('#again').addEventListener('click', () => { box.hidden = true; document.body.classList.remove('perf-result'); start(); });
  box.querySelector('#send-take')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending';
    try {
      const title = `${base.title}${drill ? ` (${span(drill)})` : ''} · ${r.exam.mark}/${r.exam.of} (${BAND_NAME[r.exam.band]})`;
      await sendHook(lastTake?.compressed
        ? { title, kind: 'audio', blob: await lastTake.compressed, seconds: lastTake.samples.length / lastTake.sampleRate, score: r.score }
        : { title, kind: 'notes', notes: lastNotes.events, seconds: lastNotes.seconds, score: r.score });
      btn.textContent = 'Sent ✓ (kept for 20 days)';
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Send this take to your teacher';
      setStatus(`Couldn't send it: ${err.message}`, 'bad');
    }
  });
  box.querySelector('#drill-start')?.addEventListener('click', () => startDrill(r.worstBar, r.worstBar));
  box.querySelector('#see-notes')?.addEventListener('click', () => $('#open-score').click());
  box.querySelectorAll('[data-verdict]').forEach((b) => b.addEventListener('click', () => correctVerdict(b.dataset.verdict, b.dataset.key)));
  box.querySelector('#verdict-wrong')?.addEventListener('click', () => {
    const key = box.querySelector('#verdict-pick').value;
    if (key) correctVerdict('wrong', key);
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  countMark(box.querySelector('.score-badge b'));
  const earlier = history.filter((h) => h.pieceId === base.id && h !== history[history.length - 1]);
  const prevBest = bestMark(earlier);
  const newBest = prevBest && r.exam.mark / r.exam.of > prevBest.mark / prevBest.of;
  if (['merit', 'distinction'].includes(r.exam.band) || newBest) {
    setTimeout(() => celebrate(box.querySelector('.score-badge')), 350);
    if (newBest) box.querySelector('.mark-head .kicker').textContent += ' · new best';
  }
}

// The mark counts up, as on a scoreboard.
function countMark(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('still')) return;
  const to = Number(el.dataset.count);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 700);
    el.textContent = Math.round(to * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- Per-user mic tuning: "the app got that note wrong" -----------------------------
const noteKey = (n) => `${n.beat}|${n.midi}`;
const noteLabel = (n) => `Bar ${n.bar} · ${midiName(n.midi)}`;

function verdictPanel(r) {
  // Only "missed" and "unclear" can be overruled. A "wrong" verdict means the mic heard a
  // different note clearly louder, and letting a student tap that away would teach the
  // app to accept their mistakes.
  const flagged = r.notes.filter((n) => ['missed', 'unclear'].includes(n.status) && !n.notReached && !lastMic.reported.has(noteKey(n))).slice(0, 12);
  const wrongs = r.notes.filter((n) => n.status === 'wrong').length;
  const passed = r.notes.filter((n) => ['correct', 'early', 'late'].includes(n.status) && !lastMic.reported.has(noteKey(n)));
  if (!flagged.length && !passed.length && !wrongs) return '';
  return `<details class="verdicts">
    <summary>Did the app get a note wrong?</summary>
    <p class="muted small">Tell it, and it tunes the microphone checking to your piano and room. ${describeTuning()}</p>
    ${flagged.length ? `<p class="small"><b>Marked as a mistake, but you played it right:</b></p>
    <div class="verdict-chips">${flagged.map((n) => `<button class="verdict-chip" type="button" data-verdict="right" data-key="${noteKey(n)}">${noteLabel(n)} (${n.status}) · it was right</button>`).join('')}</div>` : ''}
    ${wrongs ? `<p class="muted small">Wrong-note verdicts can't be overruled here: the microphone heard a different note louder. If you're sure, ask your teacher to listen to the recording.</p>` : ''}
    ${passed.length ? `<p class="small"><b>Marked correct, but you played it wrong:</b></p>
    <div class="row gap wrap"><select id="verdict-pick"><option value="">Choose the note</option>${passed.map((n) => `<option value="${noteKey(n)}">${noteLabel(n)}</option>`).join('')}</select>
    <button class="btn small-btn" type="button" id="verdict-wrong">It was wrong</button></div>` : ''}
  </details>`;
}

function correctVerdict(kind, key) {
  const ev = lastMic?.evidence.find((e) => `${e.beat}|${e.midi}` === key);
  if (!ev || lastMic.reported.has(key)) return; // one correction per note per take
  lastMic.reported.add(key);
  if (!reportVerdict(kind, ev.presence)) {
    setStatus("The microphone heard almost nothing for that note, so there's nothing to tune from. Move the device closer to the piano, or recalibrate.", 'warn');
    return;
  }
  // Re-score the same take with the new tuning (a correction shouldn't add another
  // entry to the practice history).
  runMic(lastMic.args, false);
  $('#check-result details.verdicts')?.setAttribute('open', '');
  $('#mic-tune-status').textContent = describeTuning();
  setStatus(kind === 'right' ? 'Thanks. The app will be more forgiving of notes like that on your piano.' : 'Thanks. The app will be stricter about notes like that on your piano.', 'good');
}

// ---- Bar drills: loop one bar until it's clean N times in a row ---------------------
function startDrill(from, to = from, kind = 'loop', { bpm: setBpm = null } = {}) {
  if (rec || learn) return;
  const drillBpm = setBpm ?? Math.max(40, Math.round((suggestedBpm(base) * 0.85) / 2) * 2);
  drill = { from, to: kind === 'add' ? from : to, end: to, kind, streak: 0, runs: 0, bpm: drillBpm };
  practice = 'perform';
  syncPracticeButtons();
  refreshPiece();
  updateTempoLock();
  $('#check-bpm').value = drillBpm;
  updateBpmLabel();
  $('#check-result').hidden = true;
  renderDrillBanner();
  setStatus(kind === 'add'
    ? `Building bars ${from}–${to} one bar at a time, at ${drillBpm} beats a minute. The next bar joins after ${ADD_STREAK} good runs.`
    : `Practising ${span(drill)} at ${drillBpm} beats a minute. Get it right ${DRILL_STREAK} times in a row.`, '');
  setTimeout(() => drill && start(), 600);
}

const span = (d) => (d.from === d.to ? `bar ${d.from}` : `bars ${d.from}–${d.to}`);

function drillRunDone(r) {
  drill.runs++;
  const clean = r.pitchAccuracy === 1 && r.rhythmAccuracy >= 0.9 && r.counts.extra === 0;
  drill.streak = clean ? drill.streak + 1 : 0;
  let note = clean ? 'Clean!' : r.feedback.lines.find((l) => l.kind === 'bad')?.text ?? 'Not quite. Again.';
  // "Add a bar": once the section is secure, the next bar joins it.
  if (drill.kind === 'add' && drill.to < drill.end && drill.streak >= ADD_STREAK) {
    drill.to++;
    drill.streak = 0;
    note = `Secure. Bar ${drill.to} added: now ${span(drill)}.`;
    refreshPiece();
  }
  renderDrillBanner(note);
  const need = drill.kind === 'add' && drill.to < drill.end ? ADD_STREAK : DRILL_STREAK;
  if (drill.to >= drill.end && drill.streak >= DRILL_STREAK) return endDrill(true);
  if (/added/.test(note)) setStatus(`${note} Again.`, 'good');
  else setStatus(clean ? `Right ${drill.streak} of ${need} times. Go again.` : 'A mistake that time, so the count starts again. Go again.', clean ? 'good' : 'warn');
  setTimeout(() => drill && !rec && start(), 1800);
}

function endDrill(done) {
  const d = drill;
  drill = null;
  $('#drill-banner').hidden = true;
  refreshPiece();
  updateTempoLock();
  setStartLabel(false);
  if (done && d) {
    logWin('bars');
    tellTake({ pieceId: base.id, section: { from: d.from, to: d.end }, bpm: d.bpm, secure: true });
    setStatus(`${span(d)[0].toUpperCase()}${span(d).slice(1)} ${d.from === d.to ? 'is' : 'are'} secure (${d.runs} runs). Now play the whole piece through.`, 'good');
  }
}

function renderDrillBanner(note = '') {
  const b = $('#drill-banner');
  b.hidden = !drill;
  if (!drill) return;
  const need = drill.kind === 'add' && drill.to < drill.end ? ADD_STREAK : DRILL_STREAK;
  const dots = Array.from({ length: need }, (_, i) => `<span class="streak-dot${i < drill.streak ? ' on' : ''}"></span>`).join('');
  const title = drill.kind === 'add' ? `Building bars ${drill.from}–${drill.end}: now ${span(drill)}` : `Practising ${span(drill)}`;
  b.innerHTML = `<div class="row between"><b>${title} · ${drill.bpm} bpm</b><span class="dots" role="img" aria-label="${drill.streak} of ${need} clean">${dots}</span></div>
    ${note ? `<p class="small">${note}</p>` : ''}
    <button class="btn block" id="drill-stop" type="button">Stop</button>`;
  b.querySelector('#drill-stop').addEventListener('click', () => {
    if (rec) stop();
    endDrill(false);
    setStatus('Stopped.', '');
  });
}

// ---- Trouble bars: where this week's mistakes cluster ----------------------------------
const barCount = (p) => Math.max(1, barsIn(p));

/** Errors per run for each bar of a piece over the last 7 days (runs that recorded bars). */
export function troubleBars(pieceId, days = 7) {
  const since = Date.now() - days * 86400000;
  const runs = history.filter((h) => h.pieceId === pieceId && h.at >= since && h.barErrors);
  const sum = {};
  for (const r of runs) for (const [bar, n] of Object.entries(r.barErrors)) sum[bar] = (sum[bar] ?? 0) + n;
  return { runs: runs.length, perRun: Object.fromEntries(Object.entries(sum).map(([b, n]) => [b, n / runs.length])) };
}

function renderHeat() {
  const box = $('#heat');
  if (!box) return;
  const { runs, perRun } = troubleBars(base.id);
  if (runs < 2 || drill) { box.hidden = true; return; }
  const n = barCount(base);
  const off = base.barOffset ?? 0;
  const worst = Math.max(1, ...Object.values(perRun));
  const cells = Array.from({ length: n }, (_, i) => {
    const bar = i + 1 + off;
    const v = perRun[bar] ?? 0;
    return `<button type="button" class="heat-cell" data-bar="${bar}" style="--h:${(v / worst).toFixed(2)}" title="Bar ${bar}: ${v ? `${v.toFixed(1)} mistakes per run` : 'clean'}" aria-label="Bar ${bar}, ${v ? `${v.toFixed(1)} mistakes per run` : 'no mistakes'}"><span>${bar}</span></button>`;
  }).join('');
  const top = Object.entries(perRun).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b);
  box.hidden = false;
  box.innerHTML = `<div class="row between"><b class="small">Bars costing marks · last 7 days, ${runs} runs</b><span class="muted small">${top.length ? `worst: ${top.join(', ')}` : 'all clean'}</span></div>
    <div class="heat-strip">${cells}</div><p class="muted small">Tap a bar to practise it.</p>`;
  box.querySelectorAll('[data-bar]').forEach((b) => b.addEventListener('click', () => {
    $('#sec-from').value = b.dataset.bar;
    $('#sec-to').value = b.dataset.bar;
    $('#section').open = true;
    $('#section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
}

function syncSectionInputs() {
  const n = barCount(base);
  const off = base.barOffset ?? 0;
  for (const id of ['#sec-from', '#sec-to']) {
    const el = $(id);
    el.min = 1 + off;
    el.max = n + off;
  }
  $('#sec-from').value = 1 + off;
  $('#sec-to').value = Math.min(n + off, 4 + off);
}

// ---- Learn: wait for each note --------------------------------------------------------
function learnSteps() {
  const tl = timeline(piece).filter((n) => !n.grace);
  const steps = [];
  for (const n of tl) {
    const last = steps[steps.length - 1];
    if (last && Math.abs(last.beat - n.beat) < 1e-6) last.notes.push(n);
    else steps.push({ beat: n.beat, bar: n.bar, notes: [n] });
  }
  return steps;
}

async function startLearn() {
  const steps = learnSteps();
  if (!steps.length) return;
  learn = { steps, idx: 0, pressed: new Set(), tries: new Map(), started: performance.now(), recorder: null, hits: 0, wrongStreak: 0, lastWrong: null };
  keepAwake(true);
  setStartLabel(true);
  $('#check-result').hidden = true;
  if (mode === 'mic') {
    try {
      await openMic();
    } catch {
      learn = null;
      setStartLabel(false);
      setStatus('Microphone access was blocked. Allow the microphone for this site in your browser settings, or use a MIDI keyboard (Options).', 'bad');
      return;
    }
    setBackgroundPaused(true);
    const cal = calibration();
    learn.recorder = startRecording({ onLevel: showLevel, onChunk: (buf) => learnHear(buf, cal) });
  }
  showLearnStep();
}

function showLearnStep() {
  const step = learn.steps[learn.idx];
  moveCursor(step.beat);
  document.querySelectorAll('.key.hint').forEach((k) => k.classList.remove('hint'));
  if ($('#learn-hints').checked) for (const n of step.notes) document.querySelectorAll(`.key[data-midi="${n.midi}"]`).forEach((k) => k.classList.add('hint'));
  const names = step.notes.map((n) => midiName(n.midi)).join(' + ');
  const fingers = step.notes.some((n) => n.finger) ? ` (finger ${step.notes.map((n) => n.finger ?? '–').join('-')})` : '';
  // Hints off: the student reads the note themselves; the cursor still shows where.
  setStatus($('#learn-hints').checked ? `Bar ${step.bar}: play ${names}${fingers}` : `Bar ${step.bar}: find the notes under the cursor`, '');
}

function learnAdvance() {
  learn.idx++;
  learn.pressed = new Set();
  learn.hits = 0;
  learn.wrongStreak = 0;
  if (learn.idx >= learn.steps.length) return stopLearn(false);
  showLearnStep();
}

function learnWrong(heard) {
  const step = learn.steps[learn.idx];
  learn.tries.set(step.bar, (learn.tries.get(step.bar) ?? 0) + 1);
  setStatus(`That's ${midiName(heard)}. Bar ${step.bar} needs ${step.notes.map((n) => midiName(n.midi)).join(' + ')}.`, 'bad');
}

function learnKey(evt) {
  const step = learn.steps[learn.idx];
  const wanted = step.notes.map((n) => n.midi);
  if (!wanted.includes(evt.midi)) return learnWrong(evt.midi);
  learn.pressed.add(evt.midi);
  if (wanted.every((m) => learn.pressed.has(m))) learnAdvance();
}

function learnHear(buf, cal) {
  if (!learn) return;
  const step = learn.steps[learn.idx];
  const prev = learn.steps[learn.idx - 1];
  const res = liveCheck(buf, audio().sampleRate, step.notes.map((n) => n.midi), { tuningCents: cal?.tuningCents ?? 0, recent: prev ? prev.notes.map((n) => n.midi) : [], noiseRms: cal?.noiseRms ?? 0, thresholds: micThresholds() });
  // Two checks in a row (~200 ms) before accepting, so a stray noise can't advance it.
  learn.hits = res.all ? learn.hits + 1 : 0;
  if (learn.hits >= 2) return learnAdvance();
  if (res.wrong != null && !res.all) {
    learn.wrongStreak = learn.lastWrong === res.wrong ? learn.wrongStreak + 1 : 1;
    learn.lastWrong = res.wrong;
    if (learn.wrongStreak === 3) learnWrong(res.wrong);
  }
}

function stopLearn(cancelled) {
  const l = learn;
  learn = null;
  keepAwake(false);
  l.recorder?.stop();
  setBackgroundPaused(false);
  setStartLabel(false);
  document.querySelectorAll('.key.hint').forEach((k) => k.classList.remove('hint'));
  moveCursor(null);
  if (cancelled) return setStatus(`Stopped at bar ${l.steps[Math.min(l.idx, l.steps.length - 1)].bar}.`, '');
  const secs = Math.round((performance.now() - l.started) / 1000);
  const hard = [...l.tries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const box = $('#check-result');
  box.hidden = false;
  box.innerHTML = `
    <div class="result-head"><div class="score-badge good">${ICONS.check}</div>
      <div><b>You found every note.</b><div class="muted">${l.steps.length} steps in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</div></div></div>
    <ul class="feedback-list">${hard.length ? hard.map(([bar, n]) => `<li class="warn">Bar ${bar} took ${n + 1} tries.</li>`).join('') : '<li class="good">No wrong notes at all.</li>'}</ul>
    <p class="next"><b>Next step:</b> ${hard.length ? `Practise bar ${hard[0][0]} on its own (Practise just some bars, below), then play it all with the metronome at ${suggestedBpm(base)} beats a minute.` : `Play it through with the metronome at ${suggestedBpm(base)} beats a minute.`}</p>
    ${hard.length ? `<button class="btn primary block" id="drill-start" type="button">Practise bar ${hard[0][0]}</button>` : ''}`;
  box.querySelector('#drill-start')?.addEventListener('click', () => startDrill(hard[0][0]));
  setStatus('Learn run finished.', 'good');
}

// ---- Tempo lock -----------------------------------------------------------------------
// Progressive tempo: start slow, earn speed with clean runs.
export function suggestedBpm(p) {
  const runs = history.filter((h) => h.pieceId === p.id && (h.hands ?? 'both') === 'both');
  if (!runs.length) return Math.round(p.targetBpm * 0.8);
  const last = runs[runs.length - 1];
  if (last.ready) return Math.min(p.targetBpm, last.bpm + 8);
  if (last.score < 60) return Math.max(40, last.bpm - 8);
  return last.bpm;
}

function updateTempoLock() {
  const slider = $('#check-bpm');
  const cap = suggestedBpm(base);
  const locked = !tempoUnlocked && !drill && cap < base.targetBpm;
  slider.max = locked ? cap : Math.max(160, base.targetBpm + 20);
  if (Number(slider.value) > Number(slider.max)) slider.value = slider.max;
  $('#tempo-lock').hidden = !locked;
  $('#tempo-lock-text').textContent = locked ? `Speed is capped at ${cap} until you play it without mistakes. Each good play-through adds 8, up to ${base.targetBpm}.` : '';
  updateBpmLabel();
}

// ---- Piece selection & import -----------------------------------------------------------
function fillPieceSelect() {
  const sel = $('#check-piece');
  const opt = (p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`;
  const warm = library.some((p) => p.id === base.id) ? `<option value="${base.id}">Warm-up: ${escapeHtml(base.title)}</option>` : '';
  sel.innerHTML = `${warm}${imported.length ? `<optgroup label="Your pieces">${imported.map(opt).join('')}</optgroup>` : ''}${fromTeacher.length ? `<optgroup label="From your teacher">${fromTeacher.map(opt).join('')}</optgroup>` : ''}`;
  sel.value = base.id;
}

// No pieces yet: one clear card saying how to add one, instead of an empty player.
function showEmpty(on) {
  emptyMode = on;
  $('#perf-empty').hidden = !on;
  $('#perf-main').hidden = on;
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** hidden: allow a built-in (the warm-up scale, or a piece the app itself asks for). */
// The piece as a "now playing" card: its own first line of music as the cover,
// the composer above the title (imports title pieces "Composer: Title").
function showNowPlaying() {
  const cut = base.title.indexOf(': ');
  const [composer, title] = cut > 0 ? [base.title.slice(0, cut), base.title.slice(cut + 2)] : ['', base.title];
  $('#np-title').textContent = title;
  $('#np-composer').textContent = composer || 'Your piece';
  $('#score-sheet-title').textContent = title;
  let art = '';
  try {
    const s = normalize(base);
    const first = 1 + (s.barOffset ?? 0);
    art = renderScore(excerpt(s, first, first + 1), { mode: 'page', width: 300 }).systems[0].svg.outerHTML;
  } catch { /* an odd score just gets the plain cover */ }
  $('#np-cover').innerHTML = `<span class="paper np-page">${art}</span>`;
}

function selectPiece(id, { hidden = id === WARMUP } = {}) {
  if (rec || learn) return;
  const found = allPieces().find((p) => p.id === id) ?? (hidden ? library.find((p) => p.id === id) : null) ?? allPieces()[0];
  showEmpty(!found);
  if (!found) return;
  base = found;
  document.body.classList.remove('perf-result');
  save('checkPiece', base.id);
  fillPieceSelect();
  drill = null;
  $('#drill-banner').hidden = true;
  if (base.staves < 2) hands = 'both';
  $('#hands-field').hidden = base.staves < 2;
  $('#check-hands').value = hands;
  tempoUnlocked = false;
  $('#check-bpm').value = suggestedBpm(base);
  $('#check-result').hidden = true;
  $('#check-level').textContent = [`${base.beatsPerBar}/${base.beatUnit}`, `${base.targetBpm} beats a minute`, base.tempoWords].filter(Boolean).join(' · ');
  showNowPlaying();
  $('#check-warnings').hidden = !base.warnings?.length;
  $('#check-warnings').textContent = base.warnings?.join(' ') ?? '';
  $('#remove-import').hidden = !imported.some((p) => p.id === base.id);
  $('#check-piece').value = base.id;
  $('#lab-bpm').value = base.targetBpm;
  syncSectionInputs();
  refreshPiece();
  updateTempoLock();
}

async function importFile(file) {
  setStatus(`Reading ${file.name}`, '');
  try {
    const score = normalize(await readScoreFile(file));
    if (!score.notes.length) throw new Error('No notes found in this file.');
    imported = [score, ...imported.filter((p) => p.id !== score.id)].slice(0, MAX_IMPORTS);
    save('imports', imported);
    fillPieceSelect();
    selectPiece(score.id);
    setStatus(`Imported “${score.title}”: ${timeline(score).length} notes, ${barsIn(score)} bars.`, 'good');
  } catch (e) {
    setStatus(`Couldn't import that file. ${e.message}`, 'bad');
  }
}

function removeImport() {
  imported = imported.filter((p) => p.id !== base.id);
  save('imports', imported);
  selectPiece(allPieces()[0]?.id);
}

/** Open a piece from elsewhere in the app (Today's plan, the exam page). */
export function choosePiece(id) {
  selectPiece(id, { hidden: true });
}

// ---- Status, mic, test lab ---------------------------------------------------------------
function setStatus(text, kind) {
  const s = $('#check-status');
  s.textContent = text;
  s.className = 'status ' + kind;
}

function setStartLabel(running) {
  const b = $('#check-start');
  // One big round button: tap to start, tap again to finish.
  const [icon, label] = running
    ? ['<i class="rec-stop" aria-hidden="true"></i>', freeTempo() ? 'I\'ve finished' : 'Stop']
    : [ICONS.mic, practice === 'learn' ? 'Start learning' : freeTempo() ? 'Tap to start' : 'Start'];
  b.innerHTML = `<span class="rec-dot">${icon}</span><span class="rec-label">${label}</span>`;
  b.classList.toggle('listening', running);
}

function showLevel(level) {
  // ~ -50 dB → 0%, ~ -6 dB → 100%
  const db = 20 * Math.log10(Math.max(level, 1e-5));
  if (rec && db > -38) rec.lastLoud = performance.now();
  if (rec && db > -52) rec.lastHeard = performance.now();
  const bar = $('#lp-level > i');
  if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, (db + 60) / 50))})`;
  $('#mic-level > div').style.width = `${Math.max(0, Math.min(100, ((db + 50) / 44) * 100))}%`;
}

// The pill above Start says how Stave is listening, and is the way to fix it.
function updateInputPill() {
  const pill = $('#input-pill');
  if (!pill) return;
  const cal = calibration();
  const s = midiStatus;
  let text;
  let state;
  if (mode === 'mic') {
    if (!micSupported()) [text, state] = ["This browser can't use the microphone. Tap to use a MIDI keyboard.", 'fix'];
    else if (!cal) [text, state] = ['Microphone not set up yet. Tap to set it up (20 seconds).', 'fix'];
    else [text, state] = [`Listening with the microphone · ${micVerdict(cal).level === 'ready' ? 'ready' : 'tap to improve'}`, micVerdict(cal).level === 'ready' ? 'ok' : 'fix'];
  } else if (s?.midi === 'connected') [text, state] = [`Listening to ${s.devices[0]}`, 'ok'];
  else [text, state] = [s?.midi === 'unsupported' ? 'This browser has no MIDI (iPhone, iPad). Tap to use the microphone.' : 'No MIDI keyboard found. Plug one in, or tap to use the microphone.', 'fix'];
  pill.textContent = text;
  pill.className = `input-pill ${state}`;
}

function idleStatus() {
  updateInputPill();
  if (rec || learn) return;
  setStatus('', '');
}

function setMode(m, { chosen = false } = {}) {
  mode = m;
  save('inputMode', m);
  if (chosen) save('inputChosen', true);
  root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  $('#mic-panel').hidden = m !== 'mic';
  // In mic mode the click would be "heard" as notes; default to the visual pulse.
  $('#check-metro').checked = m !== 'mic';
  $('#mic-cal-status').textContent = micSummary();
  $('#mic-tune-status').textContent = describeTuning();
  idleStatus();
}

function syncPracticeButtons() {
  root.querySelectorAll('[data-practice]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.practice === practice)));
  $('#learn-options').hidden = practice !== 'learn';
  $('#perform-options').hidden = practice !== 'perform';
  $('#learn-banner').hidden = practice !== 'learn';
  $('#how').hidden = practice === 'learn';
  setStartLabel(false);
  if (scoreView) drawScore();
}

function runCalibration() {
  $('#perf-options').open && $('#perf-options').close();
  openMicSetup({ onDone: () => { $('#mic-cal-status').textContent = micSummary(); updateInputPill(); } });
}

// Test lab: score a recording file, so mic accuracy can be measured on real pianos.
async function analyseFile(file) {
  setStatus(`Analysing ${file.name}`, '');
  try {
    const buf = await audio().decodeAudioData(await file.arrayBuffer());
    const ch = buf.numberOfChannels;
    const samples = new Float32Array(buf.length);
    for (let c = 0; c < ch; c++) buf.getChannelData(c).forEach((v, i) => (samples[i] += v / ch));
    // The lab's own tempo: recordings are often made at full speed, above the practice tempo lock.
    const labBpm = Number($('#lab-bpm').value) || base.targetBpm;
    const msPerBeat = 60000 / labBpm;
    const cal = calibration();
    runMic({
      samples, sampleRate: buf.sampleRate, expected: timeline(piece), msPerBeat,
      beat0Sec: firstOnsetSec(samples, buf.sampleRate), latencyMs: 0, tuningCents: cal?.tuningCents ?? 0,
    }, false);
    setStatus(`Scored ${file.name} against “${piece.title}” at ${labBpm} bpm (not saved to your progress).`, '');
  } catch {
    setStatus("Couldn't read that file. Try a WAV, MP3 or M4A recording.", 'bad');
  }
}

function downloadTake() {
  if (!lastTake) return;
  const url = URL.createObjectURL(encodeWav(lastTake.samples, lastTake.sampleRate));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lastTake.pieceId}-${lastTake.bpm}bpm-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.wav`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function updateBpmLabel() {
  $('#check-bpm-label').textContent = `${bpm()} bpm`;
}

export function mountCheck(el) {
  root = el;
  root.innerHTML = `
    <div class="perf-head"><h2>Perform</h2><button class="btn small-btn" id="perf-options-open" type="button">${ICONS.sliders} Options</button></div>
    <input id="import-file" type="file" accept=".musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml" hidden>

    <section class="card perf-empty" id="perf-empty" hidden>
      <h3>Add your first piece</h3>
      <p>Stave listens to you play and checks every note against your music.</p>
      <button class="btn primary block" type="button" data-scan>Take a photo of the music</button>
      <label class="btn block" for="import-file">Add a file from your teacher or MuseScore</label>
      <p class="fine">Files are MusicXML (.musicxml or .mxl). <a href="help.html#scores">How to get one</a></p>
    </section>

    <div id="perf-main">
      <section class="pc" aria-labelledby="np-title">
        <button class="pc-cover" type="button" id="np-cover" aria-label="Look at the music"></button>
        <div class="pc-info">
          <p class="np-kicker" id="np-composer"></p>
          <h3 id="np-title"></h3>
          <p class="np-meta" id="check-level"></p>
        </div>
        <label class="pc-change"><span>Change</span><select id="check-piece" aria-label="Choose a piece"></select></label>
      </section>
      <p class="warn-note" id="check-warnings" hidden></p>
      <section class="learn-banner" id="learn-banner" hidden>
        <b>${ICONS.book} Learning slowly</b><span>Stave waits on each note until you find it.</span>
        <button class="btn small-btn" type="button" data-practice="perform">Back to marking</button>
      </section>
      <ol class="how" id="how">
        <li><span aria-hidden="true">1</span>Open your music book on the piano.</li>
        <li><span aria-hidden="true">2</span>Tap the big button.</li>
        <li><span aria-hidden="true">3</span>Play! The whole piece, or just one part.</li>
      </ol>
      <div class="score-home" id="score-home"><div class="score-scroll paper" id="check-score" tabindex="0" role="group" aria-label="The music"></div></div>
      <section class="card drill" id="drill-banner" hidden></section>
      <section class="listen-panel" id="listen-panel" aria-live="polite">
        <p class="lp-state" id="lp-state">Waiting for you to start</p>
        <p class="lp-time" id="lp-time" aria-hidden="true">0:00</p>
        <div class="lp-level" id="lp-level" aria-hidden="true"><i></i></div>
        <p class="muted small">Play from your book at your own speed. Stopping for a moment is fine. Tap the button when you've finished.</p>
      </section>
      <div class="perf-actions">
        <button class="rec-btn" id="check-start" type="button"></button>
      </div>
      <button class="input-pill" id="input-pill" type="button"></button>
      <p class="status" id="check-status" aria-live="polite"></p>
      <section class="card result" id="check-result" hidden></section>

      <h3 class="more-h">More</h3>
      <div class="more-list" role="group" aria-label="More">
        <button class="more-row" type="button" id="check-listen">${ICONS.play}<span><b>Hear the piece</b><small>How it should sound</small></span></button>
        <button class="more-row" type="button" id="open-score">${ICONS.book}<span><b>Look at the music</b><small>And see your notes after you play</small></span></button>
        <button class="more-row" type="button" data-practice="learn">${ICONS.metronome ?? ICONS.book}<span><b>Learn it slowly</b><small>Stave waits for each note</small></span></button>
        <button class="more-row" type="button" id="open-add"><b class="plus-glyph" aria-hidden="true">+</b><span><b>Add a piece</b><small>From a photo or a file</small></span></button>
      </div>
      <section class="card heat" id="heat" hidden></section>
      <details class="card section" id="section">
        <summary>Practise one tricky part over and over</summary>
        <div class="row gap wrap section-row">
          <label class="field inline">Bars <input id="sec-from" type="number" inputmode="numeric" step="1"> to <input id="sec-to" type="number" inputmode="numeric" step="1"></label>
          <select id="sec-kind" aria-label="How to practise it">
            <option value="loop">Repeat until right ${DRILL_STREAK} times in a row</option>
            <option value="add">Add a bar at a time</option>
          </select>
          <button class="btn accent" id="sec-go" type="button">Start</button>
        </div>
        <p class="muted small">"Add a bar at a time" starts with one bar. Each time you get it right ${ADD_STREAK} times running, the next bar joins on.</p>
        <button class="btn small-btn" id="sec-share" type="button">Teachers: send this as an assignment link</button>
      </details>
    </div>

    <dialog class="score-sheet" id="score-sheet" aria-labelledby="score-sheet-title">
      <div class="ss-grip" aria-hidden="true"></div>
      <div class="ss-head">
        <div><p class="np-kicker">Score</p><h3 id="score-sheet-title"></h3></div>
        <button class="btn small-btn ss-play" type="button" id="ss-play">${ICONS.play} Play</button>
        <button class="btn small-btn" type="button" id="ss-close" aria-label="Close the score">✕</button>
      </div>
      <div class="ss-body" id="ss-body"></div>
    </dialog>

    <dialog class="card sheet add-sheet" id="add-sheet" aria-labelledby="add-sheet-title">
      <div class="row between"><h3 id="add-sheet-title">Add a piece</h3><button class="btn small-btn" type="button" data-close>✕</button></div>
      <button class="btn primary block" type="button" data-scan>Take a photo of the music</button>
      <label class="btn block" for="import-file">Add a MusicXML file</label>
      <button class="btn bad block" id="remove-import" type="button" hidden>Remove this piece</button>
      <p class="fine">Files come from your teacher or MuseScore. <a href="help.html#scores">How to get one</a></p>
    </dialog>

    <dialog class="card sheet" id="perf-options" aria-labelledby="perf-options-title">
      <div class="row between"><h3 id="perf-options-title">Options</h3><button class="btn small-btn" type="button" id="perf-options-close">Done</button></div>
      <h4>How Stave hears you</h4>
      <div class="segmented" role="group" aria-label="How Stave hears you">
        <button type="button" data-mode="mic" aria-pressed="false">${ICONS.mic} Microphone</button>
        <button type="button" data-mode="keys" aria-pressed="false">${ICONS.piano} Digital piano</button>
      </div>
      <section class="mic-panel" id="mic-panel" hidden>
        <div class="row between"><b>Microphone</b><div class="level" id="mic-level" aria-hidden="true"><div></div></div></div>
        <p class="small" id="mic-cal-status"></p>
        <button class="btn block" id="mic-cal" type="button">${ICONS.mic} Set up the microphone</button>
        <p class="muted small"><span id="mic-tune-status"></span> <button class="linkish" type="button" id="mic-tune-reset">Reset</button></p>
      </section>
      <div id="perform-options">
        <h4>While you play</h4>
        <p class="muted small" id="free-note">In Perform you choose the speed: Stave follows you and compares it with the marked speed. These settings are for "Practise just some bars".</p>
        <label class="field">Speed (beats a minute) <span class="row gap"><input id="check-bpm" type="range" min="40" max="160" step="1"> <span id="check-bpm-label"></span></span></label>
        <p class="lock-note" id="tempo-lock" hidden><span id="tempo-lock-text"></span> <button class="linkish" id="tempo-unlock" type="button">Unlock (for teachers)</button></p>
        <label class="set-row"><span>Metronome<small>A click on every beat</small></span><input id="check-metro" type="checkbox" role="switch" checked></label>
        <label class="set-row"><span>Exam conditions<small>No metronome and no beat light, like the exam room</small></span><input id="check-exam" type="checkbox" role="switch"></label>
        <label class="set-row"><span>Hide bars as you play<small>Each bar disappears as you reach it, so you learn to look ahead</small></span><input id="check-readahead" type="checkbox" role="switch"></label>
        <label class="field">How strict the marking is
          <select id="check-strict">${Object.entries(STRICTNESS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
        </label>
        <p class="muted small">Gentle forgives small timing slips; Exam marks like an examiner.</p>
        <span class="pulse" id="check-pulse" aria-hidden="true"></span>
      </div>
      <div id="learn-options" hidden>
        <p class="muted small">Learn mode waits on each note or chord until you find it, then moves on. No metronome, no rush.</p>
        <label class="set-row"><span>Name the next notes<small>Turn off to read them yourself</small></span><input id="learn-hints" type="checkbox" role="switch" checked></label>
      </div>
      <h4>How the music looks</h4>
      <div class="row gap wrap score-tools">
        <label class="field inline" id="hands-field" hidden>Hands
          <select id="check-hands"><option value="both">Both</option><option value="rh">Right only</option><option value="lh">Left only</option></select>
        </label>
        <div class="segmented mini" role="group" aria-label="How the music looks">
          <button type="button" data-layout="scroll" aria-pressed="false">One long line</button>
          <button type="button" data-layout="page" aria-pressed="false">Like a page</button>
        </div>
      </div>
      <details class="lab">
        <summary>Advanced: test the microphone</summary>
        <p class="muted small">Score a recording of the selected piece, starting on beat 1, to check how well the microphone works on your piano.</p>
        <label class="field inline">Recorded at <input id="lab-bpm" type="number" min="30" max="240" step="1" inputmode="numeric"> bpm</label>
        <input id="lab-file" type="file" accept="audio/*" aria-label="Choose a recording to analyse">
        <button class="btn block" id="lab-download" type="button" hidden>Save last mic take (.wav)</button>
        <button class="btn block" id="lab-kit" type="button">Recording kit: tune checking to real pianos</button>
      </details>
    </dialog>`;

  $('#check-piece').addEventListener('change', (e) => selectPiece(e.target.value));
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importFile(e.target.files[0]);
    e.target.value = '';
  });
  $('#remove-import').addEventListener('click', removeImport);
  root.querySelectorAll('[data-scan]').forEach((b) => b.addEventListener('click', () => openScan({
    onAdd: (xml, title) => importFile(new File([xml], `${title.replace(/[\\/:*?"<>|]/g, '')}.musicxml`, { type: 'application/xml' })),
    signIn: () => document.getElementById('top-avatar')?.click(),
  })));
  $('#check-bpm').addEventListener('input', updateBpmLabel);
  $('#check-listen').addEventListener('click', togglePlay);
  // The score sheet, Hear it and Add.
  const sheet = $('#score-sheet');
  const openScore = () => { sheet.showModal(); drawScore(); };
  $('#open-score').addEventListener('click', openScore);
  $('#np-cover').addEventListener('click', openScore);
  $('#ss-close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // tap outside
  sheet.addEventListener('close', () => playing && togglePlay());
  $('#ss-play').addEventListener('click', togglePlay);
  const add = $('#add-sheet');
  $('#open-add').addEventListener('click', () => add.showModal());
  add.querySelector('[data-close]').addEventListener('click', () => add.close());
  add.querySelectorAll('[data-scan], label[for="import-file"], #remove-import').forEach((b) => b.addEventListener('click', () => add.close()));
  $('#check-start').addEventListener('click', start);
  $('#check-hands').addEventListener('change', (e) => {
    hands = e.target.value;
    refreshPiece();
  });
  $('#check-strict').value = strictness;
  $('#check-strict').addEventListener('change', (e) => {
    strictness = e.target.value;
    const p = load('profile', null);
    if (p) save('profile', { ...p, strictness });
  });
  $('#check-exam').checked = examMode;
  $('#check-exam').addEventListener('change', (e) => { examMode = e.target.checked; save('examConditions', examMode); });
  $('#check-readahead').checked = readAhead;
  $('#check-readahead').addEventListener('change', (e) => { readAhead = e.target.checked; save('readAhead', readAhead); });
  $('#sec-go').addEventListener('click', () => {
    const lo = Number($('#sec-from').min);
    const hi = Number($('#sec-from').max);
    const clamp = (v) => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));
    let from = clamp($('#sec-from').value);
    let to = clamp($('#sec-to').value);
    if (to < from) [from, to] = [to, from];
    $('#section').open = false;
    startDrill(from, to, $('#sec-kind').value);
  });
  $('#sec-share').addEventListener('click', () => shareHook?.({
    piece: { id: base.id, title: base.title }, from: Number($('#sec-from').value) || null, to: Number($('#sec-to').value) || null, bpm: bpm(), strictness,
  }));
  $('#tempo-unlock').addEventListener('click', () => {
    tempoUnlocked = true;
    updateTempoLock();
  });
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => !rec && !learn && setMode(b.dataset.mode, { chosen: true })));
  const options = $('#perf-options');
  $('#perf-options-open').addEventListener('click', () => options.showModal());
  $('#perf-options-close').addEventListener('click', () => options.close());
  options.addEventListener('click', (e) => { if (e.target === options) options.close(); }); // tap outside the sheet
  $('#input-pill').addEventListener('click', () => {
    if (rec || learn) return;
    if (mode === 'mic' && micSupported()) return runCalibration();
    if (mode === 'mic') return setMode('keys', { chosen: true });
    if (midiStatus?.midi !== 'connected' && micSupported()) return setMode('mic', { chosen: true });
    options.showModal();
  });
  root.querySelectorAll('[data-practice]').forEach((b) => b.addEventListener('click', () => {
    if (rec || learn) return;
    practice = b.dataset.practice;
    save('practiceMode', practice);
    if (drill) endDrill(false);
    syncPracticeButtons();
  }));
  root.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
    layout = b.dataset.layout;
    save('scoreLayout', layout);
    root.querySelectorAll('[data-layout]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.layout === layout)));
    drawScore();
  }));
  root.querySelectorAll('[data-layout]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.layout === layout)));
  $('#mic-cal').addEventListener('click', runCalibration);
  $('#mic-tune-reset').addEventListener('click', () => {
    resetTuning();
    $('#mic-tune-status').textContent = describeTuning();
    if (lastMic && lastResult?.source === 'mic') runMic(lastMic.args, false);
  });
  $('#lab-file').addEventListener('change', (e) => e.target.files[0] && analyseFile(e.target.files[0]));
  $('#lab-download').addEventListener('click', downloadTake);
  $('#lab-kit').addEventListener('click', () => kitHook?.());
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    if (layout === 'page') resizeTimer = setTimeout(() => !rec && !learn && drawScore(), 200);
  });

  onStatus((s) => {
    midiStatus = s;
    // A MIDI keyboard is exact: use it when one is plugged in, unless the student chose.
    if (s?.midi === 'connected' && mode !== 'keys' && !load('inputChosen', false) && !rec && !learn) setMode('keys');
    idleStatus();
  });

  onNote((evt) => {
    if (learn && !learn.recorder) {
      if (evt.type === 'on') learnKey(evt);
      return;
    }
    if (!rec || rec.recorder) return;
    const t = evt.t - rec.t0;
    if (evt.type === 'pedal') {
      rec.sawPedal = true;
      if (evt.down && rec.pedalDown == null) rec.pedalDown = t;
      if (!evt.down && rec.pedalDown != null) {
        rec.pedal.push({ on: rec.pedalDown, off: t });
        rec.pedalDown = null;
      }
      return;
    }
    if (evt.type === 'on') {
      const e = { midi: evt.midi, on: t, off: null, velocity: evt.velocity };
      rec.events.push(e);
      rec.open.set(evt.midi, e);
      rec.source ??= evt.source;
    } else {
      const e = rec.open.get(evt.midi);
      if (e) {
        e.off = t;
        rec.open.delete(evt.midi);
      }
    }
  });

  // The octave study (used by the mic test kit) ships as MusicXML, through the same importer.
  fetch('scores/octave-study.musicxml')
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.statusText))))
    .then((text) => {
      const study = normalize({ ...parseMusicXML(text, { id: 'octave-study' }), level: 'Grade 6 style · Both hands · Original study' });
      library = [...library, study]; // for the mic test kit only
    })
    .catch(() => {});

  selectPiece(load('checkPiece', null));
  setMode(micSupported() ? mode : 'keys');
  $('#check-strict').value = strictness;
  syncPracticeButtons();
}
