// Microphone checking for acoustic pianos, including chords.
//
// We never try to answer "what notes are in this audio?" (very hard for piano
// chords). We know the score, so we answer "did these expected notes sound,
// roughly when expected?" — a far easier, far more reliable question:
//   1. find note onsets (spectral flux),
//   2. line onsets up with the score's chords (dynamic programming),
//   3. for each expected pitch, measure the NEW energy at its harmonics after
//      the onset vs just before it (so held notes don't count as re-played),
//   4. say present / absent / unclear — and only call a wrong note when a
//      neighbouring semitone is clearly sounding instead.
// Pure functions on Float32Array samples: runs the same on live mic input,
// uploaded test recordings, and in Node tests.
import { robustRegress } from './analysis.js';

// Tuned on synthetic piano audio; to be re-tuned on real recordings.
export const THRESHOLDS = { present: 0.3, absent: 0.12, wrongNeighbour: 0.45, wrongRatio: 2.5, minOddShare: 0.3, minFundShare: 0.12 };

const HARMONIC_WEIGHTS = [1, 0.5, 0.6, 0.3, 0.4, 0.2, 0.3, 0.15]; // h = 1..8; odd harmonics count more (see pitchEvidence)

// ---- FFT ------------------------------------------------------------------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

// Magnitude spectrum of samples[start, start+len), Hann-windowed, zero-padded to N.
function spectrum(samples, start, len, N) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  len = Math.min(len, N);
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s >= 0 && s < samples.length) re[i] = samples[s] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (len - 1)));
  }
  fft(re, im);
  const mag = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

const midiFreq = (m, cents = 0) => 440 * 2 ** ((m - 69 + cents / 100) / 12);

// ---- 1. Onsets ------------------------------------------------------------
export function detectOnsets(samples, sampleRate, { minGapSec = 0.03 } = {}) {
  const N = 2048;
  const hop = Math.round(sampleRate * 0.01);
  const maxBin = Math.min(N / 2, Math.round((6000 * N) / sampleRate));
  const flux = [];
  let prev = null;
  for (let start = 0; start + N <= samples.length; start += hop) {
    const mag = spectrum(samples, start, N, N);
    const log = new Float64Array(maxBin);
    let f = 0;
    for (let b = 1; b < maxBin; b++) {
      log[b] = Math.log1p(1000 * mag[b]);
      if (prev) f += Math.max(0, log[b] - prev[b]);
    }
    flux.push(f);
    prev = log;
  }
  const max = Math.max(1e-9, ...flux);
  const nf = flux.map((f) => f / max);

  const onsets = [];
  const minGap = Math.round(minGapSec / 0.01);
  for (let i = 1; i < nf.length - 1; i++) {
    let isPeak = true;
    for (let k = Math.max(0, i - 3); k <= Math.min(nf.length - 1, i + 3); k++) if (nf[k] > nf[i]) isPeak = false;
    if (!isPeak) continue;
    const win = nf.slice(Math.max(0, i - 20), i);
    const mean = win.length ? win.reduce((a, b) => a + b, 0) / win.length : 0;
    if (nf[i] < 0.06 || nf[i] < mean * 1.6 + 0.03) continue;
    if (onsets.length && i - onsets[onsets.length - 1].frame < minGap) {
      if (nf[i] > onsets[onsets.length - 1].strength) onsets.pop();
      else continue;
    }
    onsets.push({ frame: i, strength: nf[i] });
  }
  // A frame's flux peaks as the attack enters it; place the onset at the frame's leading edge.
  return onsets.map((o) => ({ time: (o.frame * hop + N * 0.75) / sampleRate, strength: o.strength }));
}

// ---- 3. Pitch evidence -----------------------------------------------------
// Weighted energy at a pitch's harmonics. Odd harmonics (1, 3, 5…) belong to
// this pitch alone, while even ones are shared with the note an octave up —
// so weighting odd harmonics higher stops C5 making C4 look "present".
function harmonicPeaks(mag, sampleRate, N, midi, tuningCents) {
  const f0 = midiFreq(midi, tuningCents);
  const peaks = [];
  for (let h = 1; h <= HARMONIC_WEIGHTS.length; h++) {
    const f = h * f0;
    if (f > sampleRate * 0.45) break;
    const bin = (f * N) / sampleRate;
    const span = Math.max(1, bin * 0.012);
    let peak = 0;
    for (let b = Math.floor(bin - span); b <= Math.ceil(bin + span); b++) if (b > 0 && b < mag.length) peak = Math.max(peak, mag[b]);
    peaks.push(peak);
  }
  return peaks;
}

