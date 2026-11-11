// Luka — first character drawn to Docs/CharacterBible.md.
// MD 3-head human, light skin, short brown hair, tier 1 training outfit,
// unique part: short red scarf. Prop: wooden practice sword.
// Usage: node Tools/build-luka-sprite.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, CELL, BASE, SKIN, HAIR, NAVY, RED, LEATHER, layer, rect, px, part, thick, outline, backHair, head,
  coloursUsed, writeKeys } from './lib/pixel-character.mjs';

const OUT = join(root, 'Assets', 'Characters', 'luka');
const skin = SKIN.light, hair = HAIR.brown, cloth = NAVY, boot = LEATHER;
const WOOD = ['J', 'K', 'L'], SCARF = [RED[0], RED[1]];
const TORSO = 14, LEG = 14, HEAD_H = 14;

// A pose: bob moves the upper body down, lean moves it sideways (feet stay planted).
// Feet: [dx from hip, lift]. Arms: elbow and hand in canvas coordinates before lean/bob.
function draw(p) {
  const L = layer();
  const lean = p.lean || 0, bob = p.bob || 0;
  const tt = BASE - LEG - TORSO + bob, ht = tt - HEAD_H, hipY = tt + TORSO;
  const U = (x) => x + lean;

  const leg = (T, hipX, [fdx, lift], ramp, kneeBend) => {
    const footX = hipX + fdx, footY = BASE - 1 - lift, kneeY = hipY + Math.floor((footY - hipY) / 2);
    const kneeX = (hipX + footX) / 2 + kneeBend + (lift ? 1 : 0);
    for (let y = hipY; y <= footY; y++) {
      const t = y <= kneeY ? (y - hipY) / Math.max(1, kneeY - hipY) : (y - kneeY) / Math.max(1, footY - kneeY);
      const cx = Math.round(y <= kneeY ? hipX + (kneeX - hipX) * t : kneeX + (footX - kneeX) * t);
      const isBoot = y > footY - 3;
      rect(T, cx - 2, y, 4, 1, isBoot ? ramp.boot : ramp.cloth);
      if (isBoot && y >= footY - 1) px(T, cx + 2, y, ramp.boot); // toe
    }
  };
  const arm = (T, sh, el, hd, ramp) => {
    thick(T, sh[0], sh[1], el[0], el[1], 3, 3, ramp);
    thick(T, el[0], el[1], hd[0], hd[1], 3, 3, ramp);
  };
  const hand = (T, hd, k) => rect(T, Math.round(hd[0]) - 1, Math.round(hd[1]) - 1, 3, 3, k);
  const sword = (T, hd, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    thick(T, hd[0] + c * 2, hd[1] + s * 2, hd[0] + c * 14, hd[1] + s * 14, 2, 2, WOOD[2]); // blade
    thick(T, hd[0] - c * 2, hd[1] - s * 2, hd[0], hd[1], 1, 1, WOOD[0]);                 // pommel
    for (const d of [-2, -1, 0, 1, 2]) px(T, Math.round(hd[0] + c * 2 - s * d), Math.round(hd[1] + s * 2 + c * d), WOOD[0]); // guard
  };
  const A = (pt) => [U(pt[0]), pt[1] + bob];

  // 1. far arm, far leg (one ramp step darker)
  arm(L, A([30, 34]), A(p.farArm[0]), A(p.farArm[1]), cloth[0]);
  hand(L, A(p.farArm[1]), skin[0]);
  leg(L, U(31), p.far, { cloth: cloth[0], boot: boot[0] }, 1);
  // 2. scarf tail behind the body
  const flutter = p.flutter || 0;
  rect(L, U(23), tt + 1 + flutter, 5, 2, SCARF[1]); rect(L, U(21), tt + 3 + flutter, 4, 2, SCARF[0]);
  // 3. torso: top light, bottom shadow, belt
  rect(L, U(27), tt, 10, TORSO, cloth[1]);
  rect(L, U(28), tt, 8, 1, cloth[2]);
  rect(L, U(27), tt + TORSO - 2, 10, 2, cloth[0]);
  rect(L, U(27), tt + TORSO - 3, 10, 1, boot[1]);
  // 4. near leg over far leg
  part(L, (T) => leg(T, U(34), p.near, { cloth: cloth[1], boot: boot[1] }, 1));
  // 5. head (shared template) and scarf knot
  backHair(L, ht, hair, 'short', lean);
  head(L, ht, skin, hair, 'short', 'human', lean);
  rect(L, U(27), tt - 1, 10, 2, SCARF[1]); rect(L, U(27), tt, 10, 1, SCARF[0]);
  // 6. near arm, sword, gripping hand
  part(L, (T) => arm(T, A([33, 34]), A(p.nearArm[0]), A(p.nearArm[1]), cloth[1]));
  if (p.sword !== null) part(L, (T) => sword(T, A(p.nearArm[1]), p.sword));
  part(L, (T) => hand(T, A(p.nearArm[1]), skin[1]));
  outline(L);
  return L;
}

