// Sheet-music renderer for score.js scores: one or two staves (grand staff), key and
// time signatures, accidentals with bar carry, flags, dots, ties, rests, dynamics,
// articulation, ornaments, pedal marks and fingering. Scroll (one long system) or
// page (systems wrapped to the available width) layout. Returns SVG elements.
import { normalize, keyAlters, totalBeats } from './score.js';
import { CLEFS } from './music.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GAP = 10; // staff space in px
const STAFF_GAP = GAP * 7; // between the two staves of a grand staff
const KEY_SHARP_STEPS = { treble: [38, 35, 39, 36, 33, 37, 34], bass: [24, 21, 25, 22, 19, 23, 20] };
const KEY_FLAT_STEPS = { treble: [34, 37, 33, 36, 32, 35, 31], bass: [20, 23, 19, 22, 18, 21, 17] };
const ACC = { '-2': '𝄫', '-1': '♭', 0: '♮', 1: '♯', 2: '𝄪' };
const GLYPHS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125];
// Accidentals in Noto Music, measured from the font's ink: at font size F a flat's ink
// spans −0.62F…+0.04F above/below the baseline (its bowl centre sits ~0.075F above),
// a sharp −0.51F…+0.24F, a natural −0.49F…+0.21F. Each is placed so its visual centre
// (a flat's bowl) lands on the note's line or space.
const ACC_SIZE = 3.7; // × staff space
const ACC_CENTRE = { '♭': 0.075, '𝄫': 0.075, '♯': 0.135, '𝄪': 0.135, '♮': 0.14 };
const KEY_STEP = 11; // px between key-signature accidentals
function accidental(glyph, x, y, scale = 1) {
  const size = GAP * ACC_SIZE * scale;
  return el('text', { x, y: y + size * (ACC_CENTRE[glyph] ?? 0.12), class: 'accidental', 'font-size': size }, glyph);
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

// Largest drawable note value ≤ beats; longer odd durations draw as a tied chain.
function splitDuration(beats) {
  const parts = [];
  let left = beats;
  while (left > 0.06) {
    const g = GLYPHS.find((x) => x <= left + 1e-6) ?? 0.125;
    parts.push(g);
    left -= g;
  }
  return parts.length ? parts : [0.125];
}

export function pxPerBeat(score) {
  const minDur = Math.min(1, ...score.notes.filter((n) => !n.grace).map((n) => n.beats));
  return Math.max(36, Math.min(110, 24 / minDur));
}

/**
 * opts: { mode: 'scroll'|'page', width (page mode), statusOf(note) → colour class | null,
 *         dimStaff (1|2: the hand not being practised), barOffset }
 * Returns { systems: [{ svg, fromBeat, toBeat }], locate(beat) → { system, x },
 *           setCursor(beat | null) → the system the cursor is now in }.
 */
export function renderScore(piece, opts = {}) {
  const s = normalize(piece);
  const mode = opts.mode ?? 'scroll';
  const ppb = pxPerBeat(s);
  const bpb = s.beatsPerBar;
  const bars = Math.max(1, Math.round(totalBeats(s) / bpb));
  const two = s.staves === 2;
  const clefs = two ? [s.clefs[0] ?? 'treble', s.clefs[1] ?? 'bass'] : [s.clefs[0] ?? 'treble'];
  const keyCount = Math.abs(s.keyFifths);
  const head = 46 + keyCount * KEY_STEP; // clef + key signature
  const timeSigW = 22;
  const barW = bpb * ppb + 14;
  const avail = (opts.width ?? 9999) - head - 12;
  const perSystem = mode === 'page' ? Math.max(1, Math.floor(avail / barW)) : bars;

  // timeline index for each note (timeline sorts by beat then pitch and drops tie stops)
  const order = s.notes
    .map((n, k) => ({ n, k }))
    .filter(({ n }) => !n.tieStop)
    .sort((a, b) => a.n.beat - b.n.beat || a.n.midi - b.n.midi);
  const tlIndex = new Map(order.map(({ k }, i) => [k, i]));

  const systems = [];
  const positions = [];
  for (let first = 0; first < bars; first += perSystem) {
    const last = Math.min(bars, first + perSystem);
    const showTime = first === 0 && opts.showTime !== false;
    const left = head + (showTime ? timeSigW : 0);
    const fromBeat = first * bpb;
    const toBeat = last * bpb;
    const xOf = (beat) => left + (beat - fromBeat) * ppb + Math.floor((beat - fromBeat) / bpb + 1e-9) * 14 + 10;
    const width = xOf(toBeat) + 6;
    const topPad = GAP * 5;
    const staffTop = (st) => topPad + (st - 1) * (GAP * 4 + STAFF_GAP);
    const height = staffTop(clefs.length) + GAP * 4 + GAP * 6;
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'stave score', role: 'img', 'aria-label': `${s.title}, bars ${first + 1 + (opts.barOffset ?? s.barOffset ?? 0)} to ${last + (opts.barOffset ?? s.barOffset ?? 0)}` });
    const bottomY = (st) => staffTop(st) + GAP * 4;
    const ref = (st) => CLEFS[clefs[st - 1]].bottom;
    const yOf = (st, step) => bottomY(st) - (step - ref(st)) * (GAP / 2);

    // Staves, clefs, key and time signatures
    clefs.forEach((clef, idx) => {
      const st = idx + 1;
      for (let i = 0; i < 5; i++) svg.append(el('line', { x1: 8, x2: width - 4, y1: staffTop(st) + i * GAP, y2: staffTop(st) + i * GAP, class: 'stave-line' }));
      svg.append(el('text', { x: 14, y: bottomY(st) - CLEFS[clef].anchorLine * GAP, class: 'clef', 'font-size': GAP * 4 }, CLEFS[clef].glyph));
      const steps = s.keyFifths > 0 ? KEY_SHARP_STEPS[clef] : KEY_FLAT_STEPS[clef];
      for (let i = 0; i < keyCount; i++) {
        svg.append(accidental(s.keyFifths > 0 ? '♯' : '♭', 44 + i * KEY_STEP, yOf(st, steps[i])));
      }
      if (showTime) {
        [bpb, s.beatUnit].forEach((num, k) => svg.append(el('text', { x: head + 6, y: staffTop(st) + GAP * (k ? 3.85 : 1.85), class: 'timesig', 'font-size': GAP * 2.2 }, num)));
      }
    });
    const sysTop = staffTop(1);
    const sysBottom = bottomY(clefs.length);
    svg.append(el('line', { x1: 8, x2: 8, y1: sysTop, y2: sysBottom, class: 'bar-line' }));
    if (two) svg.append(el('path', { d: `M5 ${sysTop} q -6 ${(sysBottom - sysTop) / 4} 0 ${(sysBottom - sysTop) / 2} q 6 ${(sysBottom - sysTop) / 4} 0 ${(sysBottom - sysTop) / 2}`, class: 'brace' }));
    for (let b = first + 1; b <= last; b++) {
      const x = xOf(b * bpb) - 8;
      svg.append(el('line', { x1: x, x2: x, y1: sysTop, y2: sysBottom, class: b === bars ? 'bar-line final' : 'bar-line' }));
    }
    // Bar numbers at the start of each system after the first
    const offset = opts.barOffset ?? s.barOffset ?? 0;
    if (first > 0) svg.append(el('text', { x: 8, y: sysTop - GAP * 1.2, class: 'barnum' }, first + 1 + offset));

    // One cursor per system, moved by setCursor() — never a full re-render.
    const cursor = el('rect', { x: 0, y: sysTop - GAP * 2, width: GAP * 2, height: sysBottom - sysTop + GAP * 4, rx: 4, class: 'cursor', visibility: 'hidden' });
    svg.append(cursor);

    // Rests
    for (const r of s.rests) {
      if (r.beat < fromBeat || r.beat >= toBeat) continue;
      const st = Math.min(r.staff ?? 1, clefs.length);
      const g = GLYPHS.find((x) => x <= r.beats + 1e-6) ?? 0.125;
      const glyph = { 4: '\u{1D13B}', 3: '\u{1D13C}', 2: '\u{1D13C}', 1.5: '\u{1D13D}', 1: '\u{1D13D}', 0.75: '\u{1D13E}', 0.5: '\u{1D13E}', 0.375: '\u{1D13F}', 0.25: '\u{1D13F}', 0.125: '\u{1D140}' }[g];
      svg.append(el('text', { x: xOf(r.beat) - 4, y: staffTop(st) + GAP * (g >= 2 ? (g >= 4 ? 1 : 2) : 2.9), class: 'rest', 'font-size': GAP * 3.2 }, glyph));
    }

    // Notes: group by (staff, voice, beat) → one stem per group
    const groups = new Map();
    s.notes.forEach((n, k) => {
      if (n.tieStop || n.beat < fromBeat - 1e-6 || n.beat >= toBeat - 1e-6) return;
      const key = `${Math.min(n.staff ?? 1, clefs.length)}|${n.voice ?? 1}|${n.beat.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ n, k });
    });
    const voicesPerStaff = new Map();
    for (const key of groups.keys()) {
      const [st, v] = key.split('|');
      if (!voicesPerStaff.has(st)) voicesPerStaff.set(st, new Set());
      voicesPerStaff.get(st).add(v);
    }

    // Accidentals carry through the bar per staff
    const carried = new Map();
    const ka = keyAlters(s.keyFifths);
    const accidentalFor = (st, n) => {
      const barNo = Math.floor(n.beat / bpb + 1e-9);
      const key = `${st}|${barNo}|${n.step}`;
      const current = carried.has(key) ? carried.get(key) : ka[((n.step % 7) + 7) % 7];
      carried.set(key, n.alter ?? 0);
      return (n.alter ?? 0) === current ? null : ACC[n.alter ?? 0];
    };

    const sortedGroups = [...groups.entries()].sort((a, b) => a[1][0].n.beat - b[1][0].n.beat);
    for (const [key, members] of sortedGroups) {
      const [stS, vS] = key.split('|');
      const st = Number(stS);
      const multiVoice = voicesPerStaff.get(stS).size > 1;
      const beat = members[0].n.beat;
      const grace = members.every(({ n }) => n.grace);
      const scale = grace ? 0.62 : 1;
      const rx = GAP * 0.62 * scale;
      const ry = GAP * 0.44 * scale;
      const x = xOf(beat) + (grace ? -GAP * 1.3 : 0);
      const beatsShown = grace ? 0.5 : Math.max(...members.map(({ n }) => n.beats));
      const parts = grace ? [0.5] : splitDuration(beatsShown);
      const steps = members.map(({ n }) => n.step);
      const lo = Math.min(...steps);
      const hi = Math.max(...steps);
      const mid = ref(st) + 4;
      const down = multiVoice ? vS !== '1' : hi - mid > mid - lo || (lo === hi && lo >= mid);
      const g = el('g', { class: 'note' + (grace ? ' grace' : '') + (opts.dimStaff === st ? ' dim' : '') });

      // Ledger lines
      const ledger = (step) => g.append(el('line', { x1: x - rx * 1.7, x2: x + rx * 1.7, y1: yOf(st, step), y2: yOf(st, step), class: 'stave-line' }));
      for (let step = ref(st) - 2; step >= lo; step -= 2) ledger(step);
      for (let step = ref(st) + 10; step <= hi; step += 2) ledger(step);

      const value = parts[0];
      const open = value >= 2;
      // Seconds in a chord: alternate heads to the other side of the stem.
      const sortedSteps = [...members].sort((a, b) => a.n.step - b.n.step);
      let prevStep = null;
      let flip = false;
      for (const { n, k } of sortedSteps) {
        flip = prevStep != null && n.step - prevStep === 1 ? !flip : false;
        prevStep = n.step;
        const hx = x + (flip ? (down ? -1 : 1) * rx * 2 : 0);
        const hy = yOf(st, n.step);
        const colour = opts.statusOf?.(n);
        const hg = el('g', { class: colour ? `note-${colour}` : '' });
        hg.append(el('ellipse', { cx: hx, cy: hy, rx, ry, transform: `rotate(-20 ${hx} ${hy})`, class: open ? 'head open' : 'head' }));
        const acc = accidentalFor(st, n);
        if (acc) hg.append(accidental(acc, x - rx - GAP * 1.4 * scale, hy, scale));
        if (value === 3 || value === 1.5 || value === 0.75 || value === 0.375) {
          const onLine = (n.step - ref(st)) % 2 === 0;
          hg.append(el('circle', { cx: x + rx + 5, cy: onLine ? hy - GAP / 2 : hy, r: 1.7, class: 'dot' }));
        }
        if (n.artic === 'staccato') hg.append(el('circle', { cx: x, cy: hy + (down ? -1 : 1) * GAP * 1.1, r: 1.6, class: 'dot' }));
        if (n.artic === 'accent') hg.append(el('text', { x: x - 5, y: hy + (down ? -1.3 : 2.1) * GAP, class: 'mark' }, '>'));
        g.append(hg);
        positions.push({ i: tlIndex.get(k), system: systems.length, x });
      }

      if (value < 4) {
        const sx = down ? x - rx + 0.8 : x + rx - 0.8;
        const sy1 = down ? yOf(st, hi) : yOf(st, lo);
        const sy2 = down ? yOf(st, lo) + GAP * 3.4 * scale : yOf(st, hi) - GAP * 3.4 * scale;
        g.append(el('line', { x1: sx, x2: sx, y1: sy1, y2: sy2, class: 'stem' }));
        const flags = value <= 0.125 ? 3 : value <= 0.25 ? 2 : value <= 0.5 ? 1 : 0;
        for (let f = 0; f < flags; f++) {
          const dir = down ? -1 : 1;
          const y0 = sy2 + dir * f * GAP * 0.8;
          g.append(el('path', { d: `M${sx} ${y0} q ${GAP * 0.9} ${dir * GAP * 0.9} ${GAP * 0.6} ${dir * GAP * 2}`, class: 'flag' }));
        }
        if (grace) g.append(el('line', { x1: sx - 4, x2: sx + 6, y1: sy2 + (down ? -6 : 6), y2: sy2 + (down ? 2 : -2), class: 'stem' }));
      }
      // Tied continuation of long/odd values (e.g. 1.75 beats = dotted quarter + sixteenth)
      if (parts.length > 1 && !grace) {
        const y = yOf(st, down ? hi : lo) + (down ? -1 : 1) * GAP * 0.9;
        const x2 = xOf(beat + value);
        g.append(el('path', { d: `M${x + 3} ${y} Q ${(x + x2) / 2} ${y + (down ? -1 : 1) * GAP * 0.9} ${x2 - 3} ${y}`, class: 'tie' }));
        let b = beat + value;
        for (const part of parts.slice(1)) {
          if (b >= toBeat - 1e-6) break; // continues on the next system
          const px = xOf(b);
          for (const step of steps) g.append(el('ellipse', { cx: px, cy: yOf(st, step), rx: rx * 0.9, ry: ry * 0.9, transform: `rotate(-20 ${px} ${yOf(st, step)})`, class: part >= 2 ? 'head open tied' : 'head tied' }));
          b += part;
        }
      }
      // Fingering: above the top staff, below the bottom one
      const fingers = members.map(({ n }) => n.finger).filter((f) => f != null);
      if (fingers.length) {
        const above = st === 1;
        const list = [...fingers].reverse();
        list.forEach((f, idx) => g.append(el('text', {
          x, y: above ? staffTop(st) - GAP * (1.8 + (list.length - 1 - idx) * 1.05) : bottomY(st) + GAP * (2.4 + idx * 1.05),
          class: 'finger', 'text-anchor': 'middle', 'font-size': GAP * 0.95,
        }, f)));
      }
      // Ornaments
      const orn = members.find(({ n }) => n.ornament)?.n.ornament;
      if (orn) g.append(el('text', { x: x - 6, y: staffTop(st) - GAP * 1.2, class: 'ornament' }, { trill: 'tr', mordent: '\u{1D19D}', turn: '\u{1D197}' }[orn] ?? orn));
      svg.append(g);
    }

    // Dynamics (below the top staff) and pedal marks (below the bottom staff)
    for (const d of s.dynamics) {
      if (d.beat < fromBeat || d.beat >= toBeat) continue;
      svg.append(el('text', { x: xOf(d.beat) - 4, y: bottomY(1) + GAP * (two ? 2.6 : 3.6), class: 'dynamic' }, d.mark));
    }
    for (const p of s.pedal) {
      if (p.start >= toBeat || p.end <= fromBeat) continue;
      const y = bottomY(clefs.length) + GAP * 4.4;
      if (p.start >= fromBeat) svg.append(el('text', { x: xOf(p.start) - 6, y, class: 'pedal' }, 'Ped.'));
      if (p.end <= toBeat) svg.append(el('text', { x: xOf(p.end) - 10, y, class: 'pedal' }, '*'));
    }
    systems.push({ svg, fromBeat, toBeat, xOf, cursor });
  }

  return {
    systems,
    locate(beat) {
      const idx = Math.max(0, systems.findIndex((sy) => beat >= sy.fromBeat && beat < sy.toBeat));
      return { system: idx, x: systems[idx].xOf(beat) };
    },
    positions,
    setCursor(beat) {
      let found = null;
      systems.forEach((sy, i) => {
        const here = beat != null && beat >= sy.fromBeat - 1e-6 && beat < sy.toBeat - 1e-6;
        sy.cursor.setAttribute('visibility', here ? 'visible' : 'hidden');
        if (here) {
          sy.cursor.setAttribute('x', sy.xOf(beat) - GAP);
          found = { system: i, x: sy.xOf(beat) };
        }
      });
      return found;
    },
  };
}
