import test from 'node:test';
import assert from 'node:assert/strict';
import { ManagementGame, createDefaultSave, sanitizeSave, JOBS, CREW } from '../management-core.mjs';

const STEP = 0.05;
const member = (game, id) => game.state.roster.find(person => person.id === id);
const ok = result => assert.equal(result.ok, true, result.message);
const rejected = result => assert.equal(result.ok, false, result.message);

function advance(game, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += STEP) {
    game.tick(Math.min(STEP, seconds - elapsed));
  }
}

function until(game, predicate, limit = 90) {
  let elapsed = 0;
  while (!predicate(game) && elapsed < limit) {
    game.tick(STEP);
    elapsed += STEP;
  }
  assert.ok(predicate(game), `condition not reached after ${elapsed.toFixed(2)} simulated seconds`);
  return elapsed;
}

function completeJob(game, id, type) {
  ok(game.startJob(id, type));
  return until(game, current => !member(current, id).job);
}

test('육성 인원과 원정 전담 주인공 일행은 별도 명단이다', () => {
  const game = new ManagementGame();
  assert.equal(game.state.roster.length, 2);
  assert.equal(game.state.gold, 120);
  assert.equal(CREW.length, 3);
  const crewIds = new Set(CREW.map(person => person.id));
  assert.equal(crewIds.size, CREW.length);
  for (const person of game.state.roster) {
    assert.equal(crewIds.has(person.id), false);
    assert.equal(person.job, null);
    assert.ok(person.aptitude.martial > 0 && person.aptitude.performance > 0);
  }
  for (const person of CREW) {
    rejected(game.sell(person.id));
    rejected(game.startJob(person.id, 'martial'));
  }
  assert.equal(game.state.roster.length, 2);
});

test('교육 자격 조회는 상태를 바꾸지 않으며 실제 교육은 비용과 시간을 소비해 가치가 오른다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[0].id;
  const before = game.getSave();
  ok(game.canStartJob(id, 'martial'));
  assert.deepEqual(game.getSave(), before);
  const value = game.salePrice(id);
  ok(game.startJob(id, 'martial'));
  assert.equal(game.state.gold, before.gold - 8);
  assert.equal(member(game, id).condition, before.roster[0].condition - 10);
  advance(game, 9);
  assert.equal(member(game, id).martial, before.roster[0].martial);
  assert.ok(member(game, id).job);
  until(game, current => !member(current, id).job);
  assert.ok(member(game, id).martial > before.roster[0].martial);
  assert.ok(game.salePrice(id) > value);
  assert.equal(game.state.stats.trained, 1);
  const completed = game.getSave();
  advance(game, 30);
  assert.equal(member(game, id).martial, completed.roster[0].martial);
  assert.equal(game.state.stats.trained, 1);
  assert.equal(game.state.gold, completed.gold);
});

test('한 인원의 중복 일정과 교육실 정원 초과는 추가 비용 없이 거부한다', () => {
  const game = new ManagementGame();
  const [first, second] = game.state.roster.map(person => person.id);
  ok(game.startJob(first, 'martial'));
  const gold = game.state.gold;
  rejected(game.startJob(first, 'performance'));
  rejected(game.startJob(first, 'rest'));
  rejected(game.startJob(second, 'performance'));
  assert.equal(game.state.gold, gold);
  ok(game.startJob(second, 'show'));
  until(game, current => current.state.roster.every(person => !person.job));
  ok(game.startJob(second, 'performance'));
});

test('일정을 취소하면 이미 사용한 비용과 컨디션은 환불되지 않고 완료 보상도 없다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[0].id;
  const skill = member(game, id).martial;
  ok(game.startJob(id, 'martial'));
  advance(game, 3);
  const gold = game.state.gold;
  const condition = member(game, id).condition;
  ok(game.cancelJob(id));
  rejected(game.cancelJob(id));
  advance(game, 20);
  assert.equal(game.state.gold, gold);
  assert.equal(member(game, id).condition, condition);
  assert.equal(member(game, id).martial, skill);
  assert.equal(game.state.stats.trained, 0);
});

