import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultHeroSkills,
  heroSkillDefinitions,
  heroSkillIds,
  MAX_HERO_LEVEL,
} from "../src/content/heroes/heroSkills.js";
import { getLevelDefinition, type LevelId } from "../src/content/levels/levelDefinitions.js";
import map03 from "../src/content/maps/map03.js";
import map04 from "../src/content/maps/map04.js";
import level04Waves from "../src/content/waves/level04WaveDefinitions.js";
import { HeroEntity } from "../src/entities/HeroEntity.js";
import Enemy from "../src/entities/Enemy.js";
import {
  CampaignSession,
  type WaveDefinition,
  type WaveGroup,
} from "../src/game/CampaignSession.js";
import { Grid } from "../src/game/map/index.js";
import {
  GameStorage,
  type StorageLike,
} from "../src/game/persistence/GameStorage.js";
import { createRuntimeTower, type RuntimeTowerDefinition } from "../src/game/runtime.js";
import { HeroExperienceSystem } from "../src/game/systems/HeroExperienceSystem.js";
import { TowerAuraSystem } from "../src/game/systems/TowerAuraSystem.js";
import { ProjectileSystem } from "../src/game/systems/ProjectileSystem.js";
import { StatusEffectSystem } from "../src/game/systems/StatusEffectSystem.js";
import Path from "../src/path/Path.js";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const oneGruntWave: readonly WaveDefinition[] = [{
  id: "level-4-test-wave",
  title: "Progression test",
  groups: [{ type: "grunt", count: 1, at: 0, interval: 0 }],
}];

function seedProgress(
  storage: GameStorage,
  unlockedLevelIds: readonly LevelId[],
  progression: {
    readonly level?: number;
    readonly xp?: number;
    readonly skillPoints?: number;
    readonly skills?: ReturnType<typeof createDefaultHeroSkills>;
  } = {},
): void {
  const level = progression.level ?? 1;
  storage.saveSettings({
    tutorialSeen: true,
    difficulty: "normal",
    speed: 1,
    soundEnabled: false,
    musicVolume: 0.34,
    sfxVolume: 0.62,
    selectedLevelId: unlockedLevelIds.at(-1) ?? "level-1",
    unlockedLevelIds,
    completedLevelIds: unlockedLevelIds.slice(0, -1),
    bestScoreByLevel: {},
    bestDifficultyByLevel: {},
    heroLevel: level,
    heroXp: progression.xp ?? 0,
    heroSkillPoints: progression.skillPoints ?? level - 1,
    heroSkills: progression.skills ?? createDefaultHeroSkills(),
  });
}

function createSession(
  levelId: "level-3" | "level-4",
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
  session: CampaignSession,
  predicate: () => boolean,
  maximumSeconds = 15,
): void {
  for (let elapsed = 0; elapsed < maximumSeconds && !predicate(); elapsed += 1 / 120) {
    session.update(1 / 120);
  }
  assert.equal(predicate(), true);
}

test("Arcane Citadel has one valid 48-cell route, sixteen waves and a final boss", () => {
  const grid = new Grid(map04);
  const seen = new Set<string>();
  for (let index = 0; index < map04.enemyRoute.length; index += 1) {
    const cell = map04.enemyRoute[index]!;
    const key = `${cell.x},${cell.y}`;
    assert.equal(seen.has(key), false);
    seen.add(key);
    assert.equal(grid.isWalkable(cell), true);
    assert.equal(grid.isBuildable(cell), false);
    if (index > 0) {
      const previous = map04.enemyRoute[index - 1]!;
      assert.equal(Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y), 1);
    }
  }
  const pathLength = (map: typeof map04): number => new Path(
    map.enemyRoute.map((cell) => ({
      x: (cell.x + 0.5) * map.tileSize,
      y: (cell.y + 0.5) * map.tileSize,
    })),
  ).length;
  assert.equal(map04.enemyRoute.length, 48);
  assert.equal(pathLength(map04), 2256);
  assert.ok(pathLength(map04) > pathLength(map03 as unknown as typeof map04));
  assert.equal(level04Waves.length, 16);
  assert.equal(
    level04Waves.at(-1)?.groups.some((group: WaveGroup) => group.type === "archonBoss"),
    true,
  );
  const available = getLevelDefinition("level-4").availableEnemyTypes;
  assert.equal(available.includes("eliteRunner"), true);
  assert.equal(available.includes("arcaneSentinel"), true);
  assert.equal(available.includes("stormLancer"), true);
});

