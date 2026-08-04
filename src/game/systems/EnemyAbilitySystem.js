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
    for (const enemy of enemies) enemy.supportSpeedMultiplier = 1;
    for (const captain of enemies) {
      if (!isAlive(captain) || captain.speedAura <= 1 || captain.auraRadius <= 0) continue;
      for (const ally of enemies) {
        if (ally === captain || !isAlive(ally)) continue;
        if (Math.hypot(ally.position.x - captain.position.x, ally.position.y - captain.position.y) <= captain.auraRadius) {
          ally.supportSpeedMultiplier = Math.max(ally.supportSpeedMultiplier, captain.speedAura);
        }
      }
    }
    for (const enemy of enemies) {
      if (!isAlive(enemy)) continue;
      if (enemy.regeneration > 0) enemy.heal(enemy.regeneration * deltaSeconds);
      if (!enemy.enraged
        && enemy.enrageThreshold > 0
        && enemy.health / enemy.maxHealth < enemy.enrageThreshold) {
        enemy.enraged = true;
        enemy.abilitySpeedMultiplier = enemy.enrageSpeed;
        this.events.push({ type: "enemy-enrage", targetId: enemy.id, position: { ...enemy.position } });
      }
      if (enemy.healAmount > 0 && enemy.healCooldown > 0) {
        enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - deltaSeconds);
        if (enemy.abilityCooldown === 0) {
          const target = enemies
            .filter((ally) => isAlive(ally)
              && ally.health < ally.maxHealth
              && Math.hypot(ally.position.x - enemy.position.x, ally.position.y - enemy.position.y) <= enemy.healRadius)
            .sort((left, right) => left.health / left.maxHealth - right.health / right.maxHealth)[0];
          if (target) {
            target.heal(enemy.healAmount);
            enemy.abilityCooldown = enemy.healCooldown;
            this.events.push({ type: "enemy-heal", sourceId: enemy.id, targetId: target.id, position: { ...target.position } });
          }
        }
      }
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
