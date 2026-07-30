import { isAlive } from "./systemUtils.js";

/** Applies innate enemy traits such as regeneration and boss phase transitions. */
export class EnemyAbilitySystem {
  constructor({ createEnemy } = {}) {
    this.events = [];
    this.createEnemy = createEnemy ?? null;
  }

  spawnOnDeath(enemies) {
    if (!this.createEnemy) return [];
    const spawned = [];
    for (const enemy of enemies) {
      const destroyed = enemy.health <= 0 || enemy.removalReason === "destroyed";
      if (!destroyed
        || enemy.splitProcessed
        || !enemy.splitInto
        || enemy.splitCount <= 0
        || enemy.splitGeneration > 0) continue;
      enemy.splitProcessed = true;
      for (let index = 0; index < enemy.splitCount; index += 1) {
        const angle = index * Math.PI * 2 / enemy.splitCount;
        spawned.push(this.createEnemy(enemy.splitInto, {
          progress: enemy.progress,
          position: {
            x: enemy.position.x + Math.cos(angle) * 6,
            y: enemy.position.y + Math.sin(angle) * 6,
          },
          splitGeneration: enemy.splitGeneration + 1,
        }));
      }
    }
    return spawned;
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