function pitchEvidence(mag, sampleRate, N, midi, tuningCents, peaks = harmonicPeaks(mag, sampleRate, N, midi, tuningCents)) {
  let odd = 0, even = 0, fund = 0;
  for (let h = 1; h <= peaks.length; h++) {
    const v = HARMONIC_WEIGHTS[h - 1] * Math.sqrt(peaks[h - 1]);
    if (h === 1) fund = v;
    if (h % 2) odd += v;
    else even += v;
  }
  const total = odd + even || 1e-9;
  return { total: odd + even, oddShare: odd / total, fundShare: fund / total };
}

// Evidence for one onset — or, for a chord whose notes weren't played quite
// together, for a group of onsets from firstSec to lastSec.
function onsetEvidence(samples, sampleRate, firstSec, lastSec, nextOnsetSec, candidates, tuningCents) {
  const N = 8192;
  const sr = sampleRate;
  const startA = Math.round((lastSec + 0.03) * sr);
  const endA = Math.round(Math.min(lastSec + 0.22, nextOnsetSec ?? Infinity) * sr);
  const lenA = Math.max(Math.round(0.07 * sr), endA - startA);
  const lenB = Math.round(0.1 * sr);
  const after = spectrum(samples, startA, lenA, N);
  const before = spectrum(samples, Math.round((firstSec - 0.01) * sr) - lenB, lenB, N);
  // Window lengths differ; compare at equal scale (magnitude grows with window length).
  const scale = lenA / lenB;
  const strength = {};
  const restruck = {};
  const rises = {};
  const oddShare = {};
  const fundShare = {};
  let maxStrength = 1e-9;
  for (const m of candidates) {
    // Compressed evidence: how strong this pitch is relative to the loudest one now.
    const pa = harmonicPeaks(after, sr, N, m, tuningCents);
    const pb = harmonicPeaks(before, sr, N, m, tuningCents).map((v) => v * scale);
    const a = pitchEvidence(after, sr, N, m, tuningCents, pa);
    strength[m] = a.total;
    oddShare[m] = a.oddShare;
    fundShare[m] = a.fundShare;
    maxStrength = Math.max(maxStrength, a.total);
    // Was the note (re)struck here, or is it a held/pedalled note ringing on? A
    // ringing tail only decays, upper harmonics fastest; a new strike — even a soft
    // re-strike of the same key — restores them. So take the strongest rise across
    // the harmonics that carry real energy.
    const top = Math.max(...pa);
    rises[m] = pa.map((v, h) => (v >= 0.05 * top ? v / (pb[h] + 1e-9) : null));
    restruck[m] = restrikeScore(rises[m]);
  }
  const presence = {};
  const sounding = {};
  for (const m of candidates) {
    sounding[m] = strength[m] / maxStrength;
    presence[m] = sounding[m] * restruck[m];
  }

  let energy = 0;
  const e0 = Math.round(firstSec * sr);
  for (let i = e0; i < Math.min(samples.length, e0 + Math.round(0.05 * sr)); i++) energy += samples[i] * samples[i];
  return { presence, sounding, restruck, rises, oddShare, fundShare, level: maxStrength, rms: Math.sqrt(energy / Math.max(1, 0.05 * sr)) };
}

