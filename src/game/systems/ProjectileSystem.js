import { applyDamage, entityPosition, isAlive, removeInPlace } from './systemUtils.js';

let nextProjectileId = 1;

/** Moves projectiles and applies hits. Rewards are intentionally not handled here. */
export class ProjectileSystem {
  constructor({ hitRadius = 4 } = {}) {
    this.hitRadius = hitRadius;
    this.projectiles = [];
    this.events = [];
  }

  spawn(projectile) {
    const position = entityPosition(projectile);
    const created = {
      id: `projectile-${nextProjectileId++}`,
      ...projectile,
      position: { ...position },
      spent: false,
    };
    this.projectiles.push(created);
    this.events.push({
      type: 'shot',
      sourceId: created.sourceId,
      targetId: created.targetId,
      position: { ...created.position },
    });
    return created;
  }

  update(deltaSeconds, enemies, statusEffectSystem) {
    if (deltaSeconds < 0) throw new RangeError('deltaSeconds must not be negative');
    const enemiesById = new Map(enemies.map((enemy) => [enemy.id, enemy]));

    for (const projectile of this.projectiles) {
      const target = enemiesById.get(projectile.targetId);
      if (!isAlive(target)) {
        projectile.spent = true;
        continue;
      }

      const targetPosition = entityPosition(target);
      const projectilePosition = entityPosition(projectile);
      const dx = targetPosition.x - projectilePosition.x;
      const dy = targetPosition.y - projectilePosition.y;
      const distance = Math.hypot(dx, dy);
      const travel = projectile.speed * deltaSeconds;
      if (distance <= travel + this.hitRadius) {
        projectile.position = { ...targetPosition };
        const victims = projectile.areaRadius > 0
          ? enemies.filter((enemy) =>
            isAlive(enemy) && Math.sqrt(
              (entityPosition(enemy).x - targetPosition.x) ** 2
              + (entityPosition(enemy).y - targetPosition.y) ** 2,
            ) <= projectile.areaRadius)
          : [target];
        for (const victim of victims) {
          const healthBefore = victim.health;
          const healthAfter = applyDamage(victim, projectile.damage, projectile.damageType);
          this.events.push({
            type: 'hit',
            sourceId: projectile.sourceId,
            targetId: victim.id,
            position: { ...entityPosition(victim) },
            damage: healthBefore - healthAfter,
            areaRadius: projectile.areaRadius ?? 0,
          });
          if (healthAfter === 0) {
            this.events.push({
              type: 'enemy-death',
              sourceId: projectile.sourceId,
              targetId: victim.id,
              position: { ...entityPosition(victim) },
            });
          } else if (projectile.statusEffect && statusEffectSystem) {
            statusEffectSystem.apply(victim, projectile.statusEffect);
          }
        }
        projectile.spent = true;
      } else if (distance > 0) {
        projectile.position.x += (dx / distance) * travel;
        projectile.position.y += (dy / distance) * travel;
      }
    }

    removeInPlace(this.projectiles, (projectile) =>
      projectile.spent || !enemiesById.has(projectile.targetId));
    return this.projectiles;
  }

  drainEvents() {
    return this.events.splice(0, this.events.length);
  }
}

export default ProjectileSystem;