test("participation XP uses a 70/30 final-blow and assist split, then grants a skill point", () => {
  const definition = getLevelDefinition("level-4").heroConfig!;
  const hero = new HeroEntity(definition, { position: { x: 100, y: 100 } });
  const experience = new HeroExperienceSystem();
  const assist = experience.award({
    type: "enemy-death",
    sourceId: "tower-1",
    targetId: "enemy-1",
    position: { x: 0, y: 0 },
    reward: 100,
    contributions: [
      { sourceId: hero.id, damage: 40 },
      { sourceId: "tower-1", damage: 60 },
    ],
  }, hero);
  assert.equal(assist.xpAwarded, 30);
  assert.equal(hero.xp, 30);

  const sole = experience.award({
    type: "enemy-death",
    sourceId: hero.id,
    targetId: "enemy-2",
    position: { x: 0, y: 0 },
    reward: 50,
    contributions: [{ sourceId: hero.id, damage: 50 }],
  }, hero);
  assert.equal(sole.xpAwarded, 50);
  assert.equal(sole.levelsGained, 1);
  assert.equal(hero.level, 2);
  assert.equal(hero.xp, 0);
  assert.equal(hero.skillPoints, 1);
  assert.equal(hero.maximumLevel, MAX_HERO_LEVEL);
});

test("all four hero skills expose three levels and derive combat stats", () => {
  for (const skillId of heroSkillIds) {
    assert.equal(heroSkillDefinitions[skillId].levels.length, 3);
  }
  const definition = getLevelDefinition("level-4").heroConfig!;
  const hero = new HeroEntity(definition, {
    position: { x: 0, y: 0 },
    level: 10,
    skillPoints: 9,
  });
  const baseRange = hero.range;
  const baseFireRate = hero.fireRate;
  hero.upgradeSkill("keenEye");
  hero.upgradeSkill("rapidVolley");
  hero.upgradeSkill("piercingArrow");
  hero.upgradeSkill("rallyAura");
  assert.ok(hero.range > baseRange);
  assert.ok(hero.fireRate > baseFireRate);
  assert.equal(hero.chainCount, 2);
  assert.equal(hero.auraRadius, 150);
  assert.equal(hero.auraDamageBonus, 0.2);
  assert.equal(hero.auraFireRateBonus, 0.15);
});

test("Piercing Arrow damages only the configured number of nearby targets", () => {
  const projectiles = new ProjectileSystem();
  const statuses = new StatusEffectSystem();
  const enemies = [20, 40, 60].map((x, index) => new Enemy("grunt", {
    id: `piercing-target-${index}`,
    position: { x, y: 0 },
  }));
  projectiles.spawn({
    sourceId: "hero-rowan",
    targetId: enemies[0]!.id,
    position: { x: 0, y: 0 },
    damage: 20,
    damageType: "physical",
    speed: 1_000,
    chainCount: 2,
    chainFalloff: 0.86,
    chainRange: 120,
    projectileType: "arrow",
  });
  projectiles.update(1, enemies, statuses);
  assert.ok(enemies[0]!.health < enemies[0]!.maxHealth);
  assert.ok(enemies[1]!.health < enemies[1]!.maxHealth);
  assert.equal(enemies[2]!.health, enemies[2]!.maxHealth);
});

