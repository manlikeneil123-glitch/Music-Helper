// MusicXML (.musicxml / .xml / compressed .mxl) → score.js score.
// No dependencies: a small XML parser and zip reader, so the same code runs in the
// browser and in Node tests. Handles partwise scores: one or two parts (or one part
// with two staves), chords, rests, voices, backup/forward, ties, grace notes, key/time
// signatures, pickup bars, repeats with 1st/2nd endings (unfolded), tempo, dynamics,
// staccato/accent, slurs, trills/mordents/turns, fingering and pedal marks.

// ---- Tiny XML parser -----------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m);

export function parseXml(text) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] != null) top.text += m[1];
    else if (m[2]) {
      if (stack.length > 1) stack.pop();
    } else if (m[3]) {
      const attrs = {};
      for (const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decode(a[2] ?? a[3]);
      const node = { name: m[3], attrs, children: [], text: '' };
      top.children.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6] != null) top.text += decode(m[6]);
  }
  return root;
}

const kids = (n, name) => (n?.children ?? []).filter((c) => c.name === name);
const kid = (n, name) => (n?.children ?? []).find((c) => c.name === name);
const txt = (n, name) => kid(n, name)?.text.trim();
const num = (n, name, fallback = null) => {
  const t = txt(n, name);
  return t == null || t === '' ? fallback : Number(t);
};
const deep = (n, name) => {
  const out = [];
  const walk = (x) => x.children.forEach((c) => (c.name === name && out.push(c), walk(c)));
  if (n) walk(n);
  return out;
};

// ---- .mxl (zip) ------------------------------------------------------------------
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzipMxl(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('This .mxl file is not a valid zip archive.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    files.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async (name) => {
    const f = files.get(name);
    if (!f) return null;
    const start = f.local + 30 + view.getUint16(f.local + 26, true) + view.getUint16(f.local + 28, true);
    const data = bytes.subarray(start, start + f.size);
    const out = f.method === 0 ? data : f.method === 8 ? await inflateRaw(data) : null;
    if (!out) throw new Error('This .mxl file uses an unsupported compression method.');
    return new TextDecoder().decode(out);
  };
  const container = await read('META-INF/container.xml');
  let rootPath = container ? deep(parseXml(container), 'rootfile')[0]?.attrs['full-path'] : null;
  if (!rootPath) rootPath = [...files.keys()].find((n) => !n.startsWith('META-INF') && /\.(xml|musicxml)$/i.test(n));
  if (!rootPath) throw new Error('No MusicXML score found inside this .mxl file.');
  return read(rootPath);
}

// ---- MusicXML → score ----------------------------------------------------------------
const STEP_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const STEP_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const DYNAMICS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];