test('컨디션이 낮으면 교육과 활동을 막고 무료 휴식으로 다시 활동할 수 있다', () => {
  const saved = createDefaultSave();
  saved.roster[0].condition = 0;
  saved.gold = 0;
  const game = new ManagementGame(saved);
  const id = game.state.roster[0].id;
  rejected(game.startJob(id, 'martial'));
  rejected(game.startJob(id, 'arena'));
  completeJob(game, id, 'rest');
  assert.equal(member(game, id).condition, 40);
  assert.equal(game.state.gold, 0);
  ok(game.startJob(id, 'arena'));
  assert.equal(member(game, id).condition, 20);
  until(game, current => !member(current, id).job);
  assert.ok(game.state.gold > 0, 'zero funds must not deadlock the management loop');
  completeJob(game, id, 'rest');
  completeJob(game, id, 'rest');
  assert.equal(member(game, id).condition, 100);
});

test('숙련도가 부족하면 경기와 공연을 시작하지 못한다', () => {
  const saved = createDefaultSave();
  saved.roster[0].martial = 0;
  saved.roster[0].performance = 0;
  const game = new ManagementGame(saved);
  const id = game.state.roster[0].id;
  const before = game.getSave();
  rejected(game.startJob(id, 'arena'));
  rejected(game.startJob(id, 'show'));
  assert.deepEqual(game.getSave(), before);
  completeJob(game, id, 'performance');
  ok(game.canStartJob(id, 'show'));
});

test('무예 교육 뒤 경기를 완료하면 실제 수입과 경기 실적이 한 번 증가한다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[0].id;
  completeJob(game, id, 'martial');
  const before = game.getSave();
  ok(game.startJob(id, 'arena'));
  advance(game, 11);
  assert.equal(game.state.gold, before.gold);
  assert.equal(member(game, id).wins, before.roster[0].wins);
  until(game, current => !member(current, id).job);
  assert.ok(game.state.gold > before.gold);
  assert.equal(member(game, id).wins, before.roster[0].wins + 1);
  assert.equal(game.state.stats.arenaWins, 1);
  const settled = game.state.gold;
  advance(game, 30);
  assert.equal(game.state.gold, settled);
  assert.equal(game.state.stats.arenaWins, 1);
});

test('예능 교육 뒤 공연을 완료하면 실제 수입과 공연 실적이 한 번 증가한다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[1].id;
  completeJob(game, id, 'performance');
  const beforeGold = game.state.gold;
  const beforeShows = member(game, id).shows;
  completeJob(game, id, 'show');
  assert.ok(game.state.gold > beforeGold);
  assert.equal(member(game, id).shows, beforeShows + 1);
  assert.equal(game.state.stats.performances, 1);
  const settled = game.state.gold;
  advance(game, 30);
  assert.equal(game.state.gold, settled);
  assert.equal(game.state.stats.performances, 1);
});

test('경기장과 공연장은 각 한 명만 사용하며 서로 다른 시설은 동시에 운영된다', () => {
  const saved = createDefaultSave();
  for (const person of saved.roster) { person.martial = 5; person.performance = 5; }
  const game = new ManagementGame(saved);
  const [first, second] = game.state.roster.map(person => person.id);
  ok(game.startJob(first, 'arena'));
  rejected(game.startJob(second, 'arena'));
  ok(game.startJob(second, 'show'));
  until(game, current => current.state.roster.every(person => !person.job));
  assert.equal(game.state.stats.arenaWins, 1);
  assert.equal(game.state.stats.performances, 1);
  ok(game.startJob(first, 'show'));
  rejected(game.startJob(second, 'show'));
});

