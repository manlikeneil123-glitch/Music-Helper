// Reading flashcards with Leitner-box spaced repetition. Four decks:
//   notes      — a note on the stave → its name
//   keys       — a key signature → its major and relative minor
//   intervals  — two notes → the interval (major 3rd, perfect 5th…)
//   chords     — a triad → its name and inversion
// Answer by flipping + self-grading, or by playing: the note, the key's tonic, both
// notes of the interval, or the chord (any octave or inversion).
import { renderStave, stepName, stepLetter, stepToMidi, midiName, CLEFS } from './music.js';
import { renderScore } from './render.js';
import { logWin } from './quality.js';
import { load, save } from './store.js';
import { onNote } from './input.js';
import { tap } from './haptics.js';


const RANGES = { treble: [28, 40], bass: [16, 28] }; // C4–A5, E2–C4 incl. ledger lines
const BOX_WEIGHTS = [16, 8, 4, 2, 1];
const MAJOR = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
const MINOR = ['A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯'];
const ORDINAL = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'octave' };
const QUALITY = { // [diatonic size][semitones] → quality
  2: { 1: 'Minor', 2: 'Major' }, 3: { 3: 'Minor', 4: 'Major' }, 4: { 5: 'Perfect', 6: 'Augmented' },
  5: { 6: 'Diminished', 7: 'Perfect' }, 6: { 8: 'Minor', 9: 'Major' }, 7: { 10: 'Minor', 11: 'Major' }, 8: { 12: 'Perfect' },
};
const INVERSIONS = ['root position', '1st inversion', '2nd inversion'];
export const DECKS = { notes: 'Notes', keys: 'Key signatures', intervals: 'Intervals', chords: 'Chords' };

let boxes = load('cards', {}); // id -> { box, seen, right }
let current = null;
let flipped = false;
let session = { right: 0, total: 0 };
let pressed = []; // recent key presses, for multi-note answers
let root;

// ---- Decks ---------------------------------------------------------------------------
function noteCards(clefs) {
  return clefs.flatMap((clef) => {
    const [lo, hi] = RANGES[clef];
    return Array.from({ length: hi - lo + 1 }, (_, i) => ({ id: `${clef}:${lo + i}`, deck: 'notes', clef, step: lo + i }));
  });
}

function keyCards(clefs) {
  return clefs.flatMap((clef) => Array.from({ length: 15 }, (_, i) => ({ id: `key:${clef}:${i - 7}`, deck: 'keys', clef, fifths: i - 7 })));
}

function intervalCards(clefs) {
  return clefs.flatMap((clef) => {
    const [lo] = RANGES[clef];
    const out = [];
    for (let low = lo + 1; low <= lo + 7; low++) for (let size = 2; size <= 8; size++) out.push({ id: `int:${clef}:${low}:${size}`, deck: 'intervals', clef, low, size });
    return out;
  });
}

function chordCards(clefs) {
  return clefs.flatMap((clef) => {
    const [lo] = RANGES[clef];
    const out = [];
    for (let r = 0; r < 7; r++) for (let inv = 0; inv < 3; inv++) out.push({ id: `ch:${clef}:${r}:${inv}`, deck: 'chords', clef, root: lo + 2 + r, inv });
    return out;
  });
}

function deck(kind, clefSetting) {
  const clefs = clefSetting === 'both' ? ['treble', 'bass'] : [clefSetting];
  return { notes: noteCards, keys: keyCards, intervals: intervalCards, chords: chordCards }[kind](clefs);
}

// ---- Card content -------------------------------------------------------------------
function intervalName(card) {
  const semis = stepToMidi(card.low + card.size - 1) - stepToMidi(card.low);
  return `${QUALITY[card.size][semis] ?? ''} ${ORDINAL[card.size]}`.trim();
}

function triad(card) {
  // Steps of the chord, lowest first, after inversion.
  const steps = [card.root, card.root + 2, card.root + 4];
  for (let i = 0; i < card.inv; i++) steps.push(steps.shift() + 7);
  const rootMidi = stepToMidi(card.root);
  const third = stepToMidi(card.root + 2) - rootMidi;
  const fifth = stepToMidi(card.root + 4) - rootMidi;
  const quality = third === 4 && fifth === 7 ? 'major' : third === 3 && fifth === 7 ? 'minor' : 'diminished';
  return { steps, quality, pcs: new Set([card.root, card.root + 2, card.root + 4].map((s) => stepToMidi(s) % 12)) };
}

