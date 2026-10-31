// SCN1: the short note-by-note text the photo scanner returns (much cheaper to generate
// than MusicXML). This turns it into MusicXML so scans go through the normal import.
//
//   SCN1
//   TITLE Minuet in G
//   KEY 1            fifths: -7..7 (flats negative)
//   TIME 3/4
//   CLEF L G         optional: left hand in treble (default R G, L F)
//   BAR
//   R: D5/q G4/e A4/e B4/e C5/e
//   L: G3+B3+D4/h.
//   BAR
//   ...
// A token is pitches/duration: pitches are r (rest) or notes joined with +, each a
// letter, optional # ## b bb, and octave (C4 = middle C), written as they sound (key
// signature applied). Durations w h q e s t (32nd), optional . for dotted, optional ~
// to tie into the next note of the same pitch. KEY, TIME and CLEF before a BAR change
// from that bar on. A piece with no L: lines is a single stave.

const DIV = 8; // divisions per crotchet
const DUR = { w: 32, h: 16, q: 8, e: 4, s: 2, t: 1 };
const TYPE = { w: 'whole', h: 'half', q: 'quarter', e: 'eighth', s: '16th', t: '32nd' };
const ALTER = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 };
const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAX_BARS = 400;

const xmlEsc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function token(t, where) {
  const m = /^(r|[A-G](?:##|#|bb|b)?-?\d(?:\+[A-G](?:##|#|bb|b)?-?\d)*)\/([whqest])(\.?)(~?)$/.exec(t);
  if (!m) throw new Error(`${where}: can't read "${t}"`);
  if (m[2] === 't' && m[3]) throw new Error(`${where}: a dotted 32nd isn't supported`);
  const notes = m[1] === 'r' ? [] : m[1].split('+').map((p) => {
    const [, step, acc, oct] = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(p);
    return { step, alter: ALTER[acc ?? ''], octave: Number(oct), midi: 12 * (Number(oct) + 1) + STEPS[step] + ALTER[acc ?? ''] };
  });
  return { notes, dur: DUR[m[2]] * (m[3] ? 1.5 : 1), type: TYPE[m[2]], dot: Boolean(m[3]), tie: Boolean(m[4]) };
}

/** Parse SCN1 text into { title, bars: [{ attrs, R, L }] }. Throws with a line number on bad input. */
export function parseScn(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0] !== 'SCN1') throw new Error('Not a scan result');
  let title = 'Scanned piece';
  let pending = {};
  const bars = [];
  lines.slice(1).forEach((line, i) => {
    const where = `line ${i + 2}`;
    const [word, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    if (word === 'TITLE') title = arg.slice(0, 120) || title;
    else if (word === 'KEY') {
      const k = Number(arg);
      if (!Number.isInteger(k) || k < -7 || k > 7) throw new Error(`${where}: bad key "${arg}"`);
      pending.key = k;
    } else if (word === 'TIME') {
      const m = /^(\d{1,2})\/(1|2|4|8|16)$/.exec(arg);
      if (!m) throw new Error(`${where}: bad time "${arg}"`);
      pending.time = [Number(m[1]), Number(m[2])];
    } else if (word === 'CLEF') {
      const m = /^([RL])\s+([GF])$/.exec(arg);
      if (!m) throw new Error(`${where}: bad clef "${arg}"`);
      pending[`clef${m[1]}`] = m[2];
    } else if (word === 'BAR') {
      if (bars.length >= MAX_BARS) throw new Error('Too many bars');
      bars.push({ attrs: pending, R: [], L: [] });
      pending = {};
    } else if (word === 'R:' || word === 'L:') {
      const bar = bars[bars.length - 1];
      if (!bar) throw new Error(`${where}: notes before the first BAR`);
      bar[word[0]].push(...rest.map((t) => token(t, where)));
    } else {
      throw new Error(`${where}: unknown "${word}"`);
    }
  });
  if (!bars.some((b) => b.R.length || b.L.length)) throw new Error('No notes found');
  return { title, bars };
}

function notesXml(tokens, staff, tiedIn) {
  let out = '';
  for (const t of tokens) {
    const head = `<duration>${t.dur}</duration>`;
    const tail = `<voice>${staff === 1 ? 1 : 5}</voice><type>${t.type}</type>${t.dot ? '<dot/>' : ''}<staff>${staff}</staff>`;
    if (!t.notes.length) { out += `<note><rest/>${head}${tail}</note>`; tiedIn.clear(); continue; }
    const nextTied = new Set();
    t.notes.forEach((n, k) => {
      const stop = tiedIn.has(n.midi);
      const ties = `${stop ? '<tie type="stop"/>' : ''}${t.tie ? '<tie type="start"/>' : ''}`;
      const tied = `${stop ? '<tied type="stop"/>' : ''}${t.tie ? '<tied type="start"/>' : ''}`;
      out += `<note>${k ? '<chord/>' : ''}<pitch><step>${n.step}</step>${n.alter ? `<alter>${n.alter}</alter>` : ''}<octave>${n.octave}</octave></pitch>${head}${ties}${tail}${tied ? `<notations>${tied}</notations>` : ''}</note>`;
      if (t.tie) nextTied.add(n.midi);
    });
    tiedIn.clear();
    nextTied.forEach((m) => tiedIn.add(m));
  }
  return out;
}

/** SCN1 text → a MusicXML string the normal importer reads. */
export function scnToMusicXML(text) {
  const { title, bars } = parseScn(text);
  const two = bars.some((b) => b.L.length);
  const tiedR = new Set();
  const tiedL = new Set();
  const measures = bars.map((b, i) => {
    const a = i === 0 ? { key: 0, time: [4, 4], clefR: 'G', clefL: 'F', ...b.attrs } : b.attrs;
    const clef = (n, sign) => `<clef number="${n}"><sign>${sign}</sign><line>${sign === 'G' ? 2 : 4}</line></clef>`;
    const attrs = i === 0 || Object.keys(a).length
      ? `<attributes>${i === 0 ? `<divisions>${DIV}</divisions>` : ''}${a.key != null ? `<key><fifths>${a.key}</fifths></key>` : ''}${a.time ? `<time><beats>${a.time[0]}</beats><beat-type>${a.time[1]}</beat-type></time>` : ''}${i === 0 && two ? '<staves>2</staves>' : ''}${a.clefR ? clef(1, a.clefR) : ''}${two && a.clefL ? clef(2, a.clefL) : ''}</attributes>`
      : '';
    const rLen = b.R.reduce((s, t) => s + t.dur, 0);
    const left = two && b.L.length ? `${rLen ? `<backup><duration>${rLen}</duration></backup>` : ''}${notesXml(b.L, 2, tiedL)}` : '';
    return `<measure number="${i + 1}">${attrs}${notesXml(b.R, 1, tiedR)}${left}</measure>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><work><work-title>${xmlEsc(title)}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}