test('활동 중 판매와 오래된 판매 견적을 거부하고 실제 판매는 한 번만 정산한다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[0].id;
  const initialQuote = game.salePrice(id);
  ok(game.startJob(id, 'martial'));
  rejected(game.sell(id, initialQuote));
  until(game, current => !member(current, id).job);
  const quote = game.salePrice(id);
  assert.ok(quote > initialQuote);
  rejected(game.sell(id, initialQuote));
  const gold = game.state.gold;
  const count = game.state.roster.length;
  const result = game.sell(id, quote);
  ok(result);
  assert.equal(result.value, quote);
  assert.equal(game.state.gold, gold + quote);
  assert.equal(game.state.roster.length, count - 1);
  assert.equal(member(game, id), undefined);
  assert.equal(game.state.stats.sold, 1);
  rejected(game.sell(id, quote));
  assert.equal(game.state.gold, gold + quote);
});

test('주인공 일행만 원정을 떠나며 거점 교육을 병행하고 귀환은 한 명만 추가한다', () => {
  const game = new ManagementGame();
  const id = game.state.roster[0].id;
  const initialCount = game.state.roster.length;
  ok(game.startJob(id, 'martial'));
  ok(game.dispatch());
  const trip = JSON.parse(JSON.stringify(game.state.expedition));
  assert.deepEqual(new Set(trip.crewIds), new Set(CREW.map(person => person.id)));
  assert.equal(trip.crewIds.some(crewId => game.state.roster.some(person => person.id === crewId)), false);
  rejected(game.dispatch());
  assert.deepEqual(game.state.expedition, trip);
  advance(game, 11);
  assert.equal(member(game, id).job, null);
  assert.equal(game.state.stats.trained, 1);
  assert.ok(game.state.expedition);
  assert.equal(game.state.roster.length, initialCount);
  until(game, current => !current.state.expedition);
  assert.equal(game.state.roster.length, initialCount + 1);
  assert.equal(game.state.stats.captured, 1);
  const settled = game.getSave();
  advance(game, 30);
  assert.equal(game.state.roster.length, settled.roster.length);
  assert.equal(game.state.stats.captured, 1);
});

test('가득 찬 숙소에는 출정하지 않고 한 자리를 확보하면 정원까지 정확히 귀환한다', () => {
  const game = new ManagementGame();
  while (game.state.roster.length < game.state.capacity) {
    ok(game.dispatch());
    until(game, current => !current.state.expedition);
  }
  rejected(game.dispatch());
  assert.equal(game.state.expedition, null);
  const soldId = game.state.roster[0].id;
  ok(game.sell(soldId, game.salePrice(soldId)));
  ok(game.dispatch());
  rejected(game.dispatch());
  until(game, current => !current.state.expedition);
  assert.equal(game.state.roster.length, game.state.capacity);
  assert.equal(new Set(game.state.roster.map(person => person.id)).size, game.state.roster.length);
});

test('교육실과 숙소 확장은 비용을 소비하고 동시 교육 및 정원 한도를 실제로 바꾼다', () => {
  const saved = createDefaultSave();
  saved.gold = 5000;
  const game = new ManagementGame(saved);
  const beforeGold = game.state.gold;
  const beforeCapacity = game.state.capacity;
  ok(game.expandTraining());
  assert.equal(game.state.trainingSlots, 2);
  assert.equal(game.state.gold, beforeGold - 90);
  ok(game.startJob(game.state.roster[0].id, 'martial'));
  ok(game.startJob(game.state.roster[1].id, 'performance'));
  const expansionGold = game.state.gold;
  ok(game.expandCapacity());
  assert.equal(game.state.capacity, beforeCapacity + 2);
  assert.equal(game.state.gold, expansionGold - 70);
  until(game, current => current.state.roster.every(person => !person.job));
  assert.equal(game.state.stats.trained, 2);
  while (game.state.trainingSlots < 3) ok(game.expandTraining());
  const maxSlotsGold = game.state.gold;
  rejected(game.expandTraining());
  assert.equal(game.state.gold, maxSlotsGold);
  while (game.state.capacity < 14) ok(game.expandCapacity());
  const maxCapacityGold = game.state.gold;
  rejected(game.expandCapacity());
  assert.equal(game.state.gold, maxCapacityGold);
});

