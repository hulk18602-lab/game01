import { isAlive } from "./systemUtils.js";

/** Applies innate enemy traits such as regeneration and boss phase transitions. */
export class EnemyAbilitySystem {
  constructor() {
    this.events = [];
  }

  update(deltaSeconds, enemies) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("deltaSeconds must not be negative");
    }
    for (const enemy of enemies) {
      if (!isAlive(enemy)) continue;
      if (enemy.regeneration > 0) enemy.heal(enemy.regeneration * deltaSeconds);
      if (!enemy.boss) continue;
      const ratio = enemy.health / enemy.maxHealth;
      const nextPhase = ratio <= 1 / 3 ? 3 : ratio <= 2 / 3 ? 2 : 1;
      if (nextPhase !== enemy.bossPhase) {
        enemy.bossPhase = nextPhase;
        enemy.abilitySpeedMultiplier = nextPhase === 3 ? 1.42 : nextPhase === 2 ? 1.18 : 1;
        this.events.push({
          type: "boss-phase",
          targetId: enemy.id,
          phase: nextPhase,
          position: { ...enemy.position },
        });
      }
    }
  }

  drainEvents() {
    return this.events.splice(0, this.events.length);
  }
}

export default EnemyAbilitySystem;