function face(card) {
  const svgOf = (notes, fifths = 0) => {
    const view = renderScore({ id: 'card', beatsPerBar: 4, beatUnit: 4, keyFifths: fifths, staves: 1, clefs: [card.clef], notes, _normalized: true, rests: [], dynamics: [], pedal: [] }, { mode: 'scroll', showTime: false });
    return view.systems[0].svg;
  };
  const whole = (step) => ({ midi: stepToMidi(step), step, alter: 0, beat: 0, beats: 4, staff: 1, voice: 1 });
  if (card.deck === 'notes') {
    return {
      svg: renderStave({ clef: card.clef, width: 200, gap: 14, notes: [{ step: card.step, x: 130, beats: 4 }] }),
      answer: stepLetter(card.step), detail: `${stepName(card.step)} · ${CLEFS[card.clef].label} clef`,
    };
  }
  if (card.deck === 'keys') {
    const i = card.fifths + 7;
    const count = Math.abs(card.fifths);
    return {
      svg: svgOf([], card.fifths),
      answer: `${MAJOR[i]} major`, detail: `or ${MINOR[i]} minor · ${count ? `${count} ${card.fifths > 0 ? 'sharp' : 'flat'}${count > 1 ? 's' : ''}` : 'no sharps or flats'}`,
    };
  }
  if (card.deck === 'intervals') {
    return {
      svg: svgOf([whole(card.low), whole(card.low + card.size - 1)]),
      answer: intervalName(card), detail: `${stepName(card.low)} up to ${stepName(card.low + card.size - 1)}`,
      small: true,
    };
  }
  const t = triad(card);
  return {
    svg: svgOf(t.steps.map(whole)),
    answer: `${stepLetter(card.root)} ${t.quality}`, detail: `${INVERSIONS[card.inv]} · notes ${t.steps.map(stepName).join(' ')}`,
    small: true,
  };
}

