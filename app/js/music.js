// Note maths + SVG stave rendering.
// A "step" is a diatonic position: octave * 7 + letter index (C=0 … B=6),
// so C4 = 28, E4 = 30 (treble bottom line), G2 = 18 (bass bottom line).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const PC_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export const CLEFS = {
  treble: { bottom: 30, glyph: '\u{1D11E}', anchorLine: 1, label: 'Treble' },
  bass: { bottom: 18, glyph: '\u{1D122}', anchorLine: 3, label: 'Bass' },
};

export const stepLetter = (s) => LETTERS[((s % 7) + 7) % 7];
export const stepOctave = (s) => Math.floor(s / 7);
export const stepName = (s) => stepLetter(s) + stepOctave(s);
export const stepToMidi = (s) => (stepOctave(s) + 1) * 12 + LETTER_SEMIS[((s % 7) + 7) % 7];
export const midiName = (m) => PC_NAMES[m % 12] + (Math.floor(m / 12) - 1);
export const isBlackKey = (m) => [1, 3, 6, 8, 10].includes(m % 12);

export function midiToStep(m) {
  const octave = Math.floor(m / 12) - 1;
  const pc = m % 12;
  let letter = LETTER_SEMIS.indexOf(pc);
  let sharp = false;
  if (letter < 0) {
    letter = LETTER_SEMIS.indexOf(pc - 1);
    sharp = true;
  }
  return { step: octave * 7 + letter, sharp };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Draw a single stave with notes.
 * notes: [{ step, sharp, x, beats, color, finger, id }]
 *   or, for a chord, [{ heads: [{ step, sharp, color }], x, beats, finger, id }]
 *   beats → glyph: 4 whole, 3 dotted half, 2 half, 1.5 dotted quarter, 1 quarter, 0.5 eighth
 * barlines: x positions.
 */
export function renderStave({ clef = 'treble', notes = [], width = 260, gap = 12, barlines = [], showClef = true, cursorX = null }) {
  // Extra headroom when chord fingerings stack above the stave.
  const maxFingers = Math.max(1, ...notes.map((n) => [].concat(n.finger ?? []).length));
  const padTop = gap * 4 + (maxFingers - 1) * gap * 1.05;
  const height = padTop + gap * 4 + gap * 4;
  const bottomY = padTop + gap * 4;
  const ref = CLEFS[clef].bottom;
  const yOf = (step) => bottomY - (step - ref) * (gap / 2);

  const svg = el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    class: 'stave',
    role: 'img',
  });

  for (let i = 0; i < 5; i++) {
    const y = padTop + i * gap;
    svg.append(el('line', { x1: 4, x2: width - 4, y1: y, y2: y, class: 'stave-line' }));
  }
  svg.append(el('line', { x1: 4, x2: 4, y1: padTop, y2: bottomY, class: 'stave-line' }));
  svg.append(el('line', { x1: width - 4, x2: width - 4, y1: padTop, y2: bottomY, class: 'bar-line' }));
  for (const x of barlines) {
    svg.append(el('line', { x1: x, x2: x, y1: padTop, y2: bottomY, class: 'bar-line' }));
  }

  if (showClef) {
    const anchorY = bottomY - CLEFS[clef].anchorLine * gap;
    svg.append(el('text', { x: 10, y: anchorY, class: 'clef', 'font-size': gap * 4 }, CLEFS[clef].glyph));
  }

  if (cursorX != null) {
    svg.append(el('rect', { x: cursorX - gap, y: padTop - gap * 2, width: gap * 2, height: gap * 8, rx: 4, class: 'cursor' }));
  }

  const rx = gap * 0.62;
  const ry = gap * 0.44;
  for (const n of notes) {
    const heads = (n.heads ?? [{ step: n.step, sharp: n.sharp, color: n.color }]).slice().sort((a, b) => a.step - b.step);
    const lo = heads[0].step;
    const hi = heads[heads.length - 1].step;
    const single = heads.length === 1;
    const g = el('g', { class: 'note' + (single && heads[0].color ? ` note-${heads[0].color}` : '') });
    if (n.id != null) g.dataset.id = n.id;

    // Ledger lines
    const ledger = (s) => g.append(el('line', { x1: n.x - rx * 1.7, x2: n.x + rx * 1.7, y1: yOf(s), y2: yOf(s), class: 'stave-line' }));
    for (let s = ref - 2; s >= lo; s -= 2) ledger(s);
    for (let s = ref + 10; s <= hi; s += 2) ledger(s);

    const beats = n.beats ?? 1;
    const open = beats >= 2;
    for (const h of heads) {
      const hy = yOf(h.step);
      const head = el('ellipse', {
        cx: n.x, cy: hy, rx, ry,
        transform: `rotate(-20 ${n.x} ${hy})`,
        class: open ? 'head open' : 'head',
      });
      if (single) {
        g.append(head);
      } else {
        const wrap = el('g', { class: h.color ? `note-${h.color}` : '' });
        wrap.append(head);
        g.append(wrap);
      }
      // Same font metrics as render.js: a sharp's visual centre sits 0.135 × size above its baseline.
      if (h.sharp) g.append(el('text', { x: n.x - rx - gap * 1.4, y: hy + gap * 3.7 * 0.135, class: 'accidental', 'font-size': gap * 3.7 }, '♯'));
    }

    if (beats < 4) {
      // Stem direction follows the note furthest from the middle line.
      const down = (hi - (ref + 4)) > ((ref + 4) - lo) || (single && lo >= ref + 4);
      const sx = down ? n.x - rx + 0.8 : n.x + rx - 0.8;
      const sy1 = down ? yOf(hi) : yOf(lo);
      const sy2 = down ? yOf(lo) + gap * 3.4 : yOf(hi) - gap * 3.4;
      g.append(el('line', { x1: sx, x2: sx, y1: sy1, y2: sy2, class: 'stem' }));
      if (beats === 0.5) {
        const dir = down ? -1 : 1;
        g.append(el('path', {
          d: `M${sx} ${sy2} q ${gap * 0.9} ${dir * gap * 0.9} ${gap * 0.6} ${dir * gap * 2}`,
          class: 'flag',
        }));
      }
    }
    if (beats === 3 || beats === 1.5) {
      for (const h of heads) {
        const onLine = (h.step - ref) % 2 === 0;
        g.append(el('circle', { cx: n.x + rx + 4, cy: onLine ? yOf(h.step) - gap / 2 : yOf(h.step), r: 1.8, class: 'dot' }));
      }
    }
    if (n.finger) {
      // Chord fingering stacks top finger first, as printed in method books.
      const fingers = [].concat(n.finger).slice().reverse();
      fingers.forEach((f, k) => g.append(el('text', {
        x: n.x, y: padTop - gap * (2.6 + (fingers.length - 1 - k) * 1.05),
        class: 'finger', 'text-anchor': 'middle', 'font-size': gap * 0.95,
      }, f)));
    }
    svg.append(g);
  }
  return svg;
}
