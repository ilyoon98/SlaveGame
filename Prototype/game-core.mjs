export const MAX_PARTY = 2;
export const COMBAT = Object.freeze({ heroDuration: .77, heroHitTime: .28, heroInterval: 1.08, enemyDuration: .77, enemyHitTime: .38, enemyInterval: 1.65 });
export const DIFFICULTIES = Object.freeze({
  easy: { id: 'easy', name: '안개 숲길', subtitle: '초급 원정', rank: 1, reward: 28, enemies: [{ name: '길 잃은 검사', hp: 48, attack: 5 }, { name: '숲길 경비병', hp: 62, attack: 6 }] },
  mid: { id: 'mid', name: '무너진 성문', subtitle: '중급 원정', rank: 2, reward: 48, enemies: [{ name: '떠돌이 용병', hp: 100, attack: 13 }, { name: '성문 수비대', hp: 128, attack: 15 }] },
  hard: { id: 'hard', name: '잿빛 왕도', subtitle: '상급 원정', rank: 3, reward: 80, enemies: [{ name: '왕도 정예병', hp: 190, attack: 25 }, { name: '황혼의 기사', hp: 230, attack: 28 }] },
});
const PHASES_ACTIVE = new Set(['travel', 'battle', 'capture', 'return']);
const ROLES = new Set(['idle', 'labor', 'party']);
const NAMES = ['루카', '에린', '로웬', '시온', '리안', '노아', '카이', '벨'];
const clone = value => JSON.parse(JSON.stringify(value));
const finite = (n, fallback, lo = 0, hi = 1e7) => Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
export function createDefaultSave() {
  return { version: 1, gold: 35, heroLevel: 1, roster: [], capacity: 6, completed: 0, totalCaptured: 0, nextId: 1 };
}
export function sanitizeSave(raw) {
  const clean = createDefaultSave();
  if (!raw || raw.version !== 1 || typeof raw !== 'object') return clean;
  clean.gold = finite(raw.gold, 35);
  clean.heroLevel = Math.floor(finite(raw.heroLevel, 1, 1, 100));
  clean.capacity = Math.floor(finite(raw.capacity, 6, 2, 50));
  clean.completed = Math.floor(finite(raw.completed, 0));
  clean.totalCaptured = Math.floor(finite(raw.totalCaptured, 0));
  let party = 0;
  const seen = new Set();
  clean.roster = (Array.isArray(raw.roster) ? raw.roster : []).slice(0, clean.capacity).filter(m => m && Number.isInteger(m.id) && m.id > 0 && !seen.has(m.id) && (seen.add(m.id) || true)).map(m => {
    let role = ROLES.has(m.role) ? m.role : 'idle';
    if (role === 'party' && party++ >= MAX_PARTY) role = 'idle';
    return { id: m.id, name: typeof m.name === 'string' ? m.name.slice(0, 16) : '모험가', rank: Math.floor(finite(m.rank, 1, 1, 3)), attack: Math.floor(finite(m.attack, 4, 1, 100)), role };
  });
  clean.nextId = Math.max(Math.floor(finite(raw.nextId, 1, 1)), 1, ...clean.roster.map(m => m.id + 1));
  clean.totalCaptured = Math.max(clean.totalCaptured, clean.roster.length);
  return clean;
}

