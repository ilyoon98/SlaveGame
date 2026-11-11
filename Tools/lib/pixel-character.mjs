// Shared drawing rules for Docs/CharacterBible.md: palette, the 14x14 head template,
// outline, inner lines and a dependency-free PNG writer.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const bibleDir = join(root, 'Art', 'Bible');
const paletteFile = JSON.parse(readFileSync(join(bibleDir, 'palette.json'), 'utf8'));
export const palette = paletteFile.palette;
export const ramps = paletteFile.ramps;

// fixed bible constants
export const CELL = 64, BASE = 60, CX = 32, HEAD = 14;
export const SKIN = { light: ['a', 'b', 'c'], tan: ['d', 'e', 'f'], goblin: ['g', 'h', 'i'] };
export const HAIR = { brown: ['j', 'k', 'l'], black: ['m', 'n', 'p'], blond: ['q', 'r', 's'], red: ['t', 'u', 'v'] };
export const RAG = ['x', 'y', 'z'], NAVY = ['A', 'B', 'C'], RED = ['D', 'E', 'F'], STAGE = ['G', 'H', 'I'];
export const LEATHER = ['J', 'K', 'L'], METAL = ['M', 'N', 'O'];

export function layer(w = CELL, h = CELL) { return Array.from({ length: h }, () => Array(w).fill(null)); }
export function rect(L, x, y, w, h, k) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (L[j] && i >= 0 && i < L[0].length) L[j][i] = k;
}
export const px = (L, x, y, k) => rect(L, x, y, 1, 1, k);

/** Darkest colour of the ramp a key belongs to (used for selective inner lines). */
export function darkOf(k) { const r = ramps.find((ramp) => ramp.includes(k)); return r ? r[0] : 'o'; }

/** 1px outer outline in 'o' on transparent pixels touching art (4-neighbour). */
export function outline(L) {
  const add = [];
  for (let y = 0; y < L.length; y++) for (let x = 0; x < L[0].length; x++) {
    if (L[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L[y + dy]?.[x + dx] && L[y + dy][x + dx] !== 'o')) add.push([x, y]);
  }
  for (const [x, y] of add) L[y][x] = 'o';
}

/** Draw a part on its own layer, darken its edge where it overlaps existing art, then merge. */
export function part(L, draw) {
  const T = layer(L[0].length, L.length);
  draw(T);
  for (let y = 0; y < T.length; y++) for (let x = 0; x < T[0].length; x++) {
    const k = T[y][x]; if (!k) continue;
    const edgeOverArt = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !T[y + dy]?.[x + dx] && L[y + dy]?.[x + dx]);
    L[y][x] = edgeOverArt ? darkOf(k) : k;
  }
}

/** Thick line: stamps a w x h block on every Bresenham step. */
export function thick(L, x0, y0, x1, y1, w, h, k) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    rect(L, x0 - Math.floor(w / 2), y0 - Math.floor(h / 2), w, h, k);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ---------- the shared 14x14 head template ----------
export function backHair(L, top, hair, style, dx = 0) {
  if (!hair) return;
  const R = (x, y, w, h, k) => rect(L, x + dx, y, w, h, k), B = hair[1];
  if (style === 'long') { R(23, top + 3, 6, 17, B); R(23, top + 18, 3, 2, hair[0]); }
  if (style === 'tail') { R(21, top + 4, 4, 3, B); R(20, top + 7, 4, 5, B); R(21, top + 12, 2, 2, hair[0]); }
}
export function head(L, top, skin, hair, style, race, dx = 0) {
  const R = (x, y, w, h, k) => rect(L, x + dx, y, w, h, k), P = (x, y, k) => R(x, y, 1, 1, k);
  const [S, B, H] = skin;
  R(25, top, 14, 14, B);
  for (const [x, y] of [[25, 0], [38, 0], [25, 13], [38, 13], [26, 13]]) P(x, top + y, null);
  R(28, top + 12, 10, 1, S);              // jaw shadow (top light)
  R(37, top + 5, 1, 2, H);                // brow-ridge highlight
  P(35, top + 6, 'o'); P(35, top + 7, 'o'); P(36, top + 6, 'w'); // eye: same 2px for everyone
  R(35, top + 10, 2, 1, S);               // mouth
  if (race === 'goblin') { R(39, top + 7, 2, 3, B); P(40, top + 9, S); }
  else P(39, top + 8, B);
  if (hair) {
    const [hS, hB, hH] = hair, rows = style === 'crop' ? 3 : 4;
    R(26, top, 12, rows, hB); R(25, top + 1, 1, rows - 1, hB);
    R(25, top + rows, style === 'crop' ? 3 : 5, style === 'crop' ? 3 : 5, hB);
    R(26, top + rows - 1, 11, 1, hS);
    R(30, top + 1, 4, 1, hH);
    if (style !== 'crop') P(37, top + rows, hB);
    R(34, top + 5, 3, 1, hS);
  } else R(34, top + 5, 3, 1, S);
  if (race === 'goblin') {
    R(19, top + 5, 3, 1, B); R(20, top + 6, 7, 1, B); R(21, top + 7, 9, 1, B); R(24, top + 8, 6, 1, B);
    R(23, top + 7, 5, 1, S);
  } else R(30, top + 6, 2, 3, S);
}

export const coloursUsed = (L) => new Set(L.flat().filter(Boolean));

// ---------- PNG ----------
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function crc32(buf) { let c, crc = ~0; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
/** Write a grid of palette keys as a PNG. `scale` enlarges by nearest neighbour; `bg` fills transparency. */
export function writeKeys(file, grid, { scale = 1, bg = null, colours = palette } = {}) {
  const h = grid.length, w = grid[0].length, W = w * scale, H = h * scale, buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = grid[Math.floor(y / scale)][Math.floor(x / scale)] ?? bg; if (!k) continue;
    const [r, g, b] = hex(colours[k] ?? k); buf.set([r, g, b, 255], (y * W + x) * 4);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png(W, H, buf));
}
