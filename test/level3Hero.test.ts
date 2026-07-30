import assert from "node:assert/strict";
import test from "node:test";
import { waveCompletionReward } from "../src/content/balance/rewards.js";
import { getLevelDefinition } from "../src/content/levels/levelDefinitions.js";
import map02 from "../src/content/maps/map02.js";
import map03 from "../src/content/maps/map03.js";
import level03Waves from "../src/content/waves/level03WaveDefinitions.js";
import { CampaignSession, type WaveDefinition } from "../src/game/CampaignSession.js";
import { Grid } from "../src/game/map/index.js";
import {
  GameStorage,
  type StorageLike,
} from "../src/game/persistence/GameStorage.js";
import Path from "../src/path/Path.js";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const heroWave: readonly WaveDefinition[] = [{
  id: "hero-test-wave",
  title: "Hero test",
  groups: [{ type: "grunt", count: 1, at: 0, interval: 0 }],
}];

function seedProgress(storage: GameStorage, unlocked: readonly ("level-1" | "level-2" | "level-3")[]): void {
  storage.saveSettings({
    tutorialSeen: true,
    difficulty: "normal",
    speed: 1,
    soundEnabled: false,
    musicVolume: 0.34,
    sfxVolume: 0.62,
    selectedLevelId: unlocked.at(-1) ?? "level-1",
    unlockedLevelIds: unlocked,
    completedLevelIds: unlocked.filter((level) => level !== unlocked.at(-1)),
    bestScoreByLevel: {},
    bestDifficultyByLevel: {},
    heroLevel: 1,
  });
}

function createLevelSession(
  levelId: "level-2" | "level-3",
  storage: GameStorage,
  waves?: readonly WaveDefinition[],
): CampaignSession {
  const level = getLevelDefinition(levelId);
  return new CampaignSession({
    levelId,
    map: level.map,
    waves: waves ?? level.waves,
    availableTowerTypes: level.availableTowerTypes,
    availableEnemyTypes: level.availableEnemyTypes,
    contentVersion: level.contentVersion,
    storage,
  });
}

function updateUntil(
  game: CampaignSession,
  predicate: () => boolean,
  maximumSeconds = 20,
  onFrame: () => void = () => {},
): void {
  for (let elapsed = 0; elapsed < maximumSeconds && !predicate(); elapsed += 1 / 120) {
    game.update(1 / 120);
    onFrame();
  }
  assert.equal(predicate(), true);
}

test("Greenwood Siege declares a valid 41-cell route longer than Serpent Pass", () => {
  const grid = new Grid(map03);
  const seen = new Set<string>();
  for (let index = 0; index < map03.enemyRoute.length; index += 1) {
    const cell = map03.enemyRoute[index]!;
    const key = `${cell.x},${cell.y}`;
    assert.equal(seen.has(key), false);
    seen.add(key);
    assert.equal(grid.isWalkable(cell), true);
    assert.equal(grid.isBuildable(cell), false);
    if (index > 0) {
      const previous = map03.enemyRoute[index - 1]!;
      assert.equal(Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y), 1);
    }
  }
  const length = (map: typeof map03): number => new Path(
    map.enemyRoute.map((cell) => ({
      x: (cell.x + 0.5) * map.tileSize,
      y: (cell.y + 0.5) * map.tileSize,
    })),
  ).length;
  assert.equal(map03.enemyRoute.length, 41);
  assert.equal(length(map03), 1920);
  assert.ok(length(map03) > length(map02 as unknown as typeof map03));
  assert.equal(level03Waves.length, 15);
});

test("Level 3 remains locked until a Level 2 victory", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  seedProgress(storage, ["level-1", "level-2"]);
  const game = createLevelSession("level-2", storage, heroWave);
  assert.equal(game.levelOptions.find((level) => level.id === "level-3")?.unlocked, false);
  game.newGame("normal");
  game.selectBuild("sniper");
  game.placeSelectedTower(game.converter.gridToWorld({ x: 18, y: 3 }, { center: true }));
  game.startWave(false);
  updateUntil(game, () => game.phase === "victory");

  const restored = new CampaignSession({ storage });
  assert.equal(restored.levelOptions.find((level) => level.id === "level-3")?.unlocked, true);
});