// ---- Spaced repetition --------------------------------------------------------------
function pick(cards) {
  const pool = cards.filter((c) => c.id !== current?.id);
  const weights = pool.map((c) => BOX_WEIGHTS[boxes[c.id]?.box ?? 0]);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function cardStats(kind = 'notes') {
  const all = deck(kind, 'both');
  const mastered = all.filter((c) => (boxes[c.id]?.box ?? 0) >= 3).length;
  const weak = all.filter((c) => boxes[c.id]?.seen && (boxes[c.id].box ?? 0) <= 1).length;
  return { total: all.length, mastered, weak };
}

function grade(correct, message) {
  if (!current) return;
  tap(correct ? 'success' : 'error');
  const rec = boxes[current.id] ?? { box: 0, seen: 0, right: 0 };
  rec.seen++;
  if (correct) {
    logWin('cards');
    rec.right++;
    rec.box = Math.min(rec.box + 1, 4);
  } else {
    rec.box = 0;
  }
  boxes[current.id] = rec;
  save('cards', boxes);
  session.total++;
  if (correct) session.right++;
  if (message) {
    const fb = root.querySelector('#card-feedback');
    fb.textContent = message;
    fb.className = 'feedback ' + (correct ? 'good' : 'bad');
  }
  flip(true);
  setTimeout(next, correct ? 900 : 2000);
}

function flip(force) {
  flipped = force ?? !flipped;
  root.querySelector('.flashcard').classList.toggle('flipped', flipped);
}

const PROMPTS = {
  notes: 'Play the note, or flip and grade yourself',
  keys: "Play the major key's home note, or flip and grade yourself",
  intervals: 'Play both notes, or flip and grade yourself',
  chords: 'Play the chord, or flip and grade yourself',
};

function next() {
  const kind = root.querySelector('#card-deck').value;
  const clef = root.querySelector('#card-clef').value;
  current = pick(deck(kind, clef));
  flipped = false;
  pressed = [];
  const f = face(current);
  root.querySelector('.card-front .stave-wrap').replaceChildren(f.svg);
  const answer = root.querySelector('.card-back .answer');
  answer.textContent = f.answer;
  answer.classList.toggle('small', !!f.small || f.answer.length > 3);
  root.querySelector('.card-back .detail').textContent = f.detail;
  root.querySelector('.flashcard').classList.remove('flipped');
  root.querySelector('#card-feedback').textContent = '';
  root.querySelector('#card-feedback').className = 'feedback';
  root.querySelector('#card-session').textContent = session.total ? `${session.right}/${session.total} this session · ${PROMPTS[kind]}` : PROMPTS[kind];
}

// ---- Answering by playing -------------------------------------------------------------
function answerByPlaying(evt) {
  const now = performance.now();
  pressed = pressed.filter((p) => now - p.t < 1500);
  pressed.push({ midi: evt.midi, t: now });
  const c = current;
  if (c.deck === 'notes') {
    const target = stepToMidi(c.step);
    const ok = evt.midi % 12 === target % 12;
    return grade(ok, ok
      ? evt.midi === target ? `✓ ${stepName(c.step)}` : `✓ ${stepLetter(c.step)}: right letter, but this one is ${stepName(c.step)} (you played ${midiName(evt.midi)})`
      : `✗ That was ${midiName(evt.midi)}. This note is ${stepName(c.step)}.`);
  }
  if (c.deck === 'keys') {
    const tonic = (((c.fifths * 7) % 12) + 12) % 12;
    const ok = evt.midi % 12 === tonic || evt.midi % 12 === (tonic + 9) % 12;
    return grade(ok, ok ? `✓ ${MAJOR[c.fifths + 7]} major / ${MINOR[c.fifths + 7]} minor` : `✗ This is ${MAJOR[c.fifths + 7]} major (or ${MINOR[c.fifths + 7]} minor).`);
  }
  if (c.deck === 'intervals') {
    if (pressed.length < 2) return;
    const [a, b] = pressed.slice(-2).map((p) => p.midi).sort((x, y) => x - y);
    const want = stepToMidi(c.low + c.size - 1) - stepToMidi(c.low);
    const ok = b - a === want;
    return grade(ok, ok ? `✓ ${intervalName(c)}` : `✗ You played ${b - a} semitones; a ${intervalName(c)} is ${want}.`);
  }
  // chords: wait until three different notes have been pressed together
  const pcs = new Set(pressed.map((p) => p.midi % 12));
  if (pcs.size < 3) return;
  const t = triad(c);
  const ok = [...t.pcs].every((pc) => pcs.has(pc)) && pcs.size === 3;
  grade(ok, ok ? `✓ ${stepLetter(c.root)} ${t.quality}` : `✗ That's not ${stepLetter(c.root)} ${t.quality}: it's ${t.steps.map(stepName).join(' ')}.`);
}

export function mountFlashcards(el) {
  root = el;
  root.innerHTML = `
    <div class="row between wrap">
      <h2>Read</h2>
      <div class="row gap">
        <select id="card-deck" aria-label="Deck">${Object.entries(DECKS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <select id="card-clef" aria-label="Clef">
          <option value="treble">Treble</option>
          <option value="bass">Bass</option>
          <option value="both">Both</option>
        </select>
      </div>
    </div>
    <button class="flashcard" type="button" aria-label="Flip card">
      <div class="card-face card-front paper"><div class="stave-wrap"></div><span class="hint">Tap to flip</span></div>
      <div class="card-face card-back"><div class="answer"></div><div class="detail"></div></div>
    </button>
    <p id="card-feedback" class="feedback" aria-live="polite"></p>
    <div class="row gap">
      <button class="btn bad" id="card-miss" type="button">Missed it</button>
      <button class="btn good" id="card-hit" type="button">Got it</button>
    </div>
    <p class="muted center" id="card-session"></p>`;

  root.querySelector('#card-deck').value = load('cardDeck', 'notes');
  root.querySelector('#card-clef').value = load('cardClef', 'treble');
  root.querySelector('#card-deck').addEventListener('change', (e) => {
    save('cardDeck', e.target.value);
    next();
  });
  root.querySelector('#card-clef').addEventListener('change', (e) => {
    save('cardClef', e.target.value);
    next();
  });
  root.querySelector('.flashcard').addEventListener('click', () => flip());
  root.querySelector('#card-hit').addEventListener('click', () => grade(true));
  root.querySelector('#card-miss').addEventListener('click', () => grade(false));

  onNote((evt) => {
    if (evt.type !== 'on' || !current || flipped || !root.closest('.view.active')) return;
    answerByPlaying(evt);
  });

  next();
}