// 0 = only decaying, 1 = clearly (re)struck. Uses the strongest rise across harmonics.
// null = nothing to judge by: every strong low harmonic (1st–4th) is shared with
// another chord note. A low harmonic that is NOT shared but silent is evidence the
// note wasn't struck; faint high harmonics (5th+) can only add evidence that it was.
function restrikeScore(rises, skip = () => false) {
  const score = (r) => Math.min(1, Math.max(0, (r - 1) / 0.4));
  let usable = false;
  let rise = 0;
  let highRise = 0;
  rises.forEach((r, h) => {
    if (skip(h + 1)) return;
    if (h + 1 <= 4) {
      usable = true;
      if (r != null) rise = Math.max(rise, r);
    } else if (r != null) {
      highRise = Math.max(highRise, r);
    }
  });
  if (!usable) return highRise > 1.4 ? score(highRise) : null;
  return score(Math.max(rise, highRise));
}

// Does harmonic h of `midi` coincide with a harmonic of any of `others`?
function sharedHarmonic(midi, h, others, tuningCents) {
  const f = h * midiFreq(midi, tuningCents);
  return others.some((q) => {
    // Up to the 12th partial: beyond that, piano strings' stretch (inharmonicity)
    // pushes partials sharp enough that they no longer line up with notes above.
    const k = Math.round(f / midiFreq(q, tuningCents));
    return k >= 1 && k <= 12 && Math.abs(1200 * Math.log2(f / (k * midiFreq(q, tuningCents)))) < 35;
  });
}

// Is this pitch just an overtone of a note that is genuinely sounding?
function isOvertoneOf(midi, sounding, tuningCents) {
  const f = midiFreq(midi, tuningCents);
  return sounding.some((s) => {
    for (let h = 2; h <= 8; h++) if (Math.abs(1200 * Math.log2(f / (h * midiFreq(s, tuningCents)))) < 35) return true;
    return false;
  });
}

/**
 * samples/sampleRate: mono audio. beat0Sec: where beat 1 of the piece falls in the audio.
 * expected: timeline() notes. Returns { played, unclear } for analyse(), plus debug info.
 */
