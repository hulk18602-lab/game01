import assert from "node:assert/strict";
import test from "node:test";
import levelDefinitions, { getLevelDefinition } from "../src/content/levels/levelDefinitions.js";
import map01 from "../src/content/maps/map01.js";
import map02 from "../src/content/maps/map02.js";
import level02Waves from "../src/content/waves/level02WaveDefinitions.js";
import Enemy from "../src/entities/Enemy.js";
import { CampaignSession, type WaveDefinition } from "../src/game/CampaignSession.js";
import { Grid } from "../src/game/map/index.js";
import {
  GameStorage,
  SAVE_SCHEMA_VERSION,
  type StorageLike,
} from "../src/game/persistence/GameStorage.js";
import EnemyAbilitySystem from "../src/game/systems/EnemyAbilitySystem.js";
import ProjectileSystem from "../src/game/systems/ProjectileSystem.js";
import StatusEffectSystem from "../src/game/systems/StatusEffectSystem.js";
import Path from "../src/path/Path.js";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const shortWave: readonly WaveDefinition[] = [{
  id: "unlock-wave",
  title: "Unlock wave",
  groups: [{ type: "runner", count: 1, at: 0, interval: 0 }],
}];

function runUntil(game: CampaignSession, predicate: () => boolean, maximum = 30): void {
  for (let elapsed = 0; elapsed < maximum && !predicate(); elapsed += 1 / 30) {
    game.update(1 / 30);
  }
  assert.equal(predicate(), true);
}

test("campaign starts with only Level 1 unlocked", () => {
  const game = new CampaignSession({ storage: new GameStorage(null) });
  game.openLevelSelect();
  assert.equal(game.phase, "level-select");
  const levels = game.levelOptions;
  assert.equal(levels.find((level) => level.id === "level-1")?.unlocked, true);
  assert.equal(levels.find((level) => level.id === "level-2")?.unlocked, false);
  assert.equal(levels.find((level) => level.id === "level-3")?.unlocked, false);
  assert.equal(levels.find((level) => level.id === "level-4")?.unlocked, false);
});

test("a save cannot restore a tower unavailable in its level", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  const original = new CampaignSession({ storage });
  original.newGame("normal");
  original.completeTutorial();
  original.selectBuild("basic");
  original.placeSelectedTower(
    original.converter.gridToWorld({ x: 4, y: 4 }, { center: true }),
  );
  const raw = JSON.parse(memory.getItem("river-outpost.active-game")!) as {
    towers: { type: string }[];
  };
  raw.towers[0]!.type = "tesla";
  memory.setItem("river-outpost.active-game", JSON.stringify(raw));

  const restored = new CampaignSession({ storage });
  assert.equal(restored.continueGame(), false);
  assert.equal(restored.phase, "menu");
  assert.equal(memory.getItem("river-outpost.active-game"), null);
});

test("winning Level 1 unlocks Level 2 and persists campaign progress", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  const level = getLevelDefinition("level-1");
  const game = new CampaignSession({
    levelId: "level-1",
    map: level.map,
    waves: shortWave,
    availableTowerTypes: level.availableTowerTypes,
    availableEnemyTypes: level.availableEnemyTypes,
    storage,
  });
  game.newGame("normal");
  game.completeTutorial();
  game.selectBuild("sniper");
  game.placeSelectedTower(game.converter.gridToWorld({ x: 15, y: 5 }, { center: true }));
  game.startWave(false);
  runUntil(game, () => game.phase === "victory");

  const restored = new CampaignSession({ storage });
  const level1 = restored.levelOptions.find((option) => option.id === "level-1")!;
  const level2 = restored.levelOptions.find((option) => option.id === "level-2")!;
  assert.equal(level1.completed, true);
  assert.ok(level1.bestScore > 0);
  assert.equal(level1.bestDifficulty, "normal");
  assert.equal(level2.unlocked, true);
});

test("tower catalog is filtered by selected level", () => {
  const level1 = getLevelDefinition("level-1");
  const level2 = getLevelDefinition("level-2");
  const first = new CampaignSession({
    levelId: level1.id,
    availableTowerTypes: level1.availableTowerTypes,
    availableEnemyTypes: level1.availableEnemyTypes,
    storage: new GameStorage(null),
  });
  const second = new CampaignSession({
    levelId: level2.id,
    map: level2.map,
    waves: level2.waves,
    availableTowerTypes: level2.availableTowerTypes,
    availableEnemyTypes: level2.availableEnemyTypes,
    storage: new GameStorage(null),
  });
  assert.deepEqual(first.towerOptions.map((tower) => tower.id), [
    "basic", "rapid", "frost", "cannon", "sniper",
  ]);
  assert.ok(second.towerOptions.some((tower) => tower.id === "tesla"));
  assert.ok(second.towerOptions.some((tower) => tower.id === "poison"));
});

test("Serpent Pass has one continuous non-intersecting route with valid cells", () => {
  const grid = new Grid(map02);
  const seen = new Set<string>();
  for (let index = 0; index < map02.enemyRoute.length; index += 1) {
    const cell = map02.enemyRoute[index]!;
    const key = `${cell.x},${cell.y}`;
    assert.equal(seen.has(key), false, `route intersects itself at ${key}`);
    seen.add(key);
    assert.equal(grid.isWalkable(cell), true);
    assert.equal(grid.isBuildable(cell), false);
    if (index > 0) {
      const previous = map02.enemyRoute[index - 1]!;
      assert.equal(Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y), 1);
    }
  }
  let buildableCells = 0;
  grid.forEach((tile: { readonly buildable: boolean }) => {
    if (tile.buildable) buildableCells += 1;
  });
  assert.ok(buildableCells > map02.enemyRoute.length * 2);
  const world = (map: typeof map01): { x: number; y: number }[] =>
    map.enemyRoute.map((cell) => ({
      x: (cell.x + 0.5) * map.tileSize,
      y: (cell.y + 0.5) * map.tileSize,
    }));
  const level1Length = new Path(world(map01)).length;
  const level2Length = new Path(world(map02 as unknown as typeof map01)).length;
  assert.equal(level1Length, 720);
  assert.equal(level2Length, 1680);
  assert.ok(level2Length > level1Length * 2);
  assert.equal(level02Waves.length, 14);
});

