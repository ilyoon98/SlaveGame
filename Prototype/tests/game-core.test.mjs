import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExpeditionGame,
  createDefaultSave,
  sanitizeSave,
  COMBAT,
} from '../game-core.mjs';

const STEP = 1 / 120;

function advanceUntil(game, predicate, limit = 180) {
  let elapsed = 0;
  while (!predicate(game) && elapsed < limit) {
    game.tick(STEP);
    elapsed += STEP;
  }
  assert.ok(predicate(game), `condition not reached after ${elapsed.toFixed(2)}s; phase=${game.run.phase}`);
  return elapsed;
}

function idleRoster(game) {
  for (const member of game.base.roster) game.setRole(member.id, 'idle');
}

function completeEasy(game = new ExpeditionGame()) {
  idleRoster(game);
  assert.equal(game.dispatch('easy'), true);
  const duration = advanceUntil(game, g => g.run.phase === 'result');
  return { game, duration };
}

test('출정부터 이동·전투·포획·귀환·정산까지 첫 원정을 완료한다', () => {
  const game = new ExpeditionGame();
  idleRoster(game);
  const phases = new Set([game.run.phase]);
  const initialGold = game.base.gold;
  const initialCaptured = game.base.totalCaptured;
  assert.equal(game.dispatch('easy'), true);
  advanceUntil(game, g => {
    phases.add(g.run.phase);
    return g.run.phase === 'result';
  });
  for (const phase of ['camp', 'travel', 'battle', 'capture', 'return', 'result']) {
    assert.ok(phases.has(phase), `missing player-visible phase: ${phase}`);
  }
  assert.ok(game.base.totalCaptured > initialCaptured);
  assert.ok(game.base.gold > initialGold);
  assert.ok(game.base.completed > 0);
  assert.equal(game.run.settled, true);
  assert.equal(game.returnToCamp(), true);
  assert.equal(game.run.phase, 'camp');
});

test('공격 준비 중에는 피해가 없고 타격 시점에만 한 번 적용한다', () => {
  const game = new ExpeditionGame();
  idleRoster(game);
  game.dispatch('easy');
  advanceUntil(game, g => g.run.phase === 'battle' && g.run.heroAttack);
  const enemyHP = game.run.enemy.hp;
  const untilHit = COMBAT.heroHitTime - game.run.heroAttack.elapsed;
  assert.ok(untilHit > 0, 'test must observe the attack before its contact time');
  game.tick(Math.max(0, untilHit - 0.01));
  assert.equal(game.run.enemy.hp, enemyHP);
  game.tick(0.02);
  const afterHit = game.run.enemy.hp;
  assert.ok(afterHit < enemyHP);
  game.tick(0.1);
  assert.equal(game.run.enemy.hp, afterHit, 'one swing must not damage on every render tick');
});

test('진행 중 출정 중복 입력은 현재 원정과 보상을 바꾸지 않는다', () => {
  const game = new ExpeditionGame();
  game.dispatch('easy');
  game.tick(0.5);
  const runBefore = JSON.stringify(game.run);
  const goldBefore = game.base.gold;
  assert.equal(game.dispatch('hard'), false);
  assert.equal(JSON.stringify(game.run), runBefore);
  assert.equal(game.base.gold, goldBefore);
});

test('포획과 골드는 귀환 전에는 보관함에 지급되지 않으며 정산은 한 번뿐이다', () => {
  const game = new ExpeditionGame();
  idleRoster(game);
  const initial = game.getSave();
  game.dispatch('easy');
  advanceUntil(game, g => g.run.pendingCaptures.length > 0);
  assert.equal(game.base.gold, initial.gold);
  assert.equal(game.base.roster.length, initial.roster.length);
  assert.equal(game.base.totalCaptured, initial.totalCaptured);
  advanceUntil(game, g => g.run.phase === 'result');
  const settled = game.getSave();
  for (let i = 0; i < 240; i++) game.tick(0.1);
  assert.equal(game.base.gold, settled.gold);
  assert.equal(game.base.roster.length, settled.roster.length);
  assert.equal(game.base.totalCaptured, settled.totalCaptured);
  game.returnToCamp();
  assert.equal(game.returnToCamp(), false);
  assert.equal(game.base.gold, settled.gold);
  assert.equal(game.base.totalCaptured, settled.totalCaptured);
});