export function analyseAudio({ samples, sampleRate, expected, msPerBeat, beat0Sec, latencyMs = 0, tuningCents = 0, thresholds = THRESHOLDS }) {
  const T = thresholds;
  const toMs = (sec) => (sec - beat0Sec) * 1000 - latencyMs;
  const onsets = detectOnsets(samples, sampleRate).filter((o) => toMs(o.time) >= -0.6 * msPerBeat);

  const events = [];
  for (const n of expected) {
    const last = events[events.length - 1];
    if (last && last.beat === n.beat) last.pitches.push(n.midi);
    else events.push({ beat: n.beat, pitches: [n.midi] });
  }
  const all = expected.map((n) => n.midi);
  const candidates = [];
  for (let m = Math.max(21, Math.min(...all) - 13); m <= Math.min(108, Math.max(...all) + 13); m++) candidates.push(m);

  const ev = onsets.map((o, j) => onsetEvidence(samples, sampleRate, o.time, o.time, onsets[j + 1]?.time, candidates, tuningCents));
  // A chord played "not together" shows up as two onsets close together; also
  // score each such pair as one unit and let the alignment pick whichever fits.
  const ev2 = onsets.map((o, j) => {
    const nxt = onsets[j + 1];
    return nxt && nxt.time - o.time <= MAX_CHORD_SPREAD_SEC
      ? onsetEvidence(samples, sampleRate, o.time, nxt.time, onsets[j + 2]?.time, candidates, tuningCents)
      : null;
  });
  // Presence is relative within an onset, which is meaningless for an onset that is
  // only a knock or a breath. Onsets with little new pitched energy carry no evidence.
  const maxLevel = Math.max(1e-9, ...ev.map((e) => e.level));
  for (const e of [...ev, ...ev2]) if (e && e.level < 0.12 * maxLevel) for (const m of candidates) e.presence[m] = e.sounding[m] = 0;
  const maxRms = Math.max(1e-9, ...ev.map((e) => e.rms));

  // ---- 2. Align onsets to chords. Pass 1 against the target tempo; pass 2 against
  // the player's own fitted tempo with timing weighted more (as for MIDI).
  let pairs = alignOnsets(events, onsets, ev, ev2, toMs, (beat) => beat * msPerBeat, msPerBeat, 0.08, T);
  const fit = pairs.length >= 3 ? robustRegress(pairs.map((m) => [events[m.k].beat, toMs(onsets[m.j0].time)])) : null;
  if (fit && fit.b > 0) pairs = alignOnsets(events, onsets, ev, ev2, toMs, (beat) => fit.a + fit.b * beat, fit.b, 0.5, T);

  // Chords not played together: matched as a two-onset group, or followed closely by
  // an onset nothing else claimed (the late notes of the same chord).
  const used = new Set(pairs.flatMap((m) => [m.j0, m.j1]));
  const spread = pairs
    .filter((m) => events[m.k].pitches.length > 1)
    .map((m) => {
      let last = m.j1;
      const nxt = onsets[last + 1];
      if (last === m.j0 && nxt && !used.has(last + 1) && nxt.time - onsets[m.j0].time <= MAX_CHORD_SPREAD_SEC) last++;
      return { beat: events[m.k].beat, ms: Math.round((onsets[last].time - onsets[m.j0].time) * 1000) };
    })
    .filter((x) => x.ms >= 35);

  // ---- 4. Judge each expected pitch.
  const played = [];
  const unclear = [];
  const evidence = []; // per written note, for per-user tuning
  for (const { k, j0: j, e } of pairs) {
    const { sounding: ringing, rises, oddShare, fundShare } = e;
    // For the chord's own notes, judge re-striking only on harmonics the other chord
    // notes don't share: re-striking F4 lifts A4's 4th harmonic, which says nothing
    // about A4. Other pitches (possible wrong notes) keep the plain test.
    const restruck = { ...e.restruck };
    const presence = { ...e.presence };
    for (const q of events[k].pitches) {
      const others = events[k].pitches.filter((x) => x !== q);
      const own = restrikeScore(rises[q], (h) => sharedHarmonic(q, h, others, tuningCents));
      // Every harmonic shared with a lower chord note (octaves, 12ths, a chord's 3rd
      // over a low root…) leaves nothing to judge by. Trust the score and use the plain
      // test: the lower note is still checked on its own harmonics. Known limit: a
      // left-out or wrong note hidden on the bass's partials can slip through. (A
      // partial-envelope test was tried; piano stretch tuning made it unreliable.)
      restruck[q] = own ?? e.restruck[q];
      presence[q] = ringing[q] * restruck[q];
    }
    const previous = new Set(events[k - 1]?.pitches ?? []);
    // A pitch only counts if its own fundamental is there — otherwise it's just
    // overtones of other notes (C4 "heard" inside E4 + G4) or the octave above.
    const real = (q) => q < 48 || fundShare[q] >= T.minFundShare;
    const on = toMs(onsets[j].time);
    const velocity = e.rms / maxRms;
    const chord = events[k].pitches;
    const sounding = chord.filter((p) => presence[p] >= T.present && real(p));
    for (const p of chord) evidence.push({ beat: events[k].beat, midi: p, presence: real(p) ? presence[p] : 0 });
    for (const p of chord) {
      // Energy only on the even harmonics = the octave above was played instead.
      const up = p + 12;
      if (presence[p] >= T.present && (oddShare[p] < T.minOddShare || !real(p)) && !chord.includes(up) && presence[up] >= T.present) {
        played.push({ midi: up, on, off: null, velocity });
        continue;
      }
      if (presence[p] >= T.present && real(p)) {
        played.push({ midi: p, on, off: null, velocity });
        continue;
      }
      // Same key as the previous chord, still sounding, and only a slight rise: we can't
      // tell a very soft re-strike from the old note ringing on. Say so, don't guess.
      if (previous.has(p) && ringing[p] >= T.present && real(p) && restruck[p] >= 0.25) {
        unclear.push({ midi: p, on });
        continue;
      }
      // A neighbouring semitone sounding much more strongly than the written note.
      const wrong = [p - 2, p - 1, p + 1, p + 2]
        .filter((q) => !chord.includes(q) && real(q) && presence[q] >= T.wrongNeighbour && presence[q] >= T.wrongRatio * (real(p) ? presence[p] : 0) && !isOvertoneOf(q, sounding, tuningCents))
        .sort((a, b) => presence[b] - presence[a])[0];
      if (wrong != null) played.push({ midi: wrong, on, off: null, velocity });
      else if (presence[p] >= T.absent && real(p)) unclear.push({ midi: p, on });
      // else: clearly absent → reported as missed
    }
  }
  // Onsets the alignment left unmatched but that clearly struck a note: report them
  // as extra notes. The analyser merges "extra + missed at the same moment" into one
  // wrong note, so a wrong note in a fast run isn't reported as merely "missed".
  for (let j = 0; j < onsets.length; j++) {
    if (used.has(j) || ev[j].level < 0.3 * maxLevel) continue;
    const e = ev[j];
    const top = candidates
      .filter((q) => (q < 48 || e.fundShare[q] >= T.minFundShare) && e.presence[q] >= 0.7)
      .sort((a, b) => e.presence[b] - e.presence[a])[0];
    if (top != null) played.push({ midi: top, on: toMs(onsets[j].time), off: null, velocity: e.rms / maxRms });
  }
  played.sort((a, b) => a.on - b.on);
  return { played, unclear, spread, evidence, onsets: onsets.length, matched: pairs.length };
}

