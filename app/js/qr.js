// Small QR code encoder (ISO/IEC 18004): byte mode, error correction level L,
// versions 1–20 (up to 858 bytes) — enough for an assignment link. Returns a square
// boolean matrix; qrSvg() draws it.

// Level L block structure per version: [ec codewords per block, [blocks, data codewords], ...]
const L_BLOCKS = [
  null,
  [7, [1, 19]], [10, [1, 34]], [15, [1, 55]], [20, [1, 80]], [26, [1, 108]],
  [18, [2, 68]], [20, [2, 78]], [24, [2, 97]], [30, [2, 116]], [18, [2, 68], [2, 69]],
  [20, [4, 81]], [24, [2, 92], [2, 93]], [26, [4, 107]], [30, [3, 115], [1, 116]], [22, [5, 87], [1, 88]],
  [24, [5, 98], [1, 99]], [28, [1, 107], [5, 108]], [30, [5, 120], [1, 121]], [28, [3, 113], [4, 114]], [28, [3, 107], [5, 108]],
];
const ALIGN = [
  null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
];
const REMAINDER = (v) => (v >= 2 && v <= 6 ? 7 : v >= 14 && v <= 20 ? 3 : 0);

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => {
      next[j] ^= c;
      next[j + 1] ^= mul(c, EXP[i]);
    });
    g = next;
  }
  return g;
}

function rsRemainder(data, n) {
  const gen = rsGenerator(n);
  const r = [...data, ...new Array(n).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const f = r[i];
    if (f) for (let j = 0; j < gen.length; j++) r[i + j] ^= mul(gen[j], f);
  }
  return r.slice(data.length);
}

const dataCapacity = (v) => L_BLOCKS[v].slice(1).reduce((a, [b, d]) => a + b * d, 0);

function codewords(bytes) {
  let v = 1;
  while (v <= 20 && dataCapacity(v) < bytes.length + (v < 10 ? 2 : 3)) v++;
  if (v > 20) throw new Error('Too much data for a QR code here.');
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, v < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCapacity(v) * 8;
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < dataCapacity(v); pad ^= 0xec ^ 0x11) data.push(pad);
  // Split into blocks, add error correction, interleave.
  const [ec, ...groups] = L_BLOCKS[v];
  const blocks = [];
  let k = 0;
  for (const [count, size] of groups) for (let b = 0; b < count; b++) { blocks.push(data.slice(k, k + size)); k += size; }
  const ecs = blocks.map((b) => rsRemainder(b, ec));
  const out = [];
  const longest = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < longest; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ec; i++) for (const e of ecs) out.push(e[i]);
  return { v, out };
}

function bch(value, poly, bits) {
  let r = value << bits;
  const top = Math.floor(Math.log2(poly));
  for (let i = Math.floor(Math.log2(r)); i >= top; i--) if (r & (1 << i)) r ^= poly << (i - top);
  return (value << bits) | r;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function build(v, cw, mask) {
  const n = v * 4 + 17;
  const m = Array.from({ length: n }, () => new Array(n).fill(null)); // null = free for data
  const set = (r, c, val) => { if (r >= 0 && r < n && c >= 0 && c < n) m[r][c] = val; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      set(r0 + r, c0 + c, inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
    }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  // Alignment patterns go everywhere except on the three finder corners (they may
  // sit on the timing lines, which they agree with).
  const al = ALIGN[v];
  const last = al.length - 1;
  al.forEach((r, i) => al.forEach((c, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) m[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
  }));
  for (let i = 8; i < n - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0;
  }
  // Format (level L = 01) and version areas, written after masking; reserve now.
  const format = bch((0b01 << 3) | mask, 0x537, 10) ^ 0x5412;
  const fbit = (i) => ((format >>> i) & 1) === 1;
  // m[row][col]: the first copy runs down column 8 then left along row 8; the second
  // copy is split between the bottom-left and top-right corners.
  for (let i = 0; i <= 5; i++) m[i][8] = fbit(i);
  m[7][8] = fbit(6);
  m[8][8] = fbit(7);
  m[8][7] = fbit(8);
  for (let i = 9; i < 15; i++) m[8][14 - i] = fbit(i);
  for (let i = 0; i < 8; i++) m[8][n - 1 - i] = fbit(i);
  for (let i = 8; i < 15; i++) m[n - 15 + i][8] = fbit(i);
  m[n - 8][8] = true; // dark module
  if (v >= 7) {
    const ver = bch(v, 0x1f25, 12);
    for (let i = 0; i < 18; i++) {
      const bit = ((ver >>> i) & 1) === 1;
      m[Math.floor(i / 3)][n - 11 + (i % 3)] = bit;
      m[n - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }
  // Data, in the zigzag from the bottom right, skipping the timing column.
  const bits = [];
  cw.forEach((b) => { for (let i = 7; i >= 0; i--) bits.push((b >>> i) & 1); });
  for (let i = 0; i < REMAINDER(v); i++) bits.push(0);
  let idx = 0;
  let up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < n; k++) {
      const r = up ? n - 1 - k : k;
      for (const c of [col, col - 1]) {
        if (m[r][c] !== null) continue;
        const bit = idx < bits.length ? bits[idx++] === 1 : false;
        m[r][c] = MASKS[mask](r, c) ? !bit : bit;
      }
    }
    up = !up;
  }
  return m;
}

// Standard penalty score, to pick the mask that scans best.
function penalty(m) {
  const n = m.length;
  let p = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const a = pass ? m[j][i] : m[i][j];
        const b = pass ? m[j - 1][i] : m[i][j - 1];
        if (a === b) { run++; if (j === n - 1 && run >= 5) p += run - 2; } else { if (run >= 5) p += run - 2; run = 1; }
      }
    }
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c];
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
  }
  const pattern = [true, false, true, true, true, false, true];
  for (let r = 0; r < n; r++) for (let c = 0; c + 6 < n; c++) {
    const row = pattern.every((x, k) => m[r][c + k] === x);
    const col = pattern.every((x, k) => m[c + k][r] === x);
    const light = (get) => [1, 2, 3, 4].every((k) => get(k) === false);
    if (row && (light((k) => m[r][c - k]) || light((k) => m[r][c + 6 + k]))) p += 40;
    if (col && (light((k) => m[c - k]?.[r]) || light((k) => m[c + 6 + k]?.[r]))) p += 40;
  }
  const dark = m.flat().filter(Boolean).length;
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function qrMatrix(text) {
  const { v, out } = codewords([...new TextEncoder().encode(text)]);
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = build(v, out, mask);
    const score = penalty(m);
    if (!best || score < best.score) best = { m, score };
  }
  return best.m;
}

export function qrSvg(text, { size = 240, label = 'QR code' } = {}) {
  const m = qrMatrix(text);
  const n = m.length + 8; // quiet zone of 4
  const path = m.flatMap((row, r) => row.map((on, c) => (on ? `M${c + 4} ${r + 4}h1v1h-1z` : ''))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