// ---------- poses ----------
const rest = { near: [3, 0], far: [-3, 0], farArm: [[29, 41], [29, 45]], nearArm: [[34, 40], [36, 45]], sword: 62 };
const IDLE = [
  { ...rest, d: 200 }, { ...rest, d: 200 },
  { ...rest, bob: 1, d: 200 }, { ...rest, bob: 1, flutter: 1, d: 200 },
];
const walkArm = (dx) => ({ farArm: [[29 + dx / 2, 41], [29 + dx, 45]], nearArm: [[34 - dx / 2, 40], [36 - dx, 45]] });
const WALK = [
  { near: [4, 0], far: [-4, 0], ...walkArm(2), bob: 0 },
  { near: [2, 0], far: [-3, 1], ...walkArm(1), bob: 1, flutter: 1 },
  { near: [-1, 0], far: [1, 2], ...walkArm(0), bob: 0 },
  { near: [-4, 0], far: [4, 0], ...walkArm(-2), bob: 0 },
  { near: [-3, 1], far: [2, 0], ...walkArm(-1), bob: 1, flutter: 1 },
  { near: [1, 2], far: [-1, 0], ...walkArm(0), bob: 0 },
].map((f) => ({ ...f, sword: 62, d: 110 }));
const ATTACK = [
  { near: [3, 0], far: [-3, 0], farArm: [[30, 40], [32, 43]], nearArm: [[35, 38], [38, 39]], sword: -50, d: 80 },
  { near: [3, 0], far: [-3, 0], farArm: [[30, 40], [31, 44]], nearArm: [[31, 34], [27, 31]], sword: -160, lean: -1, d: 80 },
  { near: [4, 0], far: [-3, 0], farArm: [[30, 40], [30, 44]], nearArm: [[35, 32], [38, 29]], sword: -80, d: 60 },
  { near: [6, 0], far: [-4, 0], farArm: [[29, 39], [27, 42]], nearArm: [[37, 36], [42, 37]], sword: 10, lean: 1, bob: 1, d: 140 },
  { near: [5, 0], far: [-4, 0], farArm: [[29, 40], [28, 44]], nearArm: [[37, 38], [40, 41]], sword: 45, lean: 1, bob: 1, d: 100 },
  { near: [3, 0], far: [-3, 0], farArm: [[30, 41], [31, 44]], nearArm: [[35, 39], [37, 42]], sword: 10, d: 100 },
];

// ---------- export ----------
const anims = { idle: IDLE, walk: WALK, attack: ATTACK };
const cols = Math.max(...Object.values(anims).map((a) => a.length)), rows = Object.keys(anims).length;
const sheet = layer(cols * CELL, rows * CELL), atlas = {
  image: 'atlas.png', frameWidth: CELL, frameHeight: CELL, pivot: { x: 32, y: BASE }, facing: 'right', scale: 2,
  animations: {}, provenance: { bible: 'Docs/CharacterBible.md', builder: 'Tools/build-luka-sprite.mjs', drawnBy: 'procedural pixel construction, no image model' },
};
const allColours = new Set();
Object.entries(anims).forEach(([name, poses], r) => {
  atlas.animations[name] = { loop: name !== 'attack', frames: [] };
  poses.forEach((p, c) => {
    const L = draw(p);
    for (const k of coloursUsed(L)) allColours.add(k);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) sheet[r * CELL + y][c * CELL + x] = L[y][x];
    atlas.animations[name].frames.push({ x: c * CELL, y: r * CELL, w: CELL, h: CELL, duration: p.d });
    if (name === 'idle' && c === 0) writeKeys(join(OUT, 'portrait.png'), L.slice(14, 46).map((row) => row.slice(20, 44)));
  });
  atlas.animations[name].duration = poses.reduce((s, p) => s + p.d, 0);
});
writeKeys(join(OUT, 'atlas.png'), sheet);
writeFileSync(join(OUT, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n');
// review sheet: x4 on the camp lane colour, baseline marked
writeKeys(join(root, 'Art', 'Previews', 'luka-frames.png'), sheet.map((row, y) => row.map((k) => k ?? (y % CELL === BASE ? 'r' : '#2a3a30'))), { scale: 4 });

if (allColours.size > 16) throw new Error(`Luka uses ${allColours.size} colours; the bible allows 16`);
console.log(`Luka: ${allColours.size} colours (${[...allColours].sort().join('')}), sheet ${cols * CELL}x${rows * CELL}`);
