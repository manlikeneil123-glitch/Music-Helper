// Sheet-music renderer for score.js scores: one or two staves (grand staff), key and
// time signatures (and changes), clef changes, accidentals with bar carry, beams and
// flags, dots, ties, tuplets, slurs, hairpins, 8va/8vb, rests, dynamics, articulation,
// ornaments, pedal marks and fingering. Scroll (one long system) or page (systems
// wrapped to the available width) layout. Returns SVG elements.
import { normalize, keyAlters, totalBeats, barMap } from './score.js';
import { CLEFS } from './music.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GAP = 10; // staff space in px
const STAFF_GAP = GAP * 7; // between the two staves of a grand staff
const KEY_SHARP_STEPS = { treble: [38, 35, 39, 36, 33, 37, 34], bass: [24, 21, 25, 22, 19, 23, 20] };
const KEY_FLAT_STEPS = { treble: [34, 37, 33, 36, 32, 35, 31], bass: [20, 23, 19, 22, 18, 21, 17] };
const ACC = { '-2': '𝄫', '-1': '♭', 0: '♮', 1: '♯', 2: '𝄪' };
const GLYPHS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125]; // in crotchets
const TYPE_Q = { breve: 8, whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625 };
// A printed note type + dots, in crotchets (a dotted crotchet = 1.5).
function typeValue({ type, dots = 0 }) {
  let v = TYPE_Q[type];
  if (!v) return null;
  let add = v;
  for (let i = 0; i < dots; i++) v += (add /= 2);
  return v;
}
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
  const q = 4 / (s.beatUnit || 4); // crotchets per beat (0.5 in 6/8: the beat is a quaver)
  const map = barMap(s);
  const clefChanges = [...(s.clefChanges ?? [])].sort((a, b) => a.beat - b.beat);
  const bars = Math.max(1, map.count);
  const meterAt = new Map((map.uniform ? [] : map.starts.slice(1, -1).map((b, i) => [i + 1, map.lengthOf(i + 1)])).filter(([i, len]) => len !== map.lengthOf(i - 1)));
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
    const fromBeat = map.starts[first];
    const toBeat = map.starts[last];
    // 14px of breathing room after every barline (plus room for a new time signature).
    const gapsBefore = (beat) => {
      const idx = Math.min(map.indexAt(beat), last) - first;
      let extra = 0;
      for (const bar of meterAt.keys()) if (bar > first && bar <= first + idx) extra += 18;
      return idx * 14 + extra;
    };
    const xOf = (beat) => left + (beat - fromBeat) * ppb + gapsBefore(beat) + 10;
    const width = xOf(toBeat) + 6;
    const topPad = GAP * 5;
    const staffTop = (st) => topPad + (st - 1) * (GAP * 4 + STAFF_GAP);
    const height = staffTop(clefs.length) + GAP * 4 + GAP * 6;
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'stave score', role: 'img', 'aria-label': `${s.title}, bars ${first + 1 + (opts.barOffset ?? s.barOffset ?? 0)} to ${last + (opts.barOffset ?? s.barOffset ?? 0)}` });
    const bottomY = (st) => staffTop(st) + GAP * 4;
    const clefAt = (st, beat) => clefChanges.filter((c) => c.staff === st && c.beat <= beat + 1e-6).pop()?.clef ?? clefs[st - 1];
    const ref = (st, beat = fromBeat) => CLEFS[clefAt(st, beat)].bottom;
    const yOf = (st, step, beat = fromBeat) => bottomY(st) - (step - ref(st, beat)) * (GAP / 2);

    // Staves, clefs, key and time signatures
    clefs.map((_, idx) => clefAt(idx + 1, fromBeat)).forEach((clef, idx) => {
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
      const x = xOf(map.starts[b]) - 8 - (meterAt.has(b) ? 18 : 0);
      // A new time signature, just after its barline.
      if (meterAt.has(b) && b < last) {
        clefs.forEach((_, idx) => [meterAt.get(b), s.beatUnit].forEach((num, k) => svg.append(el('text', { x: x + 5, y: staffTop(idx + 1) + GAP * (k ? 3.85 : 1.85), class: 'timesig', 'font-size': GAP * 2.2 }, num))));
      }
      svg.append(el('line', { x1: x, x2: x, y1: sysTop, y2: sysBottom, class: b === bars ? 'bar-line final' : 'bar-line' }));
    }
    // Clef changes within the system: a smaller clef just before the beat.
    for (const c of clefChanges) {
      if (c.beat <= fromBeat + 1e-6 || c.beat >= toBeat - 1e-6 || c.staff > clefs.length) continue;
      svg.append(el('text', { x: xOf(c.beat) - GAP * 2.6, y: bottomY(c.staff) - CLEFS[c.clef].anchorLine * GAP, class: 'clef change', 'font-size': GAP * 3 }, CLEFS[c.clef].glyph));
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
      const g = GLYPHS.find((x) => x <= r.beats * q + 1e-6) ?? 0.125;
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
      const barNo = map.indexAt(n.beat);
      const key = `${st}|${barNo}|${n.step}`;
      const current = carried.has(key) ? carried.get(key) : ka[((n.step % 7) + 7) % 7];
      carried.set(key, n.alter ?? 0);
      return (n.alter ?? 0) === current ? null : ACC[n.alter ?? 0];
    };

    const sortedGroups = [...groups.entries()].sort((a, b) => a[1][0].n.beat - b[1][0].n.beat);
    const stems = []; // drawn after all heads, so beamed groups can share a beam
    const heads = new Map(); // `${staff}|${voice}|${beat}` → { top, bottom, down } for slurs
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
      const R = ref(st, beat);
      const Y = (step) => yOf(st, step, beat);
      // Printed type when the file gives one (triplets, compound time); else the length.
      const shown = members[0].n.display;
      const printed = !grace && shown && members.every(({ n }) => n.display?.type === shown.type) ? typeValue(shown) : null;
      const beatsShown = grace ? 0.5 : Math.max(...members.map(({ n }) => n.beats));
      const parts = grace ? [0.5] : printed ? [printed] : splitDuration(beatsShown * q);
      const dstep = (n) => n.step + 7 * (n.ottava ?? 0); // where it's drawn (8va moves it down)
      const steps = members.map(({ n }) => dstep(n));
      const lo = Math.min(...steps);
      const hi = Math.max(...steps);
      const mid = R + 4;
      const down = multiVoice ? vS !== '1' : hi - mid > mid - lo || (lo === hi && lo >= mid);
      const g = el('g', { class: 'note' + (grace ? ' grace' : '') + (opts.dimStaff === st ? ' dim' : '') });

      // Ledger lines
      const ledger = (step) => g.append(el('line', { x1: x - rx * 1.7, x2: x + rx * 1.7, y1: Y(step), y2: Y(step), class: 'stave-line' }));
      for (let step = R - 2; step >= lo; step -= 2) ledger(step);
      for (let step = R + 10; step <= hi; step += 2) ledger(step);

      const value = parts[0];
      const open = value >= 2;
      const dotted = printed ? shown.dots > 0 : [3, 1.5, 0.75, 0.375].includes(value);
      // Seconds in a chord: alternate heads to the other side of the stem.
      const sortedSteps = [...members].sort((a, b) => dstep(a.n) - dstep(b.n));
      let prevStep = null;
      let flip = false;
      for (const { n, k } of sortedSteps) {
        const ds = dstep(n);
        flip = prevStep != null && ds - prevStep === 1 ? !flip : false;
        prevStep = ds;
        const hx = x + (flip ? (down ? -1 : 1) * rx * 2 : 0);
        const hy = Y(ds);
        const colour = opts.statusOf?.(n);
        const hg = el('g', { class: colour ? `note-${colour}` : '' });
        hg.append(el('ellipse', { cx: hx, cy: hy, rx, ry, transform: `rotate(-20 ${hx} ${hy})`, class: open ? 'head open' : 'head' }));
        const acc = accidentalFor(st, n);
        if (acc) hg.append(accidental(acc, x - rx - GAP * 1.4 * scale, hy, scale));
        if (dotted) {
          const onLine = (ds - R) % 2 === 0;
          hg.append(el('circle', { cx: x + rx + 5, cy: onLine ? hy - GAP / 2 : hy, r: 1.7, class: 'dot' }));
        }
        if (n.artic === 'staccato') hg.append(el('circle', { cx: x, cy: hy + (down ? -1 : 1) * GAP * 1.1, r: 1.6, class: 'dot' }));
        if (n.artic === 'accent') hg.append(el('text', { x: x - 5, y: hy + (down ? -1.3 : 2.1) * GAP, class: 'mark' }, '>'));
        g.append(hg);
        positions.push({ i: tlIndex.get(k), system: systems.length, x });
      }
      heads.set(`${st}|${vS}|${+beat.toFixed(4)}`, { top: Y(hi), bottom: Y(lo), down });

      if (value < 4) {
        stems.push({
          g, x, rx, down, value, st, voice: vS, beat, beats: beatsShown, grace, scale, top: Y(hi), bottom: Y(lo),
          // Anything with a flag (a dotted quaver too) can join a beam.
          beamable: !grace && value < 1 && parts.length === 1, tuplet: members[0].n.tuplet, tupletStart: members.some(({ n }) => n.tupletStart),
        });
      }
      // Tied continuation of long/odd values (e.g. 1.75 beats = dotted quarter + sixteenth)
      if (parts.length > 1 && !grace) {
        const y = Y(down ? hi : lo) + (down ? -1 : 1) * GAP * 0.9;
        const x2 = xOf(beat + value / q);
        g.append(el('path', { d: `M${x + 3} ${y} Q ${(x + x2) / 2} ${y + (down ? -1 : 1) * GAP * 0.9} ${x2 - 3} ${y}`, class: 'tie' }));
        let b = beat + value / q;
        for (const part of parts.slice(1)) {
          if (b >= toBeat - 1e-6) break; // continues on the next system
          const px = xOf(b);
          for (const step of steps) g.append(el('ellipse', { cx: px, cy: Y(step), rx: rx * 0.9, ry: ry * 0.9, transform: `rotate(-20 ${px} ${Y(step)})`, class: part >= 2 ? 'head open tied' : 'head tied' }));
          b += part / q;
        }
      }
      // Fingering: above the top staff, below the bottom one
      const fingers = members.map(({ n }) => n.finger).filter((f) => f != null);
      if (fingers.length) {
        const above = st === 1;
        const list = [...fingers].reverse();
        list.forEach((f, idx) => g.append(el('text', {
          x, y: above ? Math.min(staffTop(st), Y(hi) - GAP) - GAP * (1.8 + (list.length - 1 - idx) * 1.05) : Math.max(bottomY(st), Y(lo) + GAP) + GAP * (2.4 + idx * 1.05),
          class: 'finger', 'text-anchor': 'middle', 'font-size': GAP * 0.95,
        }, f)));
      }
      // Ornaments
      const orn = members.find(({ n }) => n.ornament)?.n.ornament;
      if (orn) g.append(el('text', { x: x - 6, y: Math.min(staffTop(st), Y(hi) - GAP) - GAP * 1.2, class: 'ornament' }, { trill: 'tr', mordent: '\u{1D19D}', turn: '\u{1D197}' }[orn] ?? orn));
      svg.append(g);
    }

    // Stems, flags and beams. Quavers and shorter are beamed within each beat (each
    // dotted crotchet in compound time), when they follow on without a rest.
    const beamWin = s.beatUnit === 8 && bpb % 3 === 0 ? 1.5 : 1; // crotchets
    const windowOf = (beat) => {
      const i = map.indexAt(beat);
      return `${i}|${Math.floor(((beat - map.starts[i]) * q) / beamWin + 1e-6)}`;
    };
    const stemX = (it, down) => (down ? it.x - it.rx + 0.8 : it.x + it.rx - 0.8);
    const flagsOf = (v) => (v <= 0.125 ? 3 : v <= 0.25 ? 2 : v <= 0.5 ? 1 : 0);
    const single = (it) => {
      const sx = stemX(it, it.down);
      const sy1 = it.down ? it.top : it.bottom;
      const sy2 = it.down ? it.bottom + GAP * 3.4 * it.scale : it.top - GAP * 3.4 * it.scale;
      it.g.append(el('line', { x1: sx, x2: sx, y1: sy1, y2: sy2, class: 'stem' }));
      for (let f = 0; f < flagsOf(it.value); f++) {
        const dir = it.down ? -1 : 1;
        const y0 = sy2 + dir * f * GAP * 0.8;
        it.g.append(el('path', { d: `M${sx} ${y0} q ${GAP * 0.9} ${dir * GAP * 0.9} ${GAP * 0.6} ${dir * GAP * 2}`, class: 'flag' }));
      }
      if (it.grace) it.g.append(el('line', { x1: sx - 4, x2: sx + 6, y1: sy2 + (it.down ? -6 : 6), y2: sy2 + (it.down ? 2 : -2), class: 'stem' }));
      it.end = sy2;
    };
    const beamed = (run) => {
      const down = run.filter((it) => it.down).length * 2 > run.length;
      const xs = run.map((it) => stemX(it, down));
      const ideal = run.map((it) => (down ? it.bottom + GAP * 3.2 : it.top - GAP * 3.2));
      const x0 = xs[0];
      const slope = Math.max(-0.12, Math.min(0.12, (ideal[ideal.length - 1] - ideal[0]) / Math.max(1, xs[xs.length - 1] - x0)));
      // Shift the beam so no stem is shorter than its ideal.
      const offs = ideal.map((y, i) => y - slope * (xs[i] - x0));
      const a = down ? Math.max(...offs) : Math.min(...offs);
      const yAt = (x) => a + slope * (x - x0);
      run.forEach((it, i) => {
        it.g.append(el('line', { x1: xs[i], x2: xs[i], y1: down ? it.top : it.bottom, y2: yAt(xs[i]), class: 'stem' }));
        it.end = yAt(xs[i]);
      });
      const thick = GAP * 0.5;
      const toward = down ? -1 : 1; // secondary beams sit nearer the heads
      const bar = (xa, xb, level) => {
        const d = toward * level * GAP * 0.75;
        const ya = yAt(xa) + d;
        const yb = yAt(xb) + d;
        run[0].g.append(el('path', { d: `M${xa} ${ya} L${xb} ${yb} L${xb} ${yb + toward * thick} L${xa} ${ya + toward * thick} Z`, class: 'beam' }));
      };
      bar(xs[0], xs[xs.length - 1], 0);
      for (let level = 1; level <= 2; level++) {
        const need = level === 1 ? 0.25 : 0.125;
        for (let i = 0; i < run.length; i++) {
          if (run[i].value > need + 1e-6) continue;
          const nextShort = run[i + 1] && run[i + 1].value <= need + 1e-6;
          const prevShort = run[i - 1] && run[i - 1].value <= need + 1e-6;
          if (nextShort) bar(xs[i], xs[i + 1], level);
          else if (!prevShort) {
            // A lone semiquaver: a stub towards its neighbour.
            const dir = i === run.length - 1 ? -1 : 1;
            bar(Math.min(xs[i], xs[i] + dir * GAP * 1.1), Math.max(xs[i], xs[i] + dir * GAP * 1.1), level);
          }
        }
      }
    };
    const byStaffVoice = new Map();
    for (const it of stems) {
      const k = `${it.st}|${it.voice}`;
      if (!byStaffVoice.has(k)) byStaffVoice.set(k, []);
      byStaffVoice.get(k).push(it);
    }
    for (const list of byStaffVoice.values()) {
      list.sort((a, b) => a.beat - b.beat);
      let run = [];
      const flush = () => {
        if (run.length >= 2) beamed(run);
        else run.forEach(single);
        run = [];
      };
      for (const it of list) {
        const prev = run[run.length - 1];
        // Follows on if it starts where the last one really ended (triplets are 1/3 long).
        const follows = prev && Math.abs(prev.beat + prev.beats - it.beat) < 1e-3 && windowOf(prev.beat) === windowOf(it.beat);
        if (!it.beamable) { flush(); single(it); continue; }
        if (prev && !follows) flush();
        run.push(it);
      }
      flush();
      // Tuplet numbers over each group (e.g. "3" over a triplet).
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (!it.tuplet || !(it.tupletStart || i === 0 || !list[i - 1].tuplet)) continue;
        const group = [it];
        for (let j = i + 1; j < list.length && list[j].tuplet === it.tuplet && !list[j].tupletStart && group.length < it.tuplet; j++) group.push(list[j]);
        const down = group[0].down;
        const yEdge = down ? Math.max(...group.map((g) => Math.max(g.end ?? g.bottom, g.bottom))) + GAP * 1.6 : Math.min(...group.map((g) => Math.min(g.end ?? g.top, g.top))) - GAP * 0.8;
        const xm = (group[0].x + group[group.length - 1].x) / 2;
        svg.append(el('text', { x: xm, y: yEdge, class: 'tuplet', 'text-anchor': 'middle', 'font-size': GAP * 1.2 }, it.tuplet));
      }
    }

    // Slurs: a curve from the first note to the last, on the side away from the stems.
    for (const sl of s.slurs ?? []) {
      if (sl.end < fromBeat || sl.start >= toBeat || sl.staff > clefs.length) continue;
      const a = heads.get(`${sl.staff}|${sl.voice}|${+sl.start.toFixed(4)}`);
      const b = heads.get(`${sl.staff}|${sl.voice}|${+sl.end.toFixed(4)}`);
      const known = a ?? b;
      if (!known) continue;
      const above = known.down;
      const x1 = sl.start >= fromBeat ? xOf(sl.start) + 3 : left - 6;
      const x2 = sl.end < toBeat ? xOf(sl.end) - 3 : xOf(toBeat) - 10;
      const yEnd = (h) => (h ? (above ? h.top - GAP * 0.9 : h.bottom + GAP * 0.9) : null);
      const y1 = yEnd(a) ?? yEnd(b);
      const y2 = yEnd(b) ?? yEnd(a);
      const lift = (above ? -1 : 1) * Math.min(GAP * 2, GAP * 0.6 + (x2 - x1) * 0.06);
      svg.append(el('path', { d: `M${x1} ${y1} C ${x1 + (x2 - x1) * 0.25} ${y1 + lift} ${x2 - (x2 - x1) * 0.25} ${y2 + lift} ${x2} ${y2}`, class: 'slur' }));
    }

    // Hairpins under the top staff, beside the dynamics.
    for (const h of s.hairpins ?? []) {
      if (h.end <= fromBeat || h.start >= toBeat) continue;
      const xa = xOf(Math.max(h.start, fromBeat));
      const xb = h.end <= toBeat ? xOf(h.end) - 4 : xOf(toBeat) - 8;
      const y = bottomY(1) + GAP * (two ? 2.25 : 3.25);
      const w = GAP * 0.6;
      // Crescendo opens to the right (<), diminuendo closes (>).
      const d = h.type === 'cresc' ? `M${xb} ${y - w} L${xa} ${y} L${xb} ${y + w}` : `M${xa} ${y - w} L${xb} ${y} L${xa} ${y + w}`;
      svg.append(el('path', { d, class: 'hairpin' }));
    }

    // 8va / 8vb brackets over runs of shifted notes.
    for (let st = 1; st <= clefs.length; st++) {
      const shifted = s.notes.filter((n) => (n.staff ?? 1) === st && n.ottava && n.beat >= fromBeat && n.beat < toBeat).sort((a, b) => a.beat - b.beat);
      let run = [];
      const draw = () => {
        if (!run.length) return;
        const up = run[0].ottava < 0; // shown lower than it sounds: 8va above
        const xa = xOf(run[0].beat) - 6;
        const xb = xOf(run[run.length - 1].beat) + GAP;
        const y = up ? staffTop(st) - GAP * 2.6 : bottomY(st) + GAP * 3.2;
        svg.append(el('text', { x: xa, y, class: 'ottava', 'font-size': GAP * 1.2 }, `${Math.abs(run[0].ottava) === 2 ? 15 : 8}v${up ? 'a' : 'b'}`));
        svg.append(el('path', { d: `M${xa + GAP * 2.4} ${y - GAP * 0.4} L${xb} ${y - GAP * 0.4} L${xb} ${y + (up ? GAP * 0.4 : -GAP * 1.2)}`, class: 'ottava-line' }));
        run = [];
      };
      for (const n of shifted) {
        const prev = run[run.length - 1];
        if (prev && (n.ottava !== prev.ottava || n.beat - (prev.beat + prev.beats) > 2)) draw();
        run.push(n);
      }
      draw();
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
    /** Read-ahead: cover everything before `beat` (null shows it all again). */
    hideThrough(beat) {
      for (const sy of systems) {
        if (!sy.veil) {
          sy.veil = el('rect', { y: 0, height: '100%', class: 'veil' });
          sy.svg.append(sy.veil);
        }
        const to = beat == null ? sy.fromBeat : Math.min(Math.max(beat, sy.fromBeat), sy.toBeat);
        const x0 = sy.xOf(sy.fromBeat) - 12;
        const x1 = to >= sy.toBeat ? Number(sy.svg.getAttribute('width')) : sy.xOf(to) - 10;
        sy.veil.setAttribute('x', x0);
        sy.veil.setAttribute('width', Math.max(0, x1 - x0));
      }
    },
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