test('일시정지는 원정 시간·전투·생산을 함께 멈춘다', () => {
  const { game } = completeEasy();
  game.returnToCamp();
  const member = game.base.roster[0];
  assert.ok(member);
  game.setRole(member.id, 'labor');
  game.dispatch('easy');
  game.setPaused(true);
  const baseBefore = JSON.stringify(game.base);
  const runBefore = JSON.stringify(game.run);
  game.tick(5);
  assert.equal(JSON.stringify(game.base), baseBefore);
  assert.equal(JSON.stringify(game.run), runBefore);
  game.setPaused(false);
  game.tick(0.1);
  assert.ok(game.run.time > JSON.parse(runBefore).time);
});

test('포획 인원을 노동에 배치하면 수입이 생기고 원정 편성 인원은 노동하지 않는다', () => {
  const { game } = completeEasy();
  game.returnToCamp();
  idleRoster(game);
  const member = game.base.roster[0];
  const idleGold = game.base.gold;
  for (let i = 0; i < 50; i++) game.tick(0.1);
  assert.equal(game.base.gold, idleGold);
  assert.equal(game.setRole(member.id, 'labor'), true);
  for (let i = 0; i < 50; i++) game.tick(0.1);
  assert.ok(game.base.gold > idleGold);
  assert.equal(game.setRole(member.id, 'party'), true);
  const partyGold = game.base.gold;
  assert.equal(game.dispatch('easy'), true);
  assert.equal(game.setRole(member.id, 'labor'), false);
  for (let i = 0; i < 10; i++) game.tick(0.1);
  assert.equal(game.base.gold, partyGold);
});

test('포획 후 철수하면 미정산 포획·전리품을 잃고 기본 인원은 유지한다', () => {
  const game = new ExpeditionGame();
  idleRoster(game);
  const initial = game.getSave();
  game.dispatch('easy');
  advanceUntil(game, g => g.run.pendingCaptures.length > 0);
  assert.equal(game.retreat(), true);
  advanceUntil(game, g => g.run.phase === 'result');
  assert.equal(game.base.gold, initial.gold);
  assert.equal(game.base.roster.length, initial.roster.length);
  assert.equal(game.base.totalCaptured, initial.totalCaptured);
  game.returnToCamp();
  assert.equal(game.dispatch('easy'), true, 'retreat must not leave a deadlocked campaign');
});

test('전투에서 패배해도 골드 없이 초급 원정에 다시 도전할 수 있다', () => {
  const game = new ExpeditionGame({ ...createDefaultSave(), gold: 0 });
  assert.equal(game.dispatch('hard'), true);
  advanceUntil(game, g => g.run.phase === 'result');
  assert.equal(game.run.result.success, false);
  assert.equal(game.run.result.reason, 'defeat');
  assert.equal(game.run.hp, 0);
  assert.equal(game.base.gold, 0);
  assert.equal(game.base.totalCaptured, 0);
  assert.equal(game.returnToCamp(), true);
  assert.equal(game.dispatch('easy'), true);
  assert.equal(game.run.hp, game.run.maxHp);
  advanceUntil(game, g => g.run.phase === 'result');
  assert.equal(game.run.result.success, true);
  assert.ok(game.base.gold > 0);
});

test('수용 한도를 넘는 인원이 생기지 않는다', () => {
  const { game } = completeEasy();
  game.returnToCamp();
  for (let attempts = 0; game.base.roster.length < game.base.capacity && attempts < 20; attempts++) {
    completeEasy(game);
    game.returnToCamp();
  }
  assert.equal(game.base.roster.length, game.base.capacity, 'repeat victories must exercise a full camp');
  const capacity = game.base.capacity;
  // Either prevent departure or complete it with a visibly bounded capture result.
  if (game.dispatch('easy')) {
    advanceUntil(game, g => g.run.phase === 'result');
  }
  assert.ok(game.base.roster.length <= capacity);
  game.returnToCamp();
  const beforeExpansion = game.base.gold;
  assert.equal(game.expandCapacity(), true);
  assert.ok(game.base.capacity > capacity);
  assert.ok(game.base.gold < beforeExpansion);
  completeEasy(game);
  assert.ok(game.base.roster.length > capacity, 'expanded spaces must accept new captures');
  assert.equal(new Set(game.base.roster.map(m => m.id)).size, game.base.roster.length);
});

