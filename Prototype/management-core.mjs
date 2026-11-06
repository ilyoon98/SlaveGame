// Deterministic management rules shared by the browser and the Node test runner.
// Crew members never belong to the captive roster; expeditions cannot use trainees.
export const CREW = Object.freeze([
  Object.freeze({ id: 'crew-grik', name: '그릭', role: '고블린 두목' }),
  Object.freeze({ id: 'crew-boru', name: '보루', role: '고블린 척후병' }),
  Object.freeze({ id: 'crew-nok', name: '녹', role: '고블린 짐꾼' }),
]);

export const JOBS = Object.freeze({
  martial: Object.freeze({ id: 'martial', label: '무예 교육', kind: 'training', cost: 8, duration: 10, conditionCost: 10, minCondition: 15, skill: 'martial', description: '적성에 따라 무예 숙련도가 오릅니다.' }),
  performance: Object.freeze({ id: 'performance', label: '예능 교육', kind: 'training', cost: 8, duration: 10, conditionCost: 10, minCondition: 15, skill: 'performance', description: '적성에 따라 예능 숙련도가 오릅니다.' }),
  rest: Object.freeze({ id: 'rest', label: '숙소 휴식', kind: 'rest', cost: 0, duration: 8, conditionCost: 0, minCondition: 0, description: '컨디션을 40 회복합니다.' }),
  arena: Object.freeze({ id: 'arena', label: '초급 경기', kind: 'activity', cost: 0, duration: 12, conditionCost: 20, minCondition: 25, skill: 'martial', minSkill: 3, description: '무예와 경기 실적에 따라 상금을 받습니다.' }),
  show: Object.freeze({ id: 'show', label: '천막 공연', kind: 'activity', cost: 0, duration: 12, conditionCost: 18, minCondition: 25, skill: 'performance', minSkill: 3, description: '예능과 공연 실적에 따라 흥행 수입을 얻습니다.' }),
});

const MAX_GOLD = 1e7;
const MAX_CAPACITY = 14;
const MAX_TRAINING = 3;
const EXPEDITION_DURATION = 18;
const CAPTURE_NAMES = ['로웬', '시온', '리안', '노아', '카이', '벨', '루엔', '미라'];
const clone = value => JSON.parse(JSON.stringify(value));
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, fallback, lo = 0, hi = 100) => Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback;
const integer = (value, fallback, lo = 0, hi = 100) => Math.floor(bounded(value, fallback, lo, hi));
const cleanText = (value, fallback, max = 30) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const success = (message, extra = {}) => ({ ok: true, message, ...extra });
const failure = message => ({ ok: false, message });

function makeMember(id, name, martial, performance, aptitude, origin = '숲길에서 확보', color = 0) {
  return { id, name, origin, aptitude: { ...aptitude }, martial, performance, condition: 100, wins: 0, shows: 0, job: null, color };
}

export function createDefaultSave() {
  return {
    version: 2, gold: 120, capacity: 6, trainingSlots: 1, nextId: 3, time: 0,
    roster: [
      makeMember(1, '루카', 3, 1, { martial: 1.4, performance: 1 }, '무예에 소질이 있는 인간', 0),
      makeMember(2, '에린', 2, 3, { martial: 1, performance: 1.4 }, '예능에 소질이 있는 인간', 1),
    ],
    expedition: null,
    stats: { trained: 0, arenaWins: 0, performances: 0, sold: 0, captured: 0 },
  };
}

function sanitizeJob(raw) {
  if (!record(raw) || !Object.hasOwn(JOBS, raw.type)) return null;
  const spec = JOBS[raw.type];
  // A completed job is not an outstanding reward claim. Valid saves clear it atomically.
  if (!Number.isFinite(raw.elapsed) || raw.elapsed < 0 || raw.elapsed >= spec.duration) return null;
  return { type: raw.type, elapsed: raw.elapsed, duration: spec.duration, cost: spec.cost };
}