export class ExpeditionGame {
  constructor(saved) {
    this.base = sanitizeSave(saved);
    this.paused = false;
    this.speed = 1;
    this.events = [];
    this.eventId = 0;
    this.runId = 0;
    this.run = this.freshRun();
  }
  freshRun() { return { phase: 'camp', time: 0, phaseTime: 0, worldX: 0, hp: 0, maxHp: 0, enemyIndex: 0, enemy: null, heroAttack: null, enemyAttack: null, pendingCaptures: [], pendingGold: 0, result: null, settled: false, party: [], participants: [], defeated: 0, success: false, heroCooldown: 0, enemyCooldown: 0, difficulty: 'easy', returnStartX: 0 }; }
  isActive() { return PHASES_ACTIVE.has(this.run.phase); }
  heroStats() { return { maxHp: 110 + (this.base.heroLevel - 1) * 22, attack: 14 + (this.base.heroLevel - 1) * 5 }; }
  trainingCost() { return Math.round(40 * Math.pow(1.48, this.base.heroLevel - 1)); }
  capacityCost() { return 60 + (this.base.capacity - 6) * 10; }
  laborRate() { return this.base.roster.filter(m => m.role === 'labor').reduce((s, m) => s + .65 + m.rank * .15, 0); }
  getSave() { return clone(this.base); }
  emit(type, values = {}) {
    const event = { id: ++this.eventId, type, time: this.run.time, ...values };
    this.events.push(event);
    if (this.events.length > 300) this.events.shift();
    return event;
  }
  setPaused(value) { this.paused = !!value; }
  setSpeed(value) { this.speed = value === 2 ? 2 : 1; }
  setRole(id, role) {
    const member = this.base.roster.find(m => m.id === id);
    if (!member || !ROLES.has(role)) return false;
    if (this.isActive() && (member.role === 'party' || role === 'party')) return false;
    if (role === 'party' && member.role !== 'party' && this.base.roster.filter(m => m.role === 'party').length >= MAX_PARTY) return false;
    member.role = role;
    this.emit('role', { memberId: id, role });
    return true;
  }
  trainHero() {
    const cost = this.trainingCost();
    if (this.isActive() || this.base.gold < cost || this.base.heroLevel >= 100) return false;
    this.base.gold -= cost;
    this.base.heroLevel++;
    this.emit('training', { level: this.base.heroLevel, cost });
    return true;
  }
  expandCapacity() {
    const cost = this.capacityCost();
    if (this.base.gold < cost || this.base.capacity >= 50) return false;
    this.base.gold -= cost;
    this.base.capacity = Math.min(50, this.base.capacity + 2);
    this.emit('expansion', { capacity: this.base.capacity, cost });
    return true;
  }
  dispatch(difficulty = 'easy') {
    if (this.isActive() || !DIFFICULTIES[difficulty]) return false;
    const stats = this.heroStats();
    this.run = this.freshRun();
    Object.assign(this.run, { phase: 'travel', id: ++this.runId, difficulty, hp: stats.maxHp, maxHp: stats.maxHp, attack: stats.attack });
    this.run.party = clone(this.base.roster.filter(m => m.role === 'party'));
    this.run.participants = this.run.party.map(m => m.id);
    this.run.attack += this.run.party.reduce((s, m) => s + m.attack, 0);
    this.run.maxHp += this.run.party.length * 18;
    this.run.hp = this.run.maxHp;
    this.paused = false;
    this.emit('dispatch', { difficulty, partySize: this.run.party.length });
    return true;
  }
  retreat() {
    if (!this.isActive() || this.run.phase === 'return') return false;
    this.run.pendingCaptures = [];
    this.run.pendingGold = 0;
    this.beginReturn(false, 'retreat');
    return true;
  }
  returnToCamp() {
    if (this.run.phase !== 'result') return false;
    this.run = this.freshRun();
    return true;
  }
  beginReturn(success, reason = 'victory') {
    const r = this.run;
    r.phase = 'return'; r.phaseTime = 0; r.returnStartX = r.worldX;
    r.success = success; r.reason = reason; r.heroAttack = null; r.enemyAttack = null;
    if (!success) { r.pendingGold = 0; r.pendingCaptures = []; }
    this.emit('return', { success, reason });
  }
  startBattle() {
    const r = this.run, def = DIFFICULTIES[r.difficulty].enemies[r.enemyIndex];
    r.phase = 'battle'; r.phaseTime = 0;
    r.enemy = { ...def, maxHp: def.hp };
    r.heroCooldown = 0; r.enemyCooldown = .42; r.heroAttack = null; r.enemyAttack = null;
    this.emit('encounter', { name: def.name, index: r.enemyIndex });
  }
  attackStep(side, dt) {
    const r = this.run;
    const key = side === 'hero' ? 'heroAttack' : 'enemyAttack';
    const cooldown = side === 'hero' ? 'heroCooldown' : 'enemyCooldown';
    const hitTime = side === 'hero' ? COMBAT.heroHitTime : COMBAT.enemyHitTime;
    const duration = side === 'hero' ? COMBAT.heroDuration : COMBAT.enemyDuration;
    const interval = side === 'hero' ? COMBAT.heroInterval : COMBAT.enemyInterval;
    if (!r[key]) {
      r[cooldown] -= dt;
      if (r[cooldown] <= 0) { r[key] = { elapsed: 0, hit: false }; this.emit('attack', { side }); }
    }
    const swing = r[key];
    if (!swing) return;
    swing.elapsed += dt;
    if (!swing.hit && swing.elapsed >= hitTime) {
      swing.hit = true;
      const damage = side === 'hero' ? r.attack : r.enemy.attack;
      if (side === 'hero') r.enemy.hp = Math.max(0, r.enemy.hp - damage);
      else r.hp = Math.max(0, r.hp - damage);
      this.emit('damage', { side, target: side === 'hero' ? 'enemy' : 'hero', damage, amount: damage, hp: side === 'hero' ? r.enemy.hp : r.hp });
    }
    if (swing.elapsed >= duration) { r[key] = null; r[cooldown] = interval - duration; }
  }
  captureEnemy() {
    const r = this.run, area = DIFFICULTIES[r.difficulty];
    r.phase = 'capture'; r.phaseTime = 0; r.heroAttack = null; r.enemyAttack = null; r.defeated++;
    r.pendingGold += area.reward + r.enemyIndex * 4;
    const hasSpace = this.base.roster.length + r.pendingCaptures.length < this.base.capacity;
    if (hasSpace) {
      const member = { name: NAMES[(this.base.totalCaptured + r.pendingCaptures.length) % NAMES.length], rank: area.rank, attack: area.rank * 3 + 2, role: 'idle' };
      r.pendingCaptures.push(member);
      this.emit('capture', { name: member.name, pending: true, enemyIndex: r.enemyIndex });
    } else this.emit('capacity-full', { enemyIndex: r.enemyIndex });
  }
  settle() {
    const r = this.run;
    if (r.settled) return;
    r.settled = true;
    const members = r.success ? r.pendingCaptures.slice(0, Math.max(0, this.base.capacity - this.base.roster.length)) : [];
    const gold = r.success ? r.pendingGold : 0;
    this.base.gold += gold;
    for (const member of members) this.base.roster.push({ ...member, id: this.base.nextId++ });
    this.base.totalCaptured += members.length;
    if (r.success) this.base.completed++;
    r.result = { success: r.success, reason: r.reason, gold, captured: members.length, names: members.map(m => m.name) };
    r.phase = 'result'; r.phaseTime = 0;
    this.emit('settlement', { ...r.result, runId: r.id });
  }
  tick(seconds) {
    if (this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = Math.min(seconds, 120) * this.speed;
    while (remaining > 1e-8) { const dt = Math.min(remaining, 1 / 60); this.step(dt); remaining -= dt; }
  }
  step(dt) {
    this.base.gold = Math.min(1e7, this.base.gold + this.laborRate() * dt);
    const r = this.run;
    r.time += dt; r.phaseTime += dt;
    if (r.phase === 'travel') {
      const target = [360, 740][r.enemyIndex];
      r.worldX = Math.min(target, r.worldX + 76 * dt);
      if (r.worldX >= target) this.startBattle();
    } else if (r.phase === 'battle') {
      this.attackStep('hero', dt);
      if (r.enemy.hp <= 0) { this.captureEnemy(); return; }
      this.attackStep('enemy', dt);
      if (r.hp <= 0) { this.emit('defeat'); this.beginReturn(false, 'defeat'); }
    } else if (r.phase === 'capture' && r.phaseTime >= 1.65) {
      if (r.enemyIndex >= 1) this.beginReturn(true);
      else { r.enemyIndex++; r.phase = 'travel'; r.phaseTime = 0; r.enemy = null; }
    } else if (r.phase === 'return') {
      r.worldX = Math.max(0, r.returnStartX * (1 - r.phaseTime / 4));
      if (r.phaseTime >= 4) this.settle();
    }
  }
}