export function parseMusicXML(text, { id = 'imported' } = {}) {
  const doc = parseXml(text);
  const root = doc.children.find((c) => c.name === 'score-partwise' || c.name === 'score-timewise');
  if (!root) throw new Error("This doesn't look like a MusicXML file.");
  if (root.name === 'score-timewise') throw new Error('Timewise MusicXML isn\'t supported yet. Re-export as a standard ("partwise") MusicXML file.');

  const warnings = new Set();
  const title = txt(kid(root, 'work'), 'work-title') || txt(root, 'movement-title') || 'Imported piece';
  const composer = kids(kid(root, 'identification'), 'creator').find((c) => c.attrs.type === 'composer')?.text.trim();
  const parts = kids(root, 'part').filter((p) => deep(p, 'note').length);
  if (!parts.length) throw new Error('This file has no notes in it.');
  if (parts.length > 2) warnings.add(`This score has ${parts.length} parts; only the first two are used (as right and left hand).`);

  const score = {
    id, title: composer ? `${composer}: ${title}` : title, level: 'Imported', targetBpm: null,
    beatsPerBar: 4, beatUnit: 4, keyFifths: 0, staves: 1, clefs: ['treble', 'bass'],
    notes: [], rests: [], dynamics: [], pedal: [], hairpins: [], meters: null, clefChanges: [], slurs: [], barOffset: 0, source: 'musicxml', _normalized: true,
  };

  // Measures are unfolded (repeats, endings) using the first part's barlines.
  const measureOrder = unfoldRepeats(kids(parts[0], 'measure'), warnings);

  parts.slice(0, 2).forEach((part, partIdx) => {
    const measures = kids(part, 'measure');
    let divisions = 1;
    let beatsPerBar = null;
    let beatUnit = 4;
    let staffBase = partIdx; // part 2 → staff 2 when parts are separate hands
    let quarterPos = 0; // running position (quarters) in the unfolded performance
    const openTies = new Map();
    const openPedal = { at: null };
    const openWedges = new Map();
    const ottava = {}; // staff → display shift in octaves under 8va (-1) / 8vb (+1)
    let firstMeasure = true;

    for (const mi of measureOrder) {
      const measure = measures[mi];
      if (!measure) continue;
      let pos = 0; // divisions within the measure
      let maxPos = 0;
      let lastOnset = 0;
      const atBeat = (divPos) => ((quarterPos + divPos / divisions) * beatUnit) / 4;

      for (const node of measure.children) {
        if (node.name === 'attributes') {
          divisions = num(node, 'divisions', divisions);
          const key = kid(node, 'key');
          if (key && partIdx === 0) score.keyFifths = num(key, 'fifths', 0);
          const time = kid(node, 'time');
          if (time) {
            const b = num(time, 'beats', 4);
            const u = num(time, 'beat-type', 4);
            if (beatsPerBar == null) {
              beatsPerBar = b;
              beatUnit = u;
              if (partIdx === 0) {
                score.beatsPerBar = b;
                score.beatUnit = u;
              }
            } else if (u !== beatUnit) {
              warnings.add(`The beat changes during the piece (${beatsPerBar}/${beatUnit} to ${b}/${u}). Timing is checked in the first beat unit, so bar numbers after the change may be off.`);
            } else if (b !== beatsPerBar) {
              // Same beat unit, different bar length (4/4 → 3/4): followed exactly.
              if (partIdx === 0) {
                score.meters ??= [{ beat: 0, beatsPerBar: score.beatsPerBar }];
                score.meters.push({ beat: atBeat(pos), beatsPerBar: b });
              }
              beatsPerBar = b;
            }
          }
          const staves = num(node, 'staves', null);
          if (staves >= 2) {
            score.staves = 2;
            staffBase = 0;
          }
          for (const c of kids(node, 'clef')) {
            const n = Number(c.attrs.number ?? 1) + staffBase;
            const sign = txt(c, 'sign');
            const clef = sign === 'F' ? 'bass' : 'treble';
            if (n <= 2 && firstMeasure) score.clefs[n - 1] = clef;
            else if (n <= 2) score.clefChanges.push({ staff: n, beat: atBeat(pos), clef });
          }
        } else if (node.name === 'backup') {
          pos -= num(node, 'duration', 0);
        } else if (node.name === 'forward') {
          pos += num(node, 'duration', 0);
          maxPos = Math.max(maxPos, pos);
        } else if (node.name === 'direction') {
          const at = atBeat(pos + num(node, 'offset', 0));
          for (const dt of kids(node, 'direction-type')) {
            const dyn = kid(dt, 'dynamics');
            const mark = dyn?.children.map((c) => c.name).find((nm) => DYNAMICS.includes(nm));
            if (mark && partIdx === 0) score.dynamics.push({ beat: at, mark: ['sf', 'sfz', 'fp'].includes(mark) ? 'f' : mark });
            // 8va/8vb: pitches in MusicXML are the real ones; only the display moves.
            const shift = kid(dt, 'octave-shift');
            if (shift) {
              const st = Math.min(2, num(node, 'staff', 1) + staffBase);
              const size = Number(shift.attrs.size ?? 8) >= 15 ? 2 : 1;
              ottava[st] = shift.attrs.type === 'down' ? -size : shift.attrs.type === 'up' ? size : 0;
            }
            const wedge = kid(dt, 'wedge');
            if (wedge && partIdx === 0) {
              const n = wedge.attrs.number ?? '1';
              const type = wedge.attrs.type;
              if (type === 'crescendo' || type === 'diminuendo') openWedges.set(n, { type: type === 'crescendo' ? 'cresc' : 'dim', start: at });
              else if (type === 'stop' && openWedges.has(n)) {
                const w = openWedges.get(n);
                openWedges.delete(n);
                if (at > w.start) score.hairpins.push({ ...w, end: at });
              }
            }
            const ped = kid(dt, 'pedal');
            if (ped) {
              const type = ped.attrs.type;
              if ((type === 'stop' || type === 'change') && openPedal.at != null) score.pedal.push({ start: openPedal.at, end: at });
              if (type === 'start' || type === 'change') openPedal.at = at;
              if (type === 'stop') openPedal.at = null;
            }
          }
          const sound = kid(node, 'sound');
          if (sound?.attrs.tempo && score.targetBpm == null) score.targetBpm = Math.round((Number(sound.attrs.tempo) * beatUnit) / 4);
        } else if (node.name === 'sound' && node.attrs.tempo && score.targetBpm == null) {
          score.targetBpm = Math.round((Number(node.attrs.tempo) * beatUnit) / 4);
        } else if (node.name === 'note') {
          const isChord = !!kid(node, 'chord');
          const grace = !!kid(node, 'grace');
          const dur = grace ? 0 : num(node, 'duration', 0);
          const onset = isChord ? lastOnset : pos;
          const staff = Math.min(2, num(node, 'staff', 1) + staffBase);
          const voice = num(node, 'voice', 1);
          if (!isChord) lastOnset = pos;
          if (!isChord && !grace) {
            pos += dur;
            maxPos = Math.max(maxPos, pos);
          }
          const beat = atBeat(onset);
          const beats = ((dur / divisions) * beatUnit) / 4;
          if (kid(node, 'rest')) {
            if (!isChord) score.rests.push({ beat, beats, staff });
            continue;
          }
          const pitch = kid(node, 'pitch');
          if (!pitch) continue; // unpitched percussion etc.
          const letter = STEP_INDEX[txt(pitch, 'step')];
          const alter = Math.round(num(pitch, 'alter', 0));
          const octave = num(pitch, 'octave', 4);
          const midi = (octave + 1) * 12 + STEP_SEMIS[letter] + alter;
          const notations = kids(node, 'notations');
          const has = (path) => notations.some((nt) => deep(nt, path).length);
          const tieTypes = [...kids(node, 'tie'), ...notations.flatMap((nt) => kids(nt, 'tied'))].map((t) => t.attrs.type);
          const note = {
            midi, beat, beats, staff, voice, step: octave * 7 + letter, alter,
            artic: has('staccato') || has('staccatissimo') ? 'staccato' : has('accent') || has('strong-accent') ? 'accent' : null,
            ornament: has('trill-mark') ? 'trill' : has('mordent') || has('inverted-mordent') ? 'mordent' : has('turn') || has('inverted-turn') ? 'turn' : null,
            grace: grace || undefined,
            finger: deep(node, 'fingering')[0]?.text.trim() || undefined,
            slurStart: notations.some((nt) => kids(nt, 'slur').some((s) => s.attrs.type === 'start')) || undefined,
            // What's printed: note type and dots (so triplets and compound time draw right).
            display: txt(node, 'type') ? { type: txt(node, 'type'), dots: kids(node, 'dot').length } : undefined,
            tuplet: kid(node, 'time-modification') ? num(kid(node, 'time-modification'), 'actual-notes', 3) : undefined,
            tupletStart: notations.some((nt) => kids(nt, 'tuplet').some((t) => t.attrs.type === 'start')) || undefined,
            ottava: ottava[staff] || undefined,
            slurStop: notations.some((nt) => kids(nt, 'slur').some((s) => s.attrs.type === 'stop')) || undefined,
          };
          const tieKey = `${staff}|${voice}|${midi}`;
          if (tieTypes.includes('stop') && openTies.has(tieKey)) {
            // Fold the tied note into the one it continues.
            const first = openTies.get(tieKey);
            first.beats = beat + beats - first.beat;
            delete first.display; // the tied total is drawn as its own chain
            if (!tieTypes.includes('start')) openTies.delete(tieKey);
            continue;
          }
          if (tieTypes.includes('start')) openTies.set(tieKey, note);
          score.notes.push(note);
        }
      }
      // Pickup (anacrusis): a short first bar is shifted so bar lines line up.
      const measureQuarters = maxPos / divisions;
      const fullQuarters = ((beatsPerBar ?? 4) * 4) / beatUnit;
      if (firstMeasure && partIdx === 0 && measureQuarters > 0 && measureQuarters < fullQuarters - 1e-6 && measure.attrs.implicit !== 'no') {
        score.pickupBeats = (measureQuarters * beatUnit) / 4;
      }
      quarterPos += firstMeasure && score.pickupBeats != null ? measureQuarters : Math.max(measureQuarters, fullQuarters);
      firstMeasure = false;
    }
    if (openPedal.at != null) score.pedal.push({ start: openPedal.at, end: (quarterPos * beatUnit) / 4 });
  });

  // Grace notes: give them a little time just before the note they decorate.
  for (const n of score.notes) {
    if (n.grace) {
      n.beat = Math.max(0, n.beat - 0.125);
      n.beats = 0.125;
    }
  }
  // Slurs → mark every note inside a slur as legato (per staff/voice).
  const byVoice = new Map();
  for (const n of [...score.notes].sort((a, b) => a.beat - b.beat)) {
    const k = `${n.staff}|${n.voice}`;
    if (!byVoice.has(k)) byVoice.set(k, []);
    byVoice.get(k).push(n);
  }
  for (const list of byVoice.values()) {
    let inSlur = false;
    let from = null;
    for (const n of list) {
      if (n.slurStart && !inSlur) from = n.beat;
      if (n.slurStart) inSlur = true;
      if (inSlur) n.slur = true;
      if (n.slurStop && inSlur && from != null && n.beat > from) score.slurs.push({ staff: n.staff, voice: n.voice, start: from, end: n.beat });
      if (n.slurStop) inSlur = false;
      delete n.slurStart;
      delete n.slurStop;
    }
  }
  // Shift a pickup so the first full bar starts at bar 1 (pickup shows as bar 0).
  if (score.pickupBeats) {
    const shift = score.beatsPerBar - score.pickupBeats;
    for (const list of [score.notes, score.rests, score.dynamics]) for (const x of list) x.beat += shift;
    for (const p of score.pedal) { p.start += shift; p.end += shift; }
    for (const h of [...score.hairpins, ...score.slurs]) { h.start += shift; h.end += shift; }
    for (const c of score.clefChanges) c.beat += shift;
    for (const m of score.meters ?? []) if (m.beat > 0) m.beat += shift;
    score.barOffset = -1;
  }
  if (score.notes.some((n) => n.staff === 2)) score.staves = 2;
  score.targetBpm ??= 80;
  score.warnings = [...warnings];
  return score;
}

