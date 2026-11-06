// Uses the installed Codixel core for reference-based pixel conversion.
// This creates an art preview, not animation frames or an approved game atlas.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const core = process.argv[2] || path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills', 'codixel', 'core', 'pixel.js');
const P = require(core);
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'Art', 'Previews');
fs.mkdirSync(out, { recursive: true });
const sourcePath = path.join(root, 'Art', 'Source', 'swordsman-simple-master.png');
const source = P.load(sourcePath);
const trimmed = P.trim(source, 0);
const width = Math.round(trimmed.w * 72 / trimmed.h);
const intermediate = P.resize(trimmed, Math.round(trimmed.w * 288 / trimmed.h), 288);
const quantized = P.quantize(intermediate, 24, { dither: true });
const resized = P.resize(quantized.buf, width, 72, { mode: true });
const cleaned = P.cleanup(resized, { tol: 20, keepLone: true });
const sprite = new P.Buf(64, 80);
sprite.sprite(cleaned, Math.floor((64 - cleaned.w) / 2), 76 - cleaned.h);
const changed = (a, b) => Array.from(a.px).reduce((n, c, i) => n + (c !== b.px[i] ? 1 : 0), 0);
const board = P.sheet([
  { buf: trimmed, label: 'SIMPLIFIED MASTER' },
  { buf: sprite, label: '64x80 - 5X', scale: 5 },
  { buf: sprite, label: '1X', scale: 1 }
], { cols: 3, fit: 384, gap: 24 });
P.save(board, path.join(out, 'swordsman-comparison.png'));
const colors = P.colorCount(sprite);
const edge = P.edgeCheck(sprite);
fs.writeFileSync(path.join(out, 'swordsman-preview-report.json'), JSON.stringify({
  status: 'static art preview only; no character animation generated',
  source: 'Art/Source/swordsman-simple-master.png',
  process: ['built-in image_gen simplification', 'Codixel trim', 'Codixel 24-color quantization at 288px subject height', 'Codixel mode resize to preserve dominant pixel shapes', 'Codixel cleanup', 'Codixel comparison sheet'],
  canvas: { width: 64, height: 80 }, subject: { width: cleaned.w, height: cleaned.h },
  alphaLevels: [...new Set([...sprite.px].map(c => c >>> 24))].sort((a, b) => a - b),
  cleanupPixelsChanged: changed(resized, cleaned), colors,
  silhouetteDiagnostics: Object.fromEntries(Object.entries(edge).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])),
  note: 'Hair tufts, sword tip and armor corners need visual interpretation; numerical edge flags are not automatic failures.'
}, null, 2));
console.log(JSON.stringify({ preview: path.join(out, 'swordsman-comparison.png'), canvas: [64, 80], subject: [cleaned.w, cleaned.h], cleanupPixelsChanged: changed(resized, cleaned), colorCount: colors.length, edge: Object.fromEntries(Object.entries(edge).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])) }));