test('훈련은 골드를 소비해 전투력을 올리고 부족한 골드로는 상태를 바꾸지 않는다', () => {
  const poor = new ExpeditionGame({ ...createDefaultSave(), gold: 0 });
  const before = poor.getSave();
  assert.equal(poor.trainHero(), false);
  assert.deepEqual(poor.getSave(), before);
  const game = new ExpeditionGame({ ...createDefaultSave(), gold: 1000 });
  const initialLevel = game.base.heroLevel;
  const initialGold = game.base.gold;
  const attack = game.heroStats().attack;
  const cost = game.trainingCost();
  assert.equal(game.trainHero(), true);
  assert.equal(game.base.gold, initialGold - cost);
  assert.equal(game.base.heroLevel, initialLevel + 1);
  assert.ok(game.heroStats().attack > attack);
  game.dispatch('easy');
  const duringRun = game.getSave();
  assert.equal(game.trainHero(), false);
  assert.deepEqual(game.getSave(), duringRun);
});

test('초급 보상으로 훈련하고 포획 인원을 편성하면 이전에 패배한 중급 원정을 돌파한다', () => {
  const untrained = new ExpeditionGame();
  untrained.dispatch('mid');
  advanceUntil(untrained, g => g.run.phase === 'result');
  assert.equal(untrained.run.result.success, false);
  const { game } = completeEasy();
  game.returnToCamp();
  assert.equal(game.trainHero(), true);
  for (const member of game.base.roster) assert.equal(game.setRole(member.id, 'party'), true);
  assert.equal(game.dispatch('mid'), true);
  advanceUntil(game, g => g.run.phase === 'result');
  assert.equal(game.run.result.success, true);
  assert.ok(game.run.result.captured > 0);
});

test('원정 중 저장·새로고침은 미정산 보상을 지급하지 않고 거점으로 복귀한다', () => {
  const game = new ExpeditionGame();
  idleRoster(game);
  const initial = game.getSave();
  game.dispatch('easy');
  advanceUntil(game, g => g.run.pendingCaptures.length > 0);
  const saved = JSON.parse(JSON.stringify(game.getSave()));
  const resumed = new ExpeditionGame(saved);
  assert.equal(resumed.run.phase, 'camp');
  assert.equal(resumed.base.gold, initial.gold);
  assert.equal(resumed.base.totalCaptured, initial.totalCaptured);
  assert.equal(resumed.base.roster.length, initial.roster.length);
  assert.equal(resumed.run.pendingCaptures.length, 0);
  assert.equal(resumed.dispatch('easy'), true);
});

test('저장 스냅샷을 바꿔도 살아 있는 게임 상태는 바뀌지 않는다', () => {
  const { game } = completeEasy();
  const snapshot = game.getSave();
  const name = game.base.roster[0].name;
  snapshot.roster[0].name = '외부에서 바꾼 이름';
  snapshot.gold = -100;
  assert.equal(game.base.roster[0].name, name);
  assert.ok(game.base.gold >= 0);
});

test('손상된 저장값은 유효한 게임 시작 상태로 복구한다', () => {
  for (const input of [null, 'bad json', { ...createDefaultSave(), gold: -100, heroLevel: NaN, capacity: -1, roster: [] }]) {
    const saved = sanitizeSave(input);
    const game = new ExpeditionGame(saved);
    assert.ok(Number.isFinite(game.base.gold) && game.base.gold >= 0);
    assert.ok(Number.isInteger(game.base.heroLevel) && game.base.heroLevel >= 1);
    assert.ok(Number.isInteger(game.base.capacity) && game.base.capacity >= game.base.roster.length);
    assert.equal(game.run.phase, 'camp');
  }
});

test('2배속은 같은 입력 시간 동안 원정 시계를 두 배 진행한다', () => {
  const normal = new ExpeditionGame();
  const fast = new ExpeditionGame();
  normal.dispatch('easy');
  fast.dispatch('easy');
  fast.setSpeed(2);
  for (let i = 0; i < 60; i++) {
    normal.tick(STEP);
    fast.tick(STEP);
  }
  assert.ok(Math.abs(fast.run.time - normal.run.time * 2) < 1e-8);
});