test('돈이 부족하면 유료 교육과 시설 확장을 추가 차감 없이 거부한다', () => {
  const saved = createDefaultSave();
  saved.gold = 0;
  const game = new ManagementGame(saved);
  rejected(game.startJob(game.state.roster[0].id, 'martial'));
  rejected(game.expandCapacity());
  rejected(game.expandTraining());
  assert.equal(game.state.gold, 0);
  ok(game.dispatch());
  until(game, current => !current.state.expedition);
  const newId = game.state.roster.at(-1).id;
  ok(game.sell(newId, game.salePrice(newId)));
  assert.ok(game.state.gold >= 8);
  ok(game.startJob(game.state.roster[0].id, 'martial'));
});

test('중간 저장은 교육과 원정의 남은 진행을 복원하고 완료 보상을 중복 지급하지 않는다', () => {
  const original = new ManagementGame();
  const id = original.state.roster[0].id;
  const originalSkill = member(original, id).martial;
  ok(original.startJob(id, 'martial'));
  ok(original.dispatch());
  advance(original, 4);
  const checkpoint = original.getSave();
  const resumed = new ManagementGame(checkpoint);
  assert.equal(resumed.state.gold, checkpoint.gold, 'restoring must not charge education again');
  assert.equal(member(resumed, id).job.elapsed, checkpoint.roster[0].job.elapsed);
  assert.equal(resumed.state.expedition.elapsed, checkpoint.expedition.elapsed);
  assert.equal(member(resumed, id).martial, originalSkill, 'loading does not grant offline completion');
  until(resumed, current => !member(current, id).job && !current.state.expedition);
  assert.equal(resumed.state.stats.trained, 1);
  assert.equal(resumed.state.stats.captured, 1);
  assert.equal(resumed.state.roster.length, checkpoint.roster.length + 1);
  const completed = resumed.getSave();
  const secondReload = new ManagementGame(completed);
  advance(secondReload, 30);
  assert.equal(secondReload.state.stats.trained, 1);
  assert.equal(secondReload.state.stats.captured, 1);
  assert.equal(secondReload.state.roster.length, completed.roster.length);
  assert.equal(secondReload.state.gold, completed.gold);
});

test('저장 스냅샷과 복원 입력을 외부에서 바꿔도 현재 게임 상태는 독립적이다', () => {
  const original = new ManagementGame();
  const saved = original.getSave();
  const resumed = new ManagementGame(saved);
  saved.gold = 999999;
  saved.roster[0].name = '외부 변경';
  saved.roster[0].aptitude.martial = 999;
  assert.equal(original.state.gold, 120);
  assert.equal(resumed.state.gold, 120);
  assert.notEqual(original.state.roster[0].name, '외부 변경');
  assert.notEqual(resumed.state.roster[0].name, '외부 변경');
  assert.notEqual(resumed.state.roster[0].aptitude.martial, 999);
});

test('일시정지는 교육과 원정 모두 멈추고 2배속은 같은 입력 시간에 두 배 진행한다', () => {
  const normal = new ManagementGame();
  const fast = new ManagementGame();
  for (const game of [normal, fast]) {
    ok(game.startJob(game.state.roster[0].id, 'martial'));
    ok(game.dispatch());
  }
  normal.setPaused(true);
  const paused = normal.getSave();
  advance(normal, 3);
  assert.deepEqual(normal.getSave(), paused);
  normal.setPaused(false);
  fast.setSpeed(2);
  advance(normal, 2);
  advance(fast, 2);
  assert.ok(Math.abs(fast.state.roster[0].job.elapsed - normal.state.roster[0].job.elapsed * 2) < 1e-6);
  assert.ok(Math.abs(fast.state.expedition.elapsed - normal.state.expedition.elapsed * 2) < 1e-6);
});

