// Minimal QR code generator (no dependency) — produces an SVG data URL.
// Based on a compact QR Code implementation (MIT-style, public domain algorithm).
// Supports byte mode, auto version selection up to version 10, error correction L.

// This is a compact, self-contained QR encoder sufficient for short strings
// (license numbers, URLs). For very long payloads, use a library.

const EC_L = 0;
void EC_L;

function gf256Mul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function buildLogExp(): { log: number[]; exp: number[] } {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x = gf256Mul(x, 2);
  }
  return { log, exp };
}

const { log, exp } = buildLogExp();
void log;

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = poly.map((c) => gf256Mul(c, exp[i])).concat([0]);
    for (let j = 0; j < poly.length - 1; j++) poly[j] ^= poly[poly.length - 1];
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const b of data) {
    const factor = b ^ res[0];
    res.shift();
    res.push(0);
    if (factor) {
      for (let i = 0; i < gen.length; i++) {
        res[i] ^= gf256Mul(gen[i], factor);
      }
    }
  }
  return res;
}

// Capacity table for byte mode, EC L (data codewords per version 1-10)
const CAPACITY_L = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];

function encodeByte(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) { bytes.push(0xc0 | (c >> 6)); bytes.push(0x80 | (c & 0x3f)); }
    else { bytes.push(0xe0 | (c >> 12)); bytes.push(0x80 | ((c >> 6) & 0x3f)); bytes.push(0x80 | (c & 0x3f)); }
  }
  return bytes;
}

function bitsToBytes(bits: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
    out.push(b);
  }
  return out;
}

function pushBits(arr: number[], val: number, len: number) {
  for (let i = len - 1; i >= 0; i--) arr.push((val >> i) & 1);
}

// Build matrix for version 1-10, EC L
function buildMatrix(version: number, data: number[]): boolean[][] {
  const size = 17 + 4 * version;
  const m: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const placeFinder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i, cc = c + j;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const edge = i === -1 || i === 7 || j === -1 || j === 7;
        const ring = i === 0 || i === 6 || j === 0 || j === 6;
        const center = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[rr][cc] = !edge && (ring || center);
        reserved[rr][cc] = true;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // Dark module
  m[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Place data
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (!reserved[r][cc]) {
          const byteIdx = bitIdx >> 3;
          const bitInByte = 7 - (bitIdx & 7);
          const bit = byteIdx < data.length ? ((data[byteIdx] >> bitInByte) & 1) === 1 : false;
          m[r][cc] = bit;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Mask (mask 0: (r+c)%2 == 0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) m[r][c] = !m[r][c];
    }
  }

  // Format info (EC L, mask 0) -> hardcoded bits for L+mask0
  const formatBits = '110101100110011'.split('').map(Number);
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === 1;
    // around top-left
    if (i < 6) m[8][i] = bit;
    else if (i < 8) m[8][i + 1] = bit;
    else if (i === 8) m[7][8] = bit;
    else m[14 - i][8] = bit;
    // around top-right + bottom-left
    if (i < 8) m[size - 1 - i][8] = bit;
    else m[8][size - 15 + i] = bit;
  }

  return m;
}

export function qrSvgDataUrl(text: string, scale = 4): string {
  const bytes = encodeByte(text);
  let version = 1;
  while (version <= 10 && bytes.length + 2 > CAPACITY_L[version - 1]) version++;
  if (version > 10) version = 10; // cap; truncate payload implicitly

  const bits: number[] = [];
  pushBits(bits, 0b0100, 4); // byte mode
  pushBits(bits, bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) pushBits(bits, b, 8);
  // terminator
  const totalDataBits = CAPACITY_L[version - 1] * 8;
  for (let i = 0; i < 4 && bits.length < totalDataBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const dataBytes = bitsToBytes(bits);
  const ecCount = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18][version - 1];
  const ec = rsEncode(dataBytes, ecCount);
  const all = dataBytes.concat(ec);
  const matrix = buildMatrix(version, all);
  const size = matrix.length;
  const dim = size * scale;
  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) rects += `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><rect width="${dim}" height="${dim}" fill="white"/><g fill="black">${rects}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
