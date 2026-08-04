import assert from "node:assert/strict";
import test from "node:test";
import { levelIds, getLevelDefinition, type LevelId } from "../src/content/levels/levelDefinitions.js";
import { createDefaultHeroSkills, heroSkillIds, MAX_HERO_LEVEL } from "../src/content/heroes/heroSkills.js";
import map05 from "../src/content/maps/map05.js";
import map06 from "../src/content/maps/map06.js";
import map07 from "../src/content/maps/map07.js";
import map08 from "../src/content/maps/map08.js";
import Enemy from "../src/entities/Enemy.js";
import { HeroEntity } from "../src/entities/HeroEntity.js";
import { Grid } from "../src/game/map/index.js";
import { GameStorage, type StorageLike } from "../src/game/persistence/GameStorage.js";
import EnemyAbilitySystem from "../src/game/systems/EnemyAbilitySystem.js";
import HeroCombatSystem from "../src/game/systems/HeroCombatSystem.js";
import StatusEffectSystem from "../src/game/systems/StatusEffectSystem.js";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const maps = [map05, map06, map07, map08] as const;
const expectedRouteLengths = [60, 70, 82, 94] as const;
const expectedWaveCounts = [17, 18, 19, 20] as const;

test("LevelId and unlock metadata form one complete eight-level chain", () => {
  assert.deepEqual(levelIds, [
    "level-1", "level-2", "level-3", "level-4",
    "level-5", "level-6", "level-7", "level-8",
  ]);
  for (let index = 0; index < levelIds.length - 1; index += 1) {
    assert.equal(getLevelDefinition(levelIds[index]!).unlocksLevelId, levelIds[index + 1]);
  }
  assert.equal(getLevelDefinition("level-8").unlocksLevelId, null);
});

test("Levels 5-8 have increasingly long, valid routes and valid wave catalogs", () => {
  for (let index = 0; index < maps.length; index += 1) {
    const map = maps[index]!;
    const level = getLevelDefinition(`level-${index + 5}` as LevelId);
    const grid = new Grid(map);
    assert.equal(map.enemyRoute.length, expectedRouteLengths[index]);
    assert.equal(level.waves.length, expectedWaveCounts[index]);
    assert.ok(index === 0 || map.enemyRoute.length > maps[index - 1]!.enemyRoute.length);
    const seen = new Set<string>();
    for (let routeIndex = 0; routeIndex < map.enemyRoute.length; routeIndex += 1) {
      const cell = map.enemyRoute[routeIndex]!;
      const key = `${cell.x},${cell.y}`;
      assert.equal(seen.has(key), false, `${map.id} repeats ${key}`);
      seen.add(key);
      assert.equal(grid.isWalkable(cell), true, `${map.id} route must be walkable`);
      assert.equal(grid.isBuildable(cell), false, `${map.id} route must be non-buildable`);
      if (routeIndex > 0) {
        const previous = map.enemyRoute[routeIndex - 1]!;
        assert.equal(Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y), 1);
      }
    }
    assert.equal(grid.isWalkable(level.heroConfig!.spawnCell), true);
    const waveIds = new Set<string>();
    for (const wave of level.waves) {
      assert.equal(waveIds.has(wave.id), false, `duplicate wave id ${wave.id}`);
      waveIds.add(wave.id);
      for (const group of wave.groups) {
        assert.ok(level.availableEnemyTypes.includes(group.type));
        assert.ok(group.count > 0);
        assert.ok((group.interval ?? 0) >= 0);
      }
    }
  }
});

test("support, summon, debuff and boss abilities are bounded and reversible", () => {
  const abilities = new EnemyAbilitySystem({
    createEnemy: (type: string, overrides: Record<string, unknown>) => new Enemy(type, overrides),
  });
  const berserker = new Enemy("berserker", { currentHealth: 100 });
  abilities.update(0.1, [berserker]);
  abilities.update(0.1, [berserker]);
  assert.equal(berserker.enraged, true);
  assert.equal(berserker.abilitySpeedMultiplier, 1.3);

  const ally = new Enemy("grunt", { position: { x: 20, y: 0 } });
  const captains = [
    new Enemy("warBannerCaptain", { position: { x: 0, y: 0 } }),
    new Enemy("warBannerCaptain", { position: { x: 10, y: 0 } }),
  ];
  abilities.update(0.1, [...captains, ally]);
  assert.equal(ally.supportSpeedMultiplier, 1.15);
  captains.forEach((captain) => captain.takeDamage(10_000));
  abilities.update(0.1, [...captains, ally]);
  assert.equal(ally.supportSpeedMultiplier, 1);

  const shaman = new Enemy("iceShaman", { position: { x: 0, y: 0 }, abilityCooldown: 0 });
  const dead = new Enemy("grunt", { position: { x: 5, y: 0 }, currentHealth: 1 });
  dead.takeDamage(10);
  const living = new Enemy("grunt", { position: { x: 10, y: 0 }, currentHealth: 20 });
  abilities.update(0.1, [shaman, dead, living]);
  assert.equal(dead.health, 0);
  assert.ok(living.health > 20);

  const necromancer = new Enemy("necromancer", { currentHealth: 250, abilityCooldown: 0 });
  const host = [necromancer];
  abilities.update(0.1, host);
  const summonedCount = host.length;
  abilities.update(20, host);
  assert.equal(host.length, summonedCount);

  const tower = {
    position: { x: 0, y: 0 }, baseFireRate: 2, effectiveFireRate: 2,
    debuffMultiplier: 1, debuffRemaining: 0,
  };
  const warlock = new Enemy("voidWarlock", { position: { x: 0, y: 0 }, debuffTimer: 0 });
  abilities.update(0.1, [warlock], [tower]);
  tower.effectiveFireRate = tower.baseFireRate;
  abilities.update(0.1, [warlock], [tower]);
  assert.equal(tower.baseFireRate, 2);
  assert.ok(tower.effectiveFireRate < tower.baseFireRate);
  tower.effectiveFireRate = tower.baseFireRate;
  abilities.update(20, [], [tower]);
  assert.equal(tower.baseFireRate, 2);
  assert.equal(tower.effectiveFireRate, 2);

  const king = new Enemy("eclipseKing");
  king.health = king.maxHealth * 0.6;
  abilities.update(0, [king]);
  assert.equal(king.bossPhase, 2);
  king.health = king.maxHealth * 0.3;
  abilities.update(0, [king]);
  assert.equal(king.bossPhase, 3);
});