// Measure indices in playing order: |: … :| repeats once, with 1st/2nd endings, then
// D.C. / D.S. jumps (al Fine, al Coda). After a jump, repeats aren't taken again and
// only the last ending is played: the usual convention.
function unfoldRepeats(measures, warnings) {
  const jumps = measures.map(jumpMarks);
  const info = measures.map((m) => {
    const bl = kids(m, 'barline');
    const rep = (dir) => bl.some((b) => kid(b, 'repeat')?.attrs.direction === dir);
    const ending = bl.map((b) => kid(b, 'ending')).find((e) => e && e.attrs.type === 'start');
    return { forward: rep('forward'), backward: rep('backward'), ending: ending ? ending.attrs.number.split(/[ ,]+/).map(Number) : null };
  });
  // Which ending each measure belongs to (for skipping all but the last after a jump).
  const inEnding = [];
  let current = null;
  measures.forEach((m, i) => {
    if (info[i].ending) current = info[i].ending;
    inEnding[i] = current;
    const stop = kids(m, 'barline').map((b) => kid(b, 'ending')).find((e) => e && (e.attrs.type === 'stop' || e.attrs.type === 'discontinue'));
    if (stop || info[i].backward) current = null;
  });
  const lastEnding = Math.max(0, ...inEnding.filter(Boolean).flat());

  const jumpAt = jumps.findIndex((j) => j.dc || j.ds);
  const order = withRepeats(info, 0, jumpAt >= 0 ? jumpAt : measures.length - 1);
  if (jumpAt < 0) return order;

  let from = 0;
  if (jumps[jumpAt].ds) {
    from = jumps.findIndex((j) => j.segno);
    if (from < 0) {
      warnings.add('There is a D.S. but no segno sign, so it jumps back to the start.');
      from = 0;
    }
  }
  const coda = jumps.findIndex((j, i) => j.coda && i > jumpAt);
  const anyCoda = coda >= 0 ? coda : jumps.findIndex((j) => j.coda && !j.tocoda);
  for (let i = from; i < measures.length; i++) {
    if (inEnding[i] && !inEnding[i].includes(lastEnding)) continue;
    order.push(i);
    if (jumps[i].fine) return order;
    if (jumps[i].tocoda && anyCoda > i) {
      for (let k = anyCoda; k < measures.length; k++) if (!inEnding[k] || inEnding[k].includes(lastEnding)) order.push(k);
      return order;
    }
    if (i === jumpAt) {
      // Played the jump bar again without a Fine or Coda: nowhere else to go.
      if (!jumps.some((j) => j.fine || j.tocoda)) warnings.add('The D.C. / D.S. has no Fine or Coda, so the piece ends at the jump.');
      return order;
    }
  }
  return order;
}