const MAX_CHORD_SPREAD_SEC = 0.12;

// DP alignment of score events to onsets. Transitions: match one onset, match two
// close onsets as one spread chord, skip an event (missed), skip an onset (noise).
function alignOnsets(events, onsets, ev, ev2, toMs, timeOf, msPerBeat, timingWeight, T) {
  const K = events.length, J = onsets.length;
  const SKIP_EVENT = 1, SKIP_ONSET = 0.35, SPREAD = 0.05;
  const cost = (k, j, e) => {
    const s = events[k].pitches.reduce((a, p) => a + Math.min(1, e.presence[p] / T.present), 0) / events[k].pitches.length;
    const dt = Math.min(Math.abs(toMs(onsets[j].time) - timeOf(events[k].beat)) / msPerBeat, 4) * timingWeight;
    return 1 - s + dt;
  };
  const D = Array.from({ length: K + 1 }, () => new Float64Array(J + 1).fill(Infinity));
  const B = Array.from({ length: K + 1 }, () => new Array(J + 1));
  D[0][0] = 0;
  for (let k = 0; k <= K; k++) {
    for (let j = 0; j <= J; j++) {
      if (k === 0 && j === 0) continue;
      let best = Infinity, how = null;
      const tryMove = (c, m) => { if (c < best) { best = c; how = m; } };
      if (k > 0) tryMove(D[k - 1][j] + SKIP_EVENT, 'skipEvent');
      if (j > 0) tryMove(D[k][j - 1] + SKIP_ONSET, 'skipOnset');
      if (k > 0 && j > 0) tryMove(D[k - 1][j - 1] + cost(k - 1, j - 1, ev[j - 1]), 'one');
      if (k > 0 && j > 1 && ev2[j - 2]) tryMove(D[k - 1][j - 2] + cost(k - 1, j - 2, ev2[j - 2]) + SPREAD, 'two');
      D[k][j] = best;
      B[k][j] = how;
    }
  }
  const pairs = [];
  for (let k = K, j = J; k > 0 || j > 0;) {
    const how = B[k][j];
    if (how === 'one') { pairs.push({ k: k - 1, j0: j - 1, j1: j - 1, e: ev[j - 1] }); k--; j--; }
    else if (how === 'two') { pairs.push({ k: k - 1, j0: j - 2, j1: j - 1, e: ev2[j - 2] }); k--; j -= 2; }
    else if (how === 'skipEvent') k--;
    else j--;
  }
  return pairs.reverse();
}