export function sanitizeSave(raw) {
  const clean = createDefaultSave();
  if (!record(raw) || raw.version !== 2) return clean;
  clean.gold = bounded(raw.gold, 120, 0, MAX_GOLD);
  clean.capacity = integer(raw.capacity, 6, 2, MAX_CAPACITY);
  clean.trainingSlots = integer(raw.trainingSlots, 1, 1, MAX_TRAINING);
  clean.time = bounded(raw.time, 0, 0, 1e10);
  const seen = new Set();
  clean.roster = (Array.isArray(raw.roster) ? raw.roster : clean.roster)
    .filter(m => record(m) && Number.isSafeInteger(m.id) && m.id > 0 && m.id < 1e9 && !seen.has(m.id) && (seen.add(m.id) || true))
    .slice(0, clean.capacity)
    .map(m => ({
      id: m.id, name: cleanText(m.name, '모험가', 16), origin: cleanText(m.origin, '거점에서 생활 중'),
      aptitude: { martial: bounded(m.aptitude?.martial, 1, .8, 1.5), performance: bounded(m.aptitude?.performance, 1, .8, 1.5) },
      martial: integer(m.martial, 1), performance: integer(m.performance, 1), condition: bounded(m.condition, 100),
      wins: integer(m.wins, 0), shows: integer(m.shows, 0), color: integer(m.color, 0, 0, 7), job: sanitizeJob(m.job),
    }));
  let trainingUsed = 0, arenaUsed = 0, showUsed = 0;
  for (const m of clean.roster) {
    if (!m.job) continue;
    if (JOBS[m.job.type].kind === 'training' && ++trainingUsed > clean.trainingSlots) m.job = null;
    else if (m.job.type === 'arena' && ++arenaUsed > 1) m.job = null;
    else if (m.job.type === 'show' && ++showUsed > 1) m.job = null;
  }
  clean.nextId = Math.max(integer(raw.nextId, 1, 1, 1e9), 1, ...clean.roster.map(m => m.id + 1));
  for (const key of Object.keys(clean.stats)) clean.stats[key] = integer(raw.stats?.[key], 0, 0, 1e7);
  const e = raw.expedition;
  if (record(e) && Number.isFinite(e.elapsed) && e.elapsed >= 0 && e.elapsed < EXPEDITION_DURATION && clean.roster.length < clean.capacity) {
    clean.expedition = { elapsed: e.elapsed, duration: EXPEDITION_DURATION, crewIds: CREW.map(m => m.id) };
  }
  return clean;
}