// |: … :| with endings over measures [from, to].
function withRepeats(info, from, to) {
  const order = [];
  let start = from;
  let pass = 1;
  let activeEnding = null;
  for (let i = from; i <= to; i++) {
    if (info[i].forward && pass === 1) start = i;
    if (info[i].ending) activeEnding = info[i].ending;
    if (activeEnding && !activeEnding.includes(pass)) {
      // skip measures of an ending that isn't for this pass
      if (info[i].backward || (info[i + 1] && info[i + 1].ending)) activeEnding = null;
      continue;
    }
    order.push(i);
    if (info[i].backward && pass === 1) {
      pass = 2;
      activeEnding = null;
      i = start - 1;
      continue;
    }
    if (info[i].backward && pass === 2) {
      pass = 1;
      activeEnding = null;
    }
    if (activeEnding && info[i + 1] && info[i + 1].ending) activeEnding = null;
    if (pass === 2 && !activeEnding && info[i + 1]?.forward) pass = 1;
  }
  return order;
}

// Jump instructions in a measure, from <sound> attributes (what notation programs
// write for playback) or, failing that, the printed words and signs.
function jumpMarks(m) {
  const out = { dc: false, ds: false, segno: false, coda: false, tocoda: false, fine: false };
  for (const snd of deep(m, 'sound')) {
    if (snd.attrs.dacapo === 'yes') out.dc = true;
    if (snd.attrs.dalsegno) out.ds = true;
    if (snd.attrs.segno) out.segno = true;
    if (snd.attrs.coda) out.coda = true;
    if (snd.attrs.tocoda) out.tocoda = true;
    if (snd.attrs.fine) out.fine = true;
  }
  for (const dir of deep(m, 'direction-type')) {
    if (kid(dir, 'segno')) out.segno = true;
    const words = kids(dir, 'words').map((w) => w.text.trim()).join(' ');
    if (/\bd\.\s?c\.|da\s+capo/i.test(words)) out.dc = true;
    else if (/\bd\.\s?s\.|dal\s+segno/i.test(words)) out.ds = true;
    if (/to\s+coda/i.test(words)) out.tocoda = true;
    else if (kid(dir, 'coda')) out.coda = true;
    if (/^fine$/i.test(words)) out.fine = true;
  }
  if (out.tocoda) out.coda = false;
  return out;
}

export async function readScoreFile(file) {
  const name = file.name ?? '';
  const text = /\.mxl$/i.test(name) ? await unzipMxl(await file.arrayBuffer()) : await file.text();
  return parseMusicXML(text, { id: `import:${name}:${file.size ?? 0}` });
}
