import TargetingSystem from "./TargetingSystem.js";

/** Hero fire timing is logical (windup/release/recovery), never coupled to sprite frames. */
export class HeroCombatSystem {
  constructor() {
    this.targeting = new TargetingSystem();
  }

  update(deltaSeconds, hero, enemies, projectileSystem) {
    if (!hero) return;
    if (deltaSeconds < 0) throw new RangeError("Hero combat delta must not be negative");
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
      projectileSystem.spawn({
        sourceId: hero.id,
        targetId: target.id,
        position: { ...hero.position },
        damage: hero.damage,
        damageType: hero.damageType,
        speed: hero.projectileSpeed,
        chainCount: hero.chainCount,
        chainFalloff: hero.chainFalloff,
        chainRange: hero.chainRange,
        color: hero.projectileColor,
        projectileType: hero.projectileType,
      });
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
}

export default HeroCombatSystem;
