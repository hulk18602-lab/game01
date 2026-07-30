import assert from "node:assert/strict";
import test from "node:test";
import testMap from "../src/content/maps/mapTest.js";
import type { WaveDefinition } from "../src/game/CampaignSession.js";
import { CampaignSession } from "../src/game/CampaignSession.js";
import { GameStorage, type StorageLike } from "../src/game/persistence/GameStorage.js";
import { CombatEffectPool } from "../src/rendering/CombatEffectPool.js";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const wave = (
  id: string,
  type: string,
  count: number,
  interval = 0,
): WaveDefinition => ({
  id,
  title: id,
  groups: [{ type, count, at: 0, interval }],
});

function session(
  waves: readonly WaveDefinition[],
  storage = new MemoryStorage(),
): CampaignSession {
  return new CampaignSession({
    map: testMap,
    waves,
    storage: new GameStorage(storage),
  });
}

function begin(game: CampaignSession, difficulty: "easy" | "normal" | "hard" = "normal"): void {
  game.newGame(difficulty);
  game.completeTutorial();
}

function cell(game: CampaignSession, x: number, y: number): { x: number; y: number } {
  return game.converter.gridToWorld({ x, y }, { center: true });
}

function runUntil(
  game: CampaignSession,
  predicate: () => boolean,
  maximumSeconds = 60,
): void {
  const step = 1 / 30;
  for (let elapsed = 0; elapsed < maximumSeconds && !predicate(); elapsed += step) {
    game.update(step);
  }
  assert.equal(predicate(), true, `condition was not reached after ${maximumSeconds}s`);
}

test("new game covers difficulty, first-run tutorial, preparation, pause and game speed", () => {
  const game = session([wave("wave-1", "runner", 1)]);
  assert.equal(game.phase, "menu");
  game.openDifficulty();
  assert.equal(game.phase, "difficulty");
  game.newGame("easy");
  assert.equal(game.phase, "tutorial");
  assert.equal(game.getState().lives, 25);
  assert.equal(game.getState().players.get("player")!.balance, 475);
  game.completeTutorial();
  assert.equal(game.phase, "preparing");

  const countdown = game.countdown;
  game.setSpeed(3);
  game.update(1);
  assert.equal(game.countdown, countdown - 3);
  game.togglePause();
  const pausedCountdown = game.countdown;
  game.update(5);
  assert.equal(game.countdown, pausedCountdown);
  game.togglePause();
  assert.equal(game.phase, "preparing");
});

test("the complete first wave waits for every spawn and enemy, then grants exact rewards", () => {
  const waves = [
    wave("wave-1", "runner", 2, 3),
    wave("wave-2", "runner", 1),
  ];
  const game = session(waves);
  begin(game);
  game.selectBuild("sniper");
  game.placeSelectedTower(cell(game, 5, 2));
  const early = game.startWave();
  assert.equal(early, 32);

  runUntil(game, () => game.phase === "preparing" && game.currentWaveNumber === 1, 30);
  assert.equal(game.getState().enemies.length, 0);
  assert.equal(game.enemiesRemaining, 0);
  // 350 - 300 + 32 early + (2 * 14 kills) + 47 completion/flawless.
  assert.equal(game.getState().players.get("player")!.balance, 157);
});

test("enemies reaching the base deal damage and never grant kill rewards", () => {
  const game = session([
    wave("wave-1", "runner", 1),
    wave("wave-2", "runner", 1),
  ]);
  begin(game);
  game.startWave(false);
  runUntil(game, () => game.phase === "preparing" && game.currentWaveNumber === 1, 20);
  assert.equal(game.getState().lives, 19);
  // No early bonus and no kill reward; wave completion is 35 without flawless.
  assert.equal(game.getState().players.get("player")!.balance, 385);
});

test("tower upgrades, targeting and sale use configured values transactionally", () => {
  const game = session([wave("wave-1", "runner", 1)]);
  begin(game);
  game.selectBuild("basic");
  const tower = game.placeSelectedTower(cell(game, 5, 2));
  game.upgradeTower(tower.id);
  game.setTargeting(tower.id, "strongest");
  assert.equal(game.getState().towers.get(tower.id)!.level, 1);
  assert.equal(game.getState().towers.get(tower.id)!.targeting, "strongest");
  assert.equal(game.getState().runtimeTowers[0]!.damage, 32);
  assert.equal(game.sellTower(tower.id), 125);
  assert.equal(game.getState().players.get("player")!.balance, 275);
  assert.equal(game.getState().occupiedCells.size, 0);
});

test("victory, defeat and restart publish correct terminal campaign state", () => {
  const winning = session([wave("last-wave", "runner", 1)]);
  begin(winning);
  winning.selectBuild("sniper");
  winning.placeSelectedTower(cell(winning, 5, 2));
  winning.startWave(false);
  runUntil(winning, () => winning.phase === "victory", 20);
  assert.equal(winning.getState().lives, 20);

  const losing = session([wave("last-wave", "boss", 3)]);
  begin(losing, "hard");
  losing.startWave(false);
  runUntil(losing, () => losing.phase === "defeat", 30);
  assert.equal(losing.getState().lives, 0);

  losing.restart();
  assert.equal(losing.phase, "preparing");
  assert.equal(losing.getState().lives, 15);
  assert.equal(losing.currentWaveNumber, 0);
  assert.equal(losing.getState().towers.size, 0);
});

