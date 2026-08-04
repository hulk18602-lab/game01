import TargetingSystem from "./TargetingSystem.js";

/** Hero fire timing is logical (windup/release/recovery), never coupled to sprite frames. */
export class HeroCombatSystem {
  constructor() {
    this.targeting = new TargetingSystem();
  }

  update(deltaSeconds, hero, enemies, projectileSystem) {
    if (!hero) return;
    if (deltaSeconds < 0) throw new RangeError("Hero combat delta must not be negative");
    this.updateRainOfArrows(deltaSeconds, hero, enemies, projectileSystem);
    if (hero.markedTargetId && !enemies.some((enemy) => enemy.id === hero.markedTargetId && enemy.isAlive)) {
      hero.markedTargetId = null;
      hero.markRemaining = 0;
      hero.markHeroDamageBonus = 0;
      hero.markTowerDamageBonus = 0;
    }
    const target = this.targeting.selectTarget(hero, enemies) ?? null;
    hero.targetId = target?.id ?? null;
    hero.cooldown = Math.max(0, hero.cooldown - deltaSeconds);

    if (hero.combatState === "aiming") {
      if (!target) {
        hero.finishShot();
        return;
      }
      hero.updateFacingToward(target.position);
      hero.attackElapsed += deltaSeconds;
      if (hero.attackElapsed < hero.attackWindup) return;
      const markedBonus = target.id === hero.markedTargetId ? hero.markHeroDamageBonus : 0;
      const venom = hero.skillEffect("venomArrows");
      const frost = hero.skillEffect("frostArrows");
      const statusEffects = [];
      if (venom?.poisonDamage) statusEffects.push({
        type: "damageOverTime", duration: venom.poisonDuration, damagePerSecond: venom.poisonDamage, damageType: "poison",
      });
      if (frost?.slowMultiplier) statusEffects.push({
        type: "slow", duration: frost.slowDuration, multiplier: frost.slowMultiplier,
      });
      projectileSystem.spawn({
        sourceId: hero.id,
        targetId: target.id,
        position: { ...hero.position },
        damage: hero.damage * (1 + markedBonus),
        damageType: hero.damageType,
        speed: hero.projectileSpeed,
        chainCount: hero.chainCount,
        chainFalloff: hero.chainFalloff,
        chainRange: hero.chainRange,
        color: hero.projectileColor,
        projectileType: hero.projectileType,
        statusEffects,
      });
      const multishot = hero.skillEffect("multishot");
      const arrowCount = multishot?.arrowCount ?? 1;
      let spawned = 1;
      for (const secondary of enemies) {
        if (spawned >= arrowCount) break;
        if (!secondary.isAlive || secondary.id === target.id || secondary.targetable === false) continue;
        if (Math.hypot(secondary.position.x - hero.position.x, secondary.position.y - hero.position.y) > hero.range) continue;
        const secondaryMarked = secondary.id === hero.markedTargetId ? hero.markHeroDamageBonus : 0;
        projectileSystem.spawn({
          sourceId: hero.id, targetId: secondary.id, position: { ...hero.position },
          damage: hero.damage * (multishot?.secondaryDamage ?? 1) * (1 + secondaryMarked),
          damageType: hero.damageType, speed: hero.projectileSpeed, color: hero.projectileColor,
          projectileType: hero.projectileType, statusEffects,
        });
        spawned += 1;
      }
      hero.cooldown = 1 / hero.fireRate;
      hero.releaseShot();
      return;
    }

    if (hero.combatState === "shooting") {
      hero.recoveryElapsed += deltaSeconds;
      if (hero.recoveryElapsed >= hero.attackRecovery) hero.finishShot();
      return;
    }

    if (target && hero.cooldown <= 0) {
      hero.updateFacingToward(target.position);
      hero.beginAiming();
    }
  }

  updateRainOfArrows(deltaSeconds, hero, enemies, projectileSystem) {
    const rain = hero.rainOfArrows;
    if (!rain) return;
    rain.remaining = Math.max(0, rain.remaining - deltaSeconds);
    rain.accumulator += deltaSeconds;
    const interval = 2 / Math.max(1, hero.skillEffect("rainOfArrows")?.rainArrowCount ?? 1);
    while (rain.strikesRemaining > 0 && rain.accumulator >= interval) {
      rain.accumulator -= interval;
      let target = null;
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        if (Math.hypot(enemy.position.x - rain.center.x, enemy.position.y - rain.center.y) <= 105) {
          target = enemy;
          break;
        }
      }
      if (target) projectileSystem.spawn({
        sourceId: hero.id, targetId: target.id,
        position: { x: target.position.x, y: target.position.y - 180 },
        damage: hero.damage * .42, damageType: "physical", speed: 520,
        color: "#fde68a", projectileType: "arrow-rain",
      });
      rain.strikesRemaining -= 1;
    }
    if (rain.remaining === 0 || rain.strikesRemaining === 0) hero.rainOfArrows = null;
  }
}

export default HeroCombatSystem;
