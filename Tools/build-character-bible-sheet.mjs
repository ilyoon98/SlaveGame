// Builds the character bible reference sheet and the native proportion templates.
// Usage: node Tools/build-character-bible-sheet.mjs
// Inputs:  Art/Bible/palette.json
// Outputs: Art/Bible/character-template-sheet.png (x4 preview with guides)
//          Art/Bible/templates/human-md.png, goblin.png (64x64 native, pivot 32,60)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { palette, ramps as RAMPS, bibleDir as bible, CELL, BASE, CX, HEAD, SKIN, HAIR, RAG, NAVY, RED, STAGE, LEATHER, METAL,
  layer, rect, outline, backHair, head, png, hex } from './lib/pixel-character.mjs';

// ---------- body: same construction, proportions vary ----------
const OUTFITS = {
  rag:   { top: RAG, pants: null, boots: null, belt: RAG[0] },
  train: { top: NAVY, pants: NAVY, boots: LEATHER, belt: LEATHER[1] },
  arena: { top: null, pants: RED, boots: LEATHER, belt: LEATHER[1], sash: RED, plate: METAL },
  stage: { top: STAGE, pants: STAGE, boots: LEATHER, belt: 'r', collar: 'r' },
  exped: { top: LEATHER, pants: NAVY, boots: LEATHER, belt: LEATHER[0], plate: METAL },
};
function body(L, torsoTop, torsoH, legH, width, skin, outfitName) {
  const o = OUTFITS[outfitName];
  const legTop = BASE - legH, tx = CX - Math.floor(width / 2);
  const top = o.top || skin, pants = o.pants || skin;
  const boot = o.boots, bootH = Math.max(2, Math.round(legH * 0.25));
  // far limbs first, one ramp step darker
  rect(L, 29, legTop, 4, legH, pants[0]);
  if (boot) rect(L, 29, BASE - bootH, 5, bootH, boot[0]); else rect(L, 29, BASE - 1, 5, 1, skin[0]);
  rect(L, tx - 1, torsoTop + 1, 3, torsoH - 2, top[0]);
  rect(L, tx - 1, torsoTop + torsoH - 3, 3, 2, skin[0]);
  // torso: highlight top row, shadow bottom rows
  rect(L, tx, torsoTop, width, torsoH, top[1]);
  rect(L, tx + 1, torsoTop, width - 2, 1, top[2]);
  rect(L, tx, torsoTop + torsoH - 2, width, 2, top[0]);
  if (o.sash) for (let i = 0; i < torsoH - 2; i++) rect(L, tx + Math.min(width - 3, i), torsoTop + i, 3, 1, o.sash[1]);
  if (o.collar) rect(L, tx + 2, torsoTop, width - 3, 1, o.collar);
  rect(L, tx, torsoTop + torsoH - 3, width, 1, o.belt);
  if (outfitName === 'rag') rect(L, tx, torsoTop + torsoH, width, 2, RAG[0]); // tunic hem over thighs
  // near limbs
  rect(L, 32, legTop, 4, legH, pants[1]);
  rect(L, 32, legTop, 1, legH, pants[0]);
  if (boot) { rect(L, 32, BASE - bootH, 5, bootH, boot[1]); rect(L, 32, BASE - bootH, 5, 1, boot[2]); }
  else { rect(L, 32, BASE - 1, 5, 1, skin[1]); }
  const armH = torsoH - 1;
  rect(L, 31, torsoTop + 1, 1, armH, top[0]);                 // selective inner line
  rect(L, 32, torsoTop + 1, 3, armH, top[2] === skin[2] ? skin[1] : top[1]);
  rect(L, 32, torsoTop + armH - 1, 3, 2, skin[1]);            // hand
  if (o.plate) { rect(L, 30, torsoTop - 1, 7, 3, o.plate[1]); rect(L, 31, torsoTop - 1, 5, 1, o.plate[2]); }
}

// proportions: total height = head + torso + legs, measured from baseline 60
const KINDS = {
  sd:     { torsoH: 7,  legH: 7,  width: 10, race: 'human' },  // 2 heads, 28px  (comparison only)
  md:     { torsoH: 14, legH: 14, width: 10, race: 'human' },  // 3 heads, 42px  (adopted: humans)
  goblin: { torsoH: 11, legH: 10, width: 12, race: 'goblin' }, // 2.5 heads, 35px (adopted: goblins)
};
function character(kind, { skin = SKIN.light, hair = HAIR.brown, style = 'short', outfit = 'rag' } = {}) {
  const K = KINDS[kind], L = layer();
  const torsoTop = BASE - K.legH - K.torsoH, headTop = torsoTop - HEAD;
  backHair(L, headTop, hair, style);
  body(L, torsoTop, K.torsoH, K.legH, K.width, kind === 'goblin' ? SKIN.goblin : skin, outfit);
  head(L, headTop, kind === 'goblin' ? SKIN.goblin : skin, hair, style, K.race);
  outline(L);
  return { L, headTop };
}