test("Eldrin reaches level 20 once and enforces declarative skill prerequisites", () => {
  const hero = new HeroEntity(getLevelDefinition("level-8").heroConfig!, {
    position: { x: 0, y: 0 }, level: 1, skillPoints: 0,
  });
  hero.gainXp(1_000_000);
  assert.equal(hero.level, MAX_HERO_LEVEL);
  assert.equal(hero.skillPoints, 19);
  hero.gainXp(1_000_000);
  assert.equal(hero.skillPoints, 19);
  assert.match(hero.skillUpgradeError("multishot")!, /Rapid Volley/);
  hero.upgradeSkill("rapidVolley");
  assert.equal(hero.skillUpgradeError("multishot"), null);
  assert.match(hero.skillUpgradeError("rainOfArrows")!, /Multishot level 2/);
  hero.upgradeSkill("multishot");
  hero.upgradeSkill("multishot");
  assert.equal(hero.skillUpgradeError("rainOfArrows"), null);
  assert.equal(heroSkillIds.length, 10);
});

test("poison refreshes, slow keeps the strongest effect, and Hunter's Mark clears", () => {
  const status = new StatusEffectSystem();
  const enemy = new Enemy("grunt");
  status.apply(enemy, { type: "damageOverTime", duration: 2, damagePerSecond: 5 });
  status.apply(enemy, { type: "damageOverTime", duration: 4, damagePerSecond: 9 });
  assert.equal(enemy.statusEffects.filter((effect: { type: string }) => effect.type === "damageOverTime").length, 1);
  assert.equal(enemy.statusEffects[0]!.damagePerSecond, 9);
  status.apply(enemy, { type: "slow", duration: 2, multiplier: 0.85 });
  status.apply(enemy, { type: "slow", duration: 1, multiplier: 0.65 });
  assert.equal(enemy.speedMultiplier, 0.65);

  const skills = createDefaultHeroSkills();
  skills.keenEye = 2;
  skills.huntersMark = 1;
  const hero = new HeroEntity(getLevelDefinition("level-8").heroConfig!, {
    position: { x: 0, y: 0 }, level: 20, skillPoints: 16, skills,
  });
  hero.applyHuntersMark(enemy.id);
  enemy.takeDamage(10_000);
  const combat = new HeroCombatSystem();
  combat.update(0, hero, [enemy], { spawn: () => undefined });
  assert.equal(hero.markedTargetId, null);
  assert.equal(hero.markTowerDamageBonus, 0);
});

test("schema 2 migrates campaign and four legacy skills without losing progress", () => {
  const memory = new MemoryStorage();
  memory.setItem("river-outpost.settings", JSON.stringify({
    version: 2, tutorialSeen: true, difficulty: "hard", speed: 3,
    soundEnabled: false, musicVolume: 0.2, sfxVolume: 0.7,
    selectedLevelId: "level-4",
    unlockedLevelIds: ["level-1", "level-2", "level-3", "level-4"],
    completedLevelIds: ["level-1", "level-2", "level-3"],
    bestScoreByLevel: { "level-3": 3210 }, bestDifficultyByLevel: { "level-3": "hard" },
    heroLevel: 10, heroXp: 12, heroSkillPoints: 5,
    heroSkills: { keenEye: 1, rapidVolley: 1, piercingArrow: 1, rallyAura: 1 },
  }));
  const settings = new GameStorage(memory).loadSettings();
  assert.equal(settings.version, 3);
  assert.equal(settings.selectedLevelId, "level-4");
  assert.deepEqual(settings.completedLevelIds, ["level-1", "level-2", "level-3"]);
  assert.equal(settings.heroLevel, 10);
  assert.equal(settings.heroSkills.rallyAura, 1);
  assert.equal(settings.heroSkills.rainOfArrows, 0);
  assert.equal(settings.bestScoreByLevel["level-3"], 3210);
  assert.equal(settings.soundEnabled, false);
});