test('알 수 없는 행동과 잘못된 시간 입력으로 상태가 손상되지 않는다', () => {
  const game = new ManagementGame();
  const before = game.getSave();
  rejected(game.startJob(game.state.roster[0].id, 'unknown'));
  rejected(game.startJob(game.state.roster[0].id, '__proto__'));
  rejected(game.startJob(game.state.roster[0].id, 'constructor'));
  rejected(game.startJob(-1, 'rest'));
  rejected(game.cancelJob(-1));
  rejected(game.sell(-1));
  for (const dt of [-1, NaN, Infinity, undefined, '1']) game.tick(dt);
  assert.deepEqual(game.getSave(), before);
});

test('손상된 저장값의 중복 인원·범위 밖 수치·알 수 없는 일정은 정상 범위로 정리된다', () => {
  assert.equal(sanitizeSave(null).version, 2);
  assert.equal(sanitizeSave({ version: 1, gold: 999 }).gold, 120);
  const saved = createDefaultSave();
  saved.gold = -50;
  saved.capacity = 500;
  saved.trainingSlots = 50;
  saved.roster[0].martial = Infinity;
  saved.roster[0].performance = -1;
  saved.roster[0].condition = 999;
  saved.roster[0].aptitude.martial = NaN;
  saved.roster[0].job = { type: 'money-printer', duration: 0, elapsed: 999 };
  saved.roster.push({ ...saved.roster[0] });
  const clean = sanitizeSave(saved);
  assert.ok(Number.isFinite(clean.gold) && clean.gold >= 0);
  assert.ok(clean.capacity >= clean.roster.length && clean.capacity <= 14);
  assert.ok(clean.trainingSlots >= 1 && clean.trainingSlots <= 3);
  assert.equal(new Set(clean.roster.map(person => person.id)).size, clean.roster.length);
  for (const person of clean.roster) {
    for (const value of [person.martial, person.performance, person.condition]) assert.ok(Number.isFinite(value) && value >= 0 && value <= 100);
    assert.ok(Number.isFinite(person.aptitude.martial));
    assert.ok(!person.job || Object.hasOwn(JOBS, person.job.type));
  }
});

test('복원한 일정은 시설 정원을 지키고 원정 명단은 주인공 일행으로 정규화된다', () => {
  const saved = createDefaultSave();
  for (const person of saved.roster) {
    person.job = { type: 'martial', elapsed: 2, duration: 999, cost: 0 };
  }
  saved.expedition = { elapsed: 2, duration: 1, crewIds: saved.roster.map(person => person.id) };
  const game = new ManagementGame(saved);
  assert.equal(game.state.roster.filter(person => person.job).length, game.state.trainingSlots);
  assert.equal(game.state.roster.find(person => person.job).job.duration, JOBS.martial.duration);
  assert.deepEqual(game.state.expedition.crewIds, CREW.map(person => person.id));
  assert.equal(game.state.expedition.duration, 18);
  until(game, current => !current.state.expedition && current.state.roster.every(person => !person.job));
  assert.equal(game.state.stats.trained, 1);
  assert.equal(game.state.stats.captured, 1);

  const alreadyFinished = createDefaultSave();
  alreadyFinished.roster[0].job = { type: 'arena', elapsed: 12, duration: 12 };
  alreadyFinished.expedition = { elapsed: 18, duration: 18 };
  const noClaim = new ManagementGame(alreadyFinished);
  advance(noClaim, 30);
  assert.equal(noClaim.state.stats.arenaWins, 0);
  assert.equal(noClaim.state.stats.captured, 0);
  assert.equal(noClaim.state.gold, 120);
});