test("active saves contain level and content compatibility metadata", () => {
  const memory = new MemoryStorage();
  const level = getLevelDefinition("level-2");
  const game = new CampaignSession({
    levelId: level.id,
    map: level.map,
    waves: level.waves,
    availableTowerTypes: level.availableTowerTypes,
    availableEnemyTypes: level.availableEnemyTypes,
    contentVersion: level.contentVersion,
    storage: new GameStorage(memory),
  });
  game.newGame("easy");
  game.completeTutorial();
  const save = JSON.parse(memory.getItem("river-outpost.active-game")!) as {
    version: number;
    levelId: string;
    mapId: string;
    contentVersion: number;
  };
  assert.equal(save.version, SAVE_SCHEMA_VERSION);
  assert.equal(save.levelId, "level-2");
  assert.equal(save.mapId, "map02");
  assert.equal(save.contentVersion, level.contentVersion);
});

test("schema-v1 settings migrate while an incompatible active game is discarded", () => {
  const memory = new MemoryStorage();
  memory.setItem("river-outpost.settings", JSON.stringify({
    version: 1,
    tutorialSeen: true,
    difficulty: "hard",
    speed: 3,
    bestScore: 1234,
    soundEnabled: false,
    musicVolume: 0.2,
    sfxVolume: 0.8,
  }));
  memory.setItem("river-outpost.active-game", JSON.stringify({ version: 1, flow: {} }));
  const storage = new GameStorage(memory);
  const settings = storage.loadSettings();
  assert.equal(settings.version, 2);
  assert.equal(settings.tutorialSeen, true);
  assert.equal(settings.bestScoreByLevel["level-1"], 1234);
  assert.equal(settings.soundEnabled, false);
  assert.deepEqual(settings.unlockedLevelIds, ["level-1"]);
  assert.equal(storage.loadGame(), null);
  assert.equal(memory.getItem("river-outpost.active-game"), null);
});

test("Tesla chains through at most three targets with diminishing damage", () => {
  const enemies = [
    new Enemy("grunt", { id: "one", position: { x: 10, y: 0 } }),
    new Enemy("grunt", { id: "two", position: { x: 25, y: 0 } }),
    new Enemy("grunt", { id: "three", position: { x: 40, y: 0 } }),
    new Enemy("grunt", { id: "four", position: { x: 55, y: 0 } }),
  ];
  const projectiles = new ProjectileSystem();
  projectiles.spawn({
    sourceId: "tesla-1",
    targetId: "one",
    position: { x: 0, y: 0 },
    damage: 20,
    damageType: "electric",
    speed: 100,
    chainCount: 3,
    chainFalloff: 0.5,
    chainRange: 30,
  });
  projectiles.update(1, enemies, new StatusEffectSystem());
  assert.deepEqual(enemies.map((enemy) => enemy.health), [80, 90, 95, 100]);
});

test("Poison refreshes one damage-over-time effect instead of stacking", () => {
  const enemy = new Enemy("tank");
  const status = new StatusEffectSystem();
  status.apply(enemy, {
    type: "damageOverTime",
    duration: 4,
    damagePerSecond: 10,
    damageType: "poison",
  });
  status.update(2, [enemy]);
  status.apply(enemy, {
    type: "damageOverTime",
    duration: 5,
    damagePerSecond: 15,
    damageType: "poison",
  });
  assert.equal(enemy.statusEffects.length, 1);
  assert.equal(enemy.statusEffects[0]!.remaining, 5);
  assert.equal(enemy.statusEffects[0]!.damagePerSecond, 15);
});

test("Shielded absorbs damage before health and Splitter divides only once", () => {
  const shielded = new Enemy("shielded");
  shielded.takeDamage(50, "physical");
  assert.equal(shielded.shield, 70);
  assert.equal(shielded.health, 220);
  shielded.takeDamage(100, "true");
  assert.equal(shielded.shield, 0);
  assert.equal(shielded.health, 190);

  const abilities = new EnemyAbilitySystem({
    createEnemy: (type: string, overrides: Record<string, unknown>) => new Enemy(type, overrides),
  });
  const splitter = new Enemy("splitter", {
    position: { x: 50, y: 25 },
    progress: 0.4,
  });
  splitter.takeDamage(10_000);
  const children = abilities.spawnOnDeath([splitter]);
  assert.equal(children.length, 2);
  assert.ok(children.every((child: InstanceType<typeof Enemy>) => child.type === "swarm"));
  for (const child of children) child.takeDamage(10_000);
  assert.equal(abilities.spawnOnDeath(children).length, 0);
});

test("catalog declares four playable campaign levels", () => {
  assert.deepEqual(levelDefinitions.map((level) => level.id), [
    "level-1", "level-2", "level-3", "level-4",
  ]);
  assert.deepEqual(levelDefinitions.map((level) => level.playable), [
    true, true, true, true,
  ]);
});