// ---------- tiny 3x5 label font ----------
const GLYPH = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['111', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], G: ['111', '100', '101', '101', '111'],
  H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], L: ['100', '100', '100', '100', '111'],
  M: ['10001', '11011', '10101', '10001', '10001'], N: ['110', '101', '101', '101', '101'], O: ['111', '101', '101', '101', '111'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'], S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'], X: ['101', '101', '010', '101', '101'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 5: ['111', '100', '111', '001', '111'], '.': ['0', '0', '0', '0', '1'], ' ': ['0', '0', '0', '0', '0'],
};
const textWidth = (s) => [...s].reduce((w, ch) => w + GLYPH[ch][0].length + 1, -1);

// ---------- compose the sheet ----------
const COLS = 4, ROWH = CELL + 9, PAL_Y = ROWH * 2 + 4;
const W = CELL * COLS, H = PAL_Y + 40;
const sheet = Array.from({ length: H }, () => Array(W).fill('bg'));
const COLORS = { ...palette, bg: '#2a3a30', label: '#dfd2ae', dim: '#7f8f78', guide: '#c9a65d' };
const blit = (L, ox, oy) => { for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (L[y][x]) sheet[oy + y][ox + x] = L[y][x]; };
const label = (s, cx, y, color = 'label') => {
  let x = Math.round(cx - textWidth(s) / 2);
  for (const ch of s) { const g = GLYPH[ch]; g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') sheet[y + j][x + i] = color; })); x += g[0].length + 1; }
};

const row1 = [
  ['SD 2H', character('sd', { hair: HAIR.brown }), 'dim', 'sd'],
  ['MD 3H', character('md', { hair: HAIR.brown }), 'label', 'md'],
  ['GOB 2.5H', character('goblin', { hair: null, style: 'crop' }), 'label', 'goblin'],
  ['GOB EXPED', character('goblin', { hair: HAIR.black, style: 'crop', outfit: 'exped' }), 'label', 'goblin'],
];
const row2 = [
  ['RAG', character('md', { skin: SKIN.tan, hair: HAIR.black, style: 'crop', outfit: 'rag' })],
  ['TRAIN', character('md', { skin: SKIN.light, hair: HAIR.brown, style: 'short', outfit: 'train' })],
  ['ARENA', character('md', { skin: SKIN.tan, hair: HAIR.red, style: 'tail', outfit: 'arena' })],
  ['STAGE', character('md', { skin: SKIN.light, hair: HAIR.blond, style: 'long', outfit: 'stage' })],
];
const guides = [];
row1.forEach(([name, c, color, kind], i) => { blit(c.L, i * CELL, 0); label(name, i * CELL + CX, CELL + 2, color); guides.push({ x: i * CELL, y: 0, kind, headTop: c.headTop }); });
row2.forEach(([name, c], i) => { blit(c.L, i * CELL, ROWH); label(name, i * CELL + CX, ROWH + CELL + 2); guides.push({ x: i * CELL, y: ROWH, kind: 'md', headTop: c.headTop }); });

label('PALETTE', 26, PAL_Y);
const ramps = [['o', 'w'], ...RAMPS];
ramps.forEach((ramp, i) => [...ramp].reverse().forEach((k, j) => {
  const x0 = 4 + i * 9, y0 = PAL_Y + 8 + j * 9; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) sheet[y0 + y][x0 + x] = k;
}));

// preview x4 with 1px guide lines drawn between art pixels
mkdirSync(join(bible, 'templates'), { recursive: true });
const S = 4, PW = W * S, PH = H * S, out = Buffer.alloc(PW * PH * 4);
const put = (x, y, [r, g, b], a = 255) => { const o = (y * PW + x) * 4; out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a; };
for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) put(x, y, hex(COLORS[sheet[Math.floor(y / S)][Math.floor(x / S)]]));
for (const g of guides) {
  const lines = [[BASE, 'guide', 1]];
  if (g.y === 0) { const n = { sd: 2, md: 3, goblin: 2.5 }[g.kind]; for (let k = 1; k <= Math.ceil(n); k++) lines.push([BASE - Math.min(k * HEAD, BASE - g.headTop), 'dim', 2]); }
  for (const [ly, color, dash] of lines) for (let x = g.x * S + 2; x < (g.x + CELL) * S - 2; x++) if (dash === 1 || (x >> 2) % 2) put(x, (g.y + ly) * S, hex(COLORS[color]));
}
writeFileSync(join(bible, 'character-template-sheet.png'), png(PW, PH, out));

// native 64x64 templates with transparent background
for (const [file, c] of [['human-md.png', row1[1][1]], ['goblin.png', row1[2][1]]]) {
  const buf = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const k = c.L[y][x]; if (k) { const [r, g, b] = hex(palette[k]); buf.set([r, g, b, 255], (y * CELL + x) * 4); } }
  writeFileSync(join(bible, 'templates', file), png(CELL, CELL, buf));
}
const used = (L) => new Set(L.flat().filter(Boolean)).size;
console.log('sheet', PW + 'x' + PH, '| colours per character:', [...row1, ...row2].map(([n, c]) => `${n}=${used(c.L)}`).join(', '));