test("TowerAuraSystem derives effective stats without stacking and removes them outside range", () => {
  const heroDefinition = getLevelDefinition("level-4").heroConfig!;
  const hero = new HeroEntity(heroDefinition, {
    position: { x: 0, y: 0 },
    level: 2,
    skillPoints: 0,
    skills: { rallyAura: 1 },
  });
  const tower = createRuntimeTower(
    { id: "tower-1", type: "basic", level: 0, targeting: "first" },
    {
      name: "Basic",
      range: 160,
      damage: 20,
      fireRate: 1,
      projectileSpeed: 360,
      targeting: "first",
    } satisfies RuntimeTowerDefinition,
    { x: 100, y: 0 },
  );
  const aura = new TowerAuraSystem();
  aura.update(hero, [tower]);
  assert.equal(tower.auraBuffed, true);
  assert.equal(tower.baseDamage, 20);
  assert.equal(tower.effectiveDamage, 24);
  assert.equal(tower.effectiveFireRate, 1.15);
  for (let frame = 0; frame < 600; frame += 1) aura.update(hero, [tower]);
  assert.equal(tower.effectiveDamage, 24);
  assert.equal(tower.effectiveFireRate, 1.15);

  hero.position.x = 400;
  aura.update(hero, [tower]);
  assert.equal(tower.auraBuffed, false);
  assert.equal(tower.effectiveDamage, tower.baseDamage);
  assert.equal(tower.effectiveFireRate, tower.baseFireRate);
});

test("tower upgrade inside Rally Aura recomputes from upgraded base stats", () => {
  const storage = new GameStorage(new MemoryStorage());
  const skills = createDefaultHeroSkills();
  skills.rallyAura = 1;
  seedProgress(storage, ["level-1", "level-2", "level-3", "level-4"], {
    level: 5,
    skillPoints: 3,
    skills,
  });
  const session = createSession("level-4", storage, oneGruntWave);
  session.newGame("normal");
  session.selectBuild("basic");
  const tower = session.placeSelectedTower(
    session.converter.gridToWorld({ x: 13, y: 11 }, { center: true }),
  );
  const before = session.getState().runtimeTowers.find((item) => item.id === tower.id)!;
  assert.equal(before.baseDamage, 20);
  assert.equal(before.effectiveDamage, 24);
  session.upgradeTower(tower.id);
  const upgraded = session.getState().runtimeTowers.find((item) => item.id === tower.id)!;
  assert.equal(upgraded.baseDamage, 32);
  assert.equal(upgraded.effectiveDamage, 38.4);
  session.update(1);
  assert.equal(upgraded.effectiveDamage, 38.4);
});

test("active save restores skills and corrupt persistent progression falls back safely", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  seedProgress(storage, ["level-1", "level-2", "level-3", "level-4"], {
    level: 5,
    skillPoints: 4,
  });
  const session = createSession("level-4", storage, oneGruntWave);
  session.newGame("normal");
  session.upgradeHeroSkill("rallyAura");
  session.upgradeHeroSkill("keenEye");
  session.returnToMenu();

  const restored = createSession("level-4", storage, oneGruntWave);
  assert.equal(restored.continueGame(), true);
  assert.equal(restored.hero?.skills.rallyAura, 1);
  assert.equal(restored.hero?.skills.keenEye, 1);
  assert.equal(restored.hero?.skillPoints, 2);

  const corrupt = JSON.parse(memory.getItem("river-outpost.settings")!) as Record<string, unknown>;
  corrupt.heroLevel = 999;
  corrupt.heroXp = -20;
  corrupt.heroSkillPoints = 999;
  corrupt.heroSkills = { rallyAura: 99, keenEye: -1 };
  memory.setItem("river-outpost.settings", JSON.stringify(corrupt));
  const fallback = storage.loadSettings();
  assert.equal(fallback.heroLevel, 1);
  assert.equal(fallback.heroXp, 0);
  assert.equal(fallback.heroSkillPoints, 0);
  assert.deepEqual(fallback.heroSkills, createDefaultHeroSkills());
});

test("Level 4 stays locked until a Level 3 victory", () => {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory);
  seedProgress(storage, ["level-1", "level-2", "level-3"]);
  const session = createSession("level-3", storage, oneGruntWave);
  assert.equal(session.levelOptions.find((level) => level.id === "level-4")?.unlocked, false);
  session.newGame("normal");
  session.selectBuild("sniper");
  session.placeSelectedTower(
    session.converter.gridToWorld({ x: 18, y: 3 }, { center: true }),
  );
  session.startWave(false);
  updateUntil(session, () => session.phase === "victory");
  assert.equal(storage.loadSettings().unlockedLevelIds.includes("level-4"), true);
});