test("versioned save/load restores an unfinished game and rejects corrupted data", () => {
  const memory = new MemoryStorage();
  const waves = [wave("wave-1", "runner", 2, 3), wave("wave-2", "runner", 1)];
  const original = session(waves, memory);
  begin(original);
  original.selectBuild("basic");
  original.placeSelectedTower(cell(original, 5, 2));
  original.setSpeed(2);
  original.startWave(false);
  original.update(0.5);
  const expectedGold = original.getState().players.get("player")!.balance;
  const expectedEnemies = original.getState().enemies.length;
  original.returnToMenu();

  const restored = session(waves, memory);
  assert.equal(restored.savedGameAvailable, true);
  assert.equal(restored.continueGame(), true);
  assert.equal(restored.speed, 2);
  assert.equal(restored.phase, "wave");
  assert.equal(restored.getState().towers.size, 1);
  assert.equal(restored.getState().enemies.length, expectedEnemies);
  assert.equal(restored.getState().players.get("player")!.balance, expectedGold);

  memory.setItem("river-outpost.active-game", "{broken json");
  const corrupted = session(waves, memory);
  assert.equal(corrupted.phase, "menu");
  assert.equal(corrupted.savedGameAvailable, false);
  assert.equal(corrupted.continueGame(), false);
  assert.equal(corrupted.phase, "menu");
});

test("sound settings persist defensively without affecting campaign state", () => {
  const memory = new MemoryStorage();
  const original = session([wave("wave-1", "runner", 1)], memory);
  original.setAudioSettings({ enabled: false, musicVolume: 0.21, sfxVolume: 0.73 });
  const restored = session([wave("wave-1", "runner", 1)], memory);
  assert.deepEqual(restored.audioSettings, {
    enabled: false,
    musicVolume: 0.21,
    sfxVolume: 0.73,
  });
  restored.setAudioSettings({ musicVolume: Number.NaN, sfxVolume: 4 });
  assert.deepEqual(restored.audioSettings, {
    enabled: false,
    musicVolume: 0.21,
    sfxVolume: 1,
  });
  assert.equal(restored.phase, "menu");
});

test("combat presentation effects stay inside a fixed pool and honor reduced motion", () => {
  const effects = new CombatEffectPool(32);
  const stableArray = effects.effects;
  for (let index = 0; index < 100; index += 1) {
    effects.emit({
      type: "hit",
      position: { x: 24, y: 24 },
      damage: 120,
      areaRadius: 72,
    });
  }
  assert.equal(effects.effects, stableArray);
  assert.equal(effects.effects.length, 32);
  assert.ok(effects.shakeIntensity > 0);
  effects.setReducedMotion(true);
  effects.emit({
    type: "hit",
    position: { x: 24, y: 24 },
    damage: 200,
    areaRadius: 90,
  });
  assert.equal(effects.shakeIntensity, 0);
  effects.update(2);
  assert.equal(effects.effects.length, 0);
});

test("a deliberate mixed-tower strategy can finish all twelve normal waves", () => {
  const game = new CampaignSession({ storage: new GameStorage(null) });
  begin(game);
  const build = (type: string, x: number, y: number): void => {
    game.selectBuild(type);
    game.placeSelectedTower(cell(game, x, y));
  };
  const plans: Readonly<Record<number, readonly (() => void)[]>> = {
    0: [
      () => build("basic", 14, 4),
      () => build("basic", 10, 4),
      () => build("basic", 6, 4),
    ],
    1: [() => build("rapid", 12, 4)],
    2: [() => game.upgradeTower("tower-1")],
    3: [() => build("frost", 9, 2)],
    4: [() => build("cannon", 7, 4)],
    5: [() => game.upgradeTower("tower-2")],
    6: [() => build("sniper", 15, 5)],
    7: [() => game.upgradeTower("tower-5")],
    8: [() => game.upgradeTower("tower-4")],
    9: [() => build("cannon", 4, 4)],
    10: [() => game.upgradeTower("tower-6")],
    11: [() => game.upgradeTower("tower-7")],
  };

  let preparedWave = -1;
  for (let elapsed = 0; elapsed < 15 * 60 && game.phase !== "victory"; elapsed += 1 / 30) {
    if (game.phase === "preparing" && preparedWave !== game.currentWaveNumber) {
      preparedWave = game.currentWaveNumber;
      for (const action of plans[preparedWave] ?? []) action();
      game.startWave(true);
    }
    game.update(1 / 30);
    if (game.phase === "defeat") break;
  }
  assert.equal(game.phase, "victory");
  assert.ok(game.getState().lives > 0);
  assert.equal(game.currentWaveNumber, 12);
});
