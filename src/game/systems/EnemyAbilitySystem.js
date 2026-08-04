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

  update(deltaSeconds, enemies, towers = []) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("deltaSeconds must not be negative");
    }
    for (const tower of towers) {
      tower.debuffRemaining = Math.max(0, (tower.debuffRemaining ?? 0) - deltaSeconds);
      tower.debuffMultiplier = tower.debuffRemaining > 0 ? (tower.debuffMultiplier ?? 1) : 1;
      tower.effectiveFireRate *= tower.debuffMultiplier;
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
    const summoned = [];
    for (const enemy of enemies) {
      if (!isAlive(enemy)) continue;
      if (enemy.regeneration > 0) enemy.heal(enemy.regeneration * deltaSeconds);
      if (enemy.phaseInterval > 0) {
        if (enemy.phaseRemaining > 0) {
          enemy.phaseRemaining = Math.max(0, enemy.phaseRemaining - deltaSeconds);
          enemy.targetable = enemy.phaseRemaining === 0;
          if (enemy.targetable) enemy.phaseCooldown = enemy.phaseInterval;
        } else {
          enemy.phaseCooldown = Math.max(0, enemy.phaseCooldown - deltaSeconds);
          if (enemy.phaseCooldown === 0) {
            enemy.phaseRemaining = Math.min(1.2, enemy.phaseDuration);
            enemy.targetable = false;
          }
        }
      }
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
          let target = null;
          let lowestRatio = 1;
          for (const ally of enemies) {
            const ratio = ally.health / ally.maxHealth;
            if (!isAlive(ally) || ratio >= lowestRatio) continue;
            if (Math.hypot(ally.position.x - enemy.position.x, ally.position.y - enemy.position.y) > enemy.healRadius) continue;
            target = ally;
            lowestRatio = ratio;
          }
          if (target) {
            target.heal(enemy.healAmount);
            enemy.abilityCooldown = enemy.healCooldown;
            this.events.push({ type: "enemy-heal", sourceId: enemy.id, targetId: target.id, position: { ...target.position } });
          }
        }
      }
      if (!enemy.summonProcessed && enemy.summonInto && enemy.summonCount > 0) {
        enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - deltaSeconds);
        const thresholdReached = enemy.health / enemy.maxHealth <= enemy.summonThreshold;
        if (enemy.abilityCooldown === 0 && thresholdReached && this.createEnemy) {
          enemy.summonProcessed = true;
          for (let index = 0; index < enemy.summonCount; index += 1) {
            const angle = index * Math.PI * 2 / enemy.summonCount;
            summoned.push(this.createEnemy(enemy.summonInto, {
              progress: enemy.progress,
              position: {
                x: enemy.position.x + Math.cos(angle) * (10 + index % 2 * 4),
                y: enemy.position.y + Math.sin(angle) * (10 + index % 2 * 4),
              },
            }));
          }
          this.events.push({ type: "enemy-summon", sourceId: enemy.id, targetId: enemy.id, position: { ...enemy.position } });
        }
      }
      if (enemy.towerDebuff < 1 && enemy.debuffCooldown > 0) {
        enemy.debuffTimer = Math.max(0, enemy.debuffTimer - deltaSeconds);
        if (enemy.debuffTimer === 0) {
          let targetTower = null;
          let nearest = enemy.debuffRadius ** 2;
          for (const tower of towers) {
            const dx = tower.position.x - enemy.position.x;
            const dy = tower.position.y - enemy.position.y;
            const distance = dx * dx + dy * dy;
            if (distance <= nearest) { targetTower = tower; nearest = distance; }
          }
          if (targetTower) {
            targetTower.debuffMultiplier = enemy.towerDebuff;
            targetTower.debuffRemaining = Math.max(targetTower.debuffRemaining ?? 0, enemy.debuffDuration);
            enemy.debuffTimer = enemy.debuffCooldown;
          }
        }
      }
      if (!enemy.boss) continue;
      const ratio = enemy.health / enemy.maxHealth;
      const nextPhase = ratio <= 1 / 3 ? 3 : ratio <= 2 / 3 ? 2 : 1;
      if (nextPhase !== enemy.bossPhase) {
        enemy.bossPhase = nextPhase;
        const phaseSpeed = nextPhase === 3 ? 1.42 : nextPhase === 2 ? 1.18 : 1;
        enemy.abilitySpeedMultiplier = Math.max(enemy.enraged ? enemy.enrageSpeed : 1, phaseSpeed);
        this.events.push({
          type: "boss-phase",
          targetId: enemy.id,
          phase: nextPhase,
          position: { ...enemy.position },
        });
      }
    }
    if (summoned.length > 0) enemies.push(...summoned);
  }

  drainEvents() {
    return this.events.splice(0, this.events.length);
  }
}

export default EnemyAbilitySystem;