test("hero routes around tower obstacles and rejects water without becoming a runtime tower", () => {
  const storage = new GameStorage(new MemoryStorage());
  seedProgress(storage, ["level-1", "level-2", "level-3"]);
  const game = createLevelSession("level-3", storage, heroWave);
  game.newGame("normal");
  const hero = game.hero!;
  assert.ok(hero);
  assert.equal(game.getState().runtimeTowers.some((tower) => tower.id === hero.id), false);
  assert.throws(
    () => game.moveHero(game.converter.gridToWorld({ x: 13, y: 3 }, { center: true })),
    /water or rocks/,
  );

  game.selectBuild("basic");
  game.placeSelectedTower(game.converter.gridToWorld({ x: 12, y: 10 }, { center: true }));
  const destination = game.converter.gridToWorld({ x: 14, y: 11 }, { center: true });
  game.moveHero(destination);
  let crossedTowerCell = false;
  updateUntil(game, () => Math.hypot(
    hero.position.x - destination.x,
    hero.position.y - destination.y,
  ) < 1, 8, () => {
    const cell = game.converter.worldToGrid(hero.position);
    if (cell.x === 12 && cell.y === 10) crossedTowerCell = true;
  });
  assert.equal(crossedTowerCell, false);
  const beforeKeyboardMove = { ...hero.position };
  game.setHeroMovementInput({ x: -1, y: 0 });
  game.update(0.5);
  game.setHeroMovementInput({ x: 0, y: 0 });
  assert.ok(hero.position.x < beforeKeyboardMove.x);
  assert.equal(game.grid.isWalkable(game.converter.worldToGrid(hero.position)), true);
});

test("hero arrows use shared damage and cleanup rewards exactly once", () => {
  const storage = new GameStorage(new MemoryStorage());
  seedProgress(storage, ["level-1", "level-2", "level-3"]);
  const game = createLevelSession("level-3", storage, heroWave);
  game.newGame("normal");
  const hero = game.hero!;
  const firingPosition = game.converter.gridToWorld({ x: 19, y: 4 }, { center: true });
  game.moveHero(firingPosition);
  updateUntil(game, () => Math.hypot(
    hero.position.x - firingPosition.x,
    hero.position.y - firingPosition.y,
  ) < 1, 8);
  const goldBefore = game.getState().players.get("player")!.balance;
  game.startWave(false);
  let acquiredTarget = false;
  let sawArrow = false;
  let sawDamage = false;
  updateUntil(game, () => game.phase === "victory", 12, () => {
    acquiredTarget ||= hero.targetId !== null;
    sawArrow ||= game.projectiles.some((projectile) => projectile.projectileType === "arrow");
    sawDamage ||= game.getState().enemies.some((enemy) =>
      enemy.health > 0 && enemy.health < enemy.maxHealth
    );
  });
  assert.equal(acquiredTarget, true);
  assert.equal(sawArrow, true);
  assert.equal(sawDamage, true);
  assert.equal(hero.xp, 10);
  assert.equal(
    game.getState().players.get("player")!.balance,
    goldBefore + 10 + waveCompletionReward(1, true),
  );
});

test("active save restores hero state and Level 3 victory persists hero level", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  seedProgress(storage, ["level-1", "level-2", "level-3"]);
  const game = createLevelSession("level-3", storage, heroWave);
  game.newGame("normal");
  const hero = game.hero!;
  hero.gainXp(80);
  const destination = game.converter.gridToWorld({ x: 19, y: 4 }, { center: true });
  game.moveHero(destination);
  game.update(0.5);
  const savedPosition = { ...hero.position };
  game.returnToMenu();
  const activeSave = JSON.parse(memory.getItem("river-outpost.active-game")!) as {
    hero: {
      position: { x: number; y: number };
      moveTarget: { x: number; y: number } | null;
      level: number;
      xp: number;
    };
  };
  assert.deepEqual(activeSave.hero.position, savedPosition);
  assert.deepEqual(activeSave.hero.moveTarget, destination);
  assert.equal(activeSave.hero.level, 2);
  assert.equal(activeSave.hero.xp, 0);

  const restored = createLevelSession("level-3", storage, heroWave);
  assert.equal(restored.continueGame(), true);
  assert.equal(restored.hero?.level, 2);
  assert.equal(restored.hero?.xp, 0);
  assert.deepEqual(restored.hero?.position, savedPosition);
  assert.deepEqual(restored.hero?.moveTarget, destination);

  updateUntil(restored, () => Math.hypot(
    restored.hero!.position.x - destination.x,
    restored.hero!.position.y - destination.y,
  ) < 1, 8);
  restored.startWave(false);
  updateUntil(restored, () => restored.phase === "victory", 12);
  assert.equal(storage.loadSettings().heroLevel, 2);

  const replay = createLevelSession("level-3", storage, heroWave);
  replay.newGame("normal");
  assert.equal(replay.hero?.level, 2);
});