// ---- Learn mode: is this chord sounding right now? --------------------------------
// Looks at the newest ~150 ms of audio. `recent` = pitches of the previous step, which
// may still be ringing: those must have been struck again (a rise in energy).
export function liveCheck(samples, sampleRate, pitches, { tuningCents = 0, recent = [], noiseRms = 0, thresholds = THRESHOLDS } = {}) {
  const T = thresholds;
  const N = 8192;
  const len = Math.round(0.15 * sampleRate);
  const end = samples.length;
  if (end < len * 2) return { all: false, present: [] };
  let e = 0;
  for (let i = end - len; i < end; i++) e += samples[i] * samples[i];
  const rms = Math.sqrt(e / len);
  if (rms < Math.max(0.002, noiseRms * 3)) return { all: false, present: [], quiet: true };
  const now = spectrum(samples, end - len, len, N);
  const before = spectrum(samples, end - 2 * len - Math.round(0.1 * sampleRate), len, N);
  const candidates = new Set();
  for (const p of pitches) for (let d = -2; d <= 2; d++) candidates.add(p + d);
  const strength = {};
  let max = 1e-9;
  for (const m of candidates) {
    const ev = pitchEvidence(now, sampleRate, N, m, tuningCents);
    strength[m] = ev;
    max = Math.max(max, ev.total);
  }
  const realAt = (m) => m < 48 || strength[m].fundShare >= T.minFundShare;
  const present = pitches.filter((p) => {
    // A louder unwanted note a semitone or tone away means p was replaced, not played.
    const beaten = [p - 2, p - 1, p + 1, p + 2].some((q) => !pitches.includes(q) && realAt(q) && strength[q].total > strength[p].total * 1.2 && !isOvertoneOf(q, pitches.filter((x) => x !== p), tuningCents));
    const ok = !beaten && strength[p].total / max >= T.present && realAt(p);
    if (!ok || !recent.includes(p)) return ok;
    const b = pitchEvidence(before, sampleRate, N, p, tuningCents).total;
    return strength[p].total > b * 1.25;
  });
  // The loudest pitch nearby that isn't wanted = what was probably played instead.
  const wrong = [...candidates]
    .filter((m) => !pitches.includes(m) && strength[m].total / max >= 0.8 && (m < 48 || strength[m].fundShare >= T.minFundShare) && !isOvertoneOf(m, pitches, tuningCents))
    .sort((a, b) => strength[b].total - strength[a].total)[0] ?? null;
  return { all: present.length === pitches.length, present, wrong };
}

// ---- Calibration ----------------------------------------------------------
// Delay between "the app played a click" and "the mic heard it" (speaker → air →
// mic → buffer). Without this every note looks late by ~100–300 ms.
export function measureLatency(samples, sampleRate, clickTimesSec) {
  const onsets = detectOnsets(samples, sampleRate).map((o) => o.time);
  const diffs = clickTimesSec
    .map((c) => onsets.filter((o) => o >= c - 0.02 && o < c + 0.5).sort((a, b) => a - b)[0])
    .map((o, i) => (o == null ? null : (o - clickTimesSec[i]) * 1000))
    .filter((d) => d != null)
    .sort((a, b) => a - b);
  if (diffs.length < Math.ceil(clickTimesSec.length / 2)) return null;
  return diffs[Math.floor(diffs.length / 2)];
}

// How far the piano is from A=440, measured from a held A4. Old acoustic
// pianos are often 20–40 cents flat.
export function estimateTuning(samples, sampleRate, midi = 69) {
  const N = 32768;
  const start = Math.max(0, Math.floor(samples.length / 2 - N / 2));
  const mag = spectrum(samples, start, Math.min(N, samples.length), N);
  const f0 = midiFreq(midi);
  const lo = Math.floor((f0 * 2 ** (-60 / 1200) * N) / sampleRate);
  const hi = Math.ceil((f0 * 2 ** (60 / 1200) * N) / sampleRate);
  let best = lo;
  for (let b = lo; b <= hi; b++) if (mag[b] > mag[best]) best = b;
  const noise = mag.slice(lo - 40, lo).reduce((a, b) => a + b, 0) / 40 || 1e-9;
  if (mag[best] < noise * 8) return null;
  // Parabolic interpolation for sub-bin accuracy.
  const [a, b, c] = [mag[best - 1], mag[best], mag[best + 1]];
  const offset = (0.5 * (a - c)) / (a - 2 * b + c || 1e-9);
  const f = ((best + offset) * sampleRate) / N;
  return 1200 * Math.log2(f / f0);
}

// ---- Utilities ------------------------------------------------------------
export function firstOnsetSec(samples, sampleRate) {
  return detectOnsets(samples, sampleRate)[0]?.time ?? 0;
}

export function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