export class ManagementGame {
  constructor(saved) {
    this.state = sanitizeSave(saved);
    this.paused = false;
    this.speed = 1;
    this.events = [];
    this.eventId = 0;
  }
  getSave() { return clone(this.state); }
  member(id) { return this.state.roster.find(m => m.id === id); }
  emit(type, text, extra = {}) {
    const event = { id: ++this.eventId, type, text, time: this.state.time, ...extra };
    this.events.push(event);
    if (this.events.length > 100) this.events.shift();
    return event;
  }
  setPaused(value) { this.paused = Boolean(value); }
  setSpeed(value) { this.speed = value === 2 ? 2 : 1; }
  capacityCost() { return 70 + Math.max(0, this.state.capacity - 6) * 12; }
  trainingCost() { return 90 + (this.state.trainingSlots - 1) * 60; }
  trainingUsed() { return this.state.roster.filter(m => m.job && JOBS[m.job.type].kind === 'training').length; }
  trainingGain(id, type) {
    const m = this.member(id);
    if (!m || !['martial', 'performance'].includes(type)) return 0;
    return Math.min(100 - m[type], Math.round(3 * m.aptitude[type]));
  }
  activityReward(id, type) {
    const m = this.member(id);
    if (!m) return 0;
    if (type === 'arena') return 18 + Math.floor(m.martial * 2) + Math.min(m.wins, 10) * 2;
    if (type === 'show') return 16 + Math.floor(m.performance * 2) + Math.min(m.shows, 10) * 2;
    return 0;
  }
  canStartJob(id, type) {
    const m = this.member(id), spec = Object.hasOwn(JOBS, type) ? JOBS[type] : null;
    if (!m) return failure('거점 명단에 없는 인원입니다.');
    if (!spec) return failure('알 수 없는 일정입니다.');
    if (m.job) return failure('현재 일정을 마치거나 중단해 주세요.');
    if (this.state.gold < spec.cost) return failure(`골드가 부족합니다. ${spec.cost} G가 필요합니다.`);
    if (m.condition < spec.minCondition) return failure(`컨디션 ${spec.minCondition} 이상이 필요합니다. 숙소에서 쉬게 해 주세요.`);
    if (type === 'rest' && m.condition >= 100) return failure('컨디션이 이미 충분합니다.');
    if (spec.kind === 'training' && m[type] >= 100) return failure('이 분야의 숙련도가 최대입니다.');
    if (spec.kind === 'training' && this.trainingUsed() >= this.state.trainingSlots) return failure('교육 자리가 가득 찼습니다. 교육을 마치거나 교육실을 확장해 주세요.');
    if (spec.minSkill && m[spec.skill] < spec.minSkill) return failure(`${spec.skill === 'martial' ? '무예' : '예능'} 숙련도 ${spec.minSkill} 이상이 필요합니다.`);
    if (['arena', 'show'].includes(type) && this.state.roster.some(other => other.job?.type === type)) return failure(type === 'arena' ? '경기장이 사용 중입니다.' : '공연장이 사용 중입니다.');
    return success('배치할 수 있습니다.');
  }
  startJob(id, type) {
    const allowed = this.canStartJob(id, type);
    if (!allowed.ok) return allowed;
    const m = this.member(id), spec = JOBS[type];
    this.state.gold -= spec.cost;
    m.condition = Math.max(0, m.condition - spec.conditionCost);
    m.job = { type, elapsed: 0, duration: spec.duration, cost: spec.cost };
    const message = `${m.name} · ${spec.label} 시작`;
    this.emit('job-start', message, { memberId: id, job: type, cost: spec.cost });
    return success(message);
  }
  cancelJob(id) {
    const m = this.member(id);
    if (!m?.job) return failure('진행 중인 일정이 없습니다.');
    const type = m.job.type;
    m.job = null;
    const message = `${m.name} · ${JOBS[type].label} 중단. 이미 사용한 비용과 컨디션은 돌아오지 않습니다.`;
    this.emit('job-cancel', message, { memberId: id, job: type });
    return success(message);
  }
  salePrice(id) {
    const m = this.member(id);
    return m ? 12 + Math.floor((m.martial + m.performance) * 5) + (m.wins + m.shows) * 6 : 0;
  }
  sell(id, expectedPrice) {
    const m = this.member(id);
    if (!m) return failure('이미 판매되었거나 거점 명단에 없는 인원입니다.');
    if (m.job) return failure('진행 중인 일정을 마친 뒤 판매할 수 있습니다.');
    const value = this.salePrice(id);
    if (expectedPrice !== undefined && expectedPrice !== value) return failure('판매 예상가가 바뀌었습니다. 새 가격을 확인해 주세요.');
    this.state.roster = this.state.roster.filter(other => other.id !== id);
    this.state.gold = Math.min(MAX_GOLD, this.state.gold + value);
    this.state.stats.sold++;
    const message = `${m.name} 판매 · +${value} G`;
    this.emit('sale', message, { memberId: id, value });
    return success(message, { value });
  }
  canDispatch() {
    if (this.state.expedition) return failure('주인공 일행이 이미 원정 중입니다.');
    if (this.state.roster.length >= this.state.capacity) return failure('숙소가 가득 찼습니다. 판매하거나 숙소를 확장해 주세요.');
    return success('주인공 일행을 파견할 수 있습니다.');
  }
  dispatch() {
    const allowed = this.canDispatch();
    if (!allowed.ok) return allowed;
    this.state.expedition = { elapsed: 0, duration: EXPEDITION_DURATION, crewIds: CREW.map(m => m.id) };
    const message = '고블린 원정대 파견 · 그릭, 보루, 녹';
    this.emit('dispatch', message, { crewIds: CREW.map(m => m.id) });
    return success(message);
  }
  expandCapacity() {
    if (this.state.capacity >= MAX_CAPACITY) return failure('숙소가 최대 규모입니다.');
    const cost = this.capacityCost();
    if (this.state.gold < cost) return failure(`숙소 확장에 ${cost} G가 필요합니다.`);
    this.state.gold -= cost;
    this.state.capacity = Math.min(MAX_CAPACITY, this.state.capacity + 2);
    const message = `숙소 확장 · 수용 ${this.state.capacity}명`;
    this.emit('capacity', message, { cost, capacity: this.state.capacity });
    return success(message);
  }
  expandTraining() {
    if (this.state.trainingSlots >= MAX_TRAINING) return failure('교육실이 최대 규모입니다.');
    const cost = this.trainingCost();
    if (this.state.gold < cost) return failure(`교육실 확장에 ${cost} G가 필요합니다.`);
    this.state.gold -= cost;
    this.state.trainingSlots++;
    const message = `교육실 확장 · 동시 교육 ${this.state.trainingSlots}명`;
    this.emit('training-expansion', message, { cost, trainingSlots: this.state.trainingSlots });
    return success(message);
  }
  completeJob(m) {
    const type = m.job.type;
    // Clear first: a completion can never be paid twice, including after saving.
    m.job = null;
    let message, extra = { memberId: m.id, job: type };
    if (type === 'martial' || type === 'performance') {
      const gain = this.trainingGain(m.id, type), beforePrice = this.salePrice(m.id);
      m[type] = Math.min(100, m[type] + gain);
      this.state.stats.trained++;
      extra = { ...extra, gain, skill: type, valueGain: this.salePrice(m.id) - beforePrice };
      message = `${m.name} · ${type === 'martial' ? '무예' : '예능'} +${gain} · 판매 가치 +${extra.valueGain} G`;
    } else if (type === 'rest') {
      const gain = Math.min(40, 100 - m.condition);
      m.condition += gain;
      message = `${m.name} · 휴식 완료 · 컨디션 +${gain}`;
      extra = { ...extra, conditionGain: gain };
    } else {
      const reward = this.activityReward(m.id, type);
      this.state.gold = Math.min(MAX_GOLD, this.state.gold + reward);
      if (type === 'arena') { m.wins = Math.min(100, m.wins + 1); this.state.stats.arenaWins++; }
      else { m.shows = Math.min(100, m.shows + 1); this.state.stats.performances++; }
      message = `${m.name} · ${type === 'arena' ? '초급 경기 승리' : '공연 완료'} · +${reward} G`;
      extra = { ...extra, reward };
    }
    this.emit('job-complete', message, extra);
  }
  completeExpedition() {
    this.state.expedition = null;
    if (this.state.roster.length >= this.state.capacity) {
      this.emit('expedition-full', '원정대 귀환 · 수용 공간이 없어 새 인원을 데려오지 못했습니다.');
      return;
    }
    const id = this.state.nextId++, n = this.state.stats.captured;
    const martialGifted = n % 2 === 0;
    const m = makeMember(id, CAPTURE_NAMES[n % CAPTURE_NAMES.length], martialGifted ? 2 : 1, martialGifted ? 1 : 2,
      { martial: martialGifted ? 1.4 : 1, performance: martialGifted ? 1 : 1.4 }, '안개 숲길에서 확보한 인간', n % 8);
    this.state.roster.push(m);
    this.state.stats.captured++;
    this.emit('expedition-complete', `원정대 귀환 · ${m.name} 확보 · ${martialGifted ? '무예' : '예능'} 적성 우수`, { memberId: id });
  }
  tick(seconds) {
    if (this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    const dt = Math.min(seconds, 120) * this.speed;
    this.state.time += dt;
    for (const m of this.state.roster) {
      if (!m.job) continue;
      m.job.elapsed += dt;
      if (m.job.elapsed + 1e-8 >= m.job.duration) this.completeJob(m);
    }
    if (this.state.expedition) {
      this.state.expedition.elapsed += dt;
      if (this.state.expedition.elapsed + 1e-8 >= this.state.expedition.duration) this.completeExpedition();
    }
  }
}
