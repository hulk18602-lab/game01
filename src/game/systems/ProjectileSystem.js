import { distanceSquared, isAlive, removeInPlace } from './systemUtils.js';

let nextProjectileId = 1;

/** Moves projectiles and applies hits. Rewards are intentionally not handled here. */
export class ProjectileSystem {
  constructor({ hitRadius = 4 } = {}) {
    this.hitRadius = hitRadius;
    this.projectiles = [];
  }

  spawn(projectile) {
    const created = { id: `projectile-${nextProjectileId++}`, ...projectile, spent: false };
    this.projectiles.push(created);
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

      const dx = (target.x ?? 0) - (projectile.x ?? 0);
      const dy = (target.y ?? 0) - (projectile.y ?? 0);
      const distance = Math.hypot(dx, dy);
      const travel = projectile.speed * deltaSeconds;
      if (distance <= travel + this.hitRadius) {
        projectile.x = target.x;
        projectile.y = target.y;
        target.health = Math.max(0, target.health - projectile.damage);
        if (projectile.statusEffect && statusEffectSystem) {
          statusEffectSystem.apply(target, projectile.statusEffect);
        }
        projectile.spent = true;
      } else if (distance > 0) {
        projectile.x += (dx / distance) * travel;
        projectile.y += (dy / distance) * travel;
      }
    }

    removeInPlace(this.projectiles, (projectile) =>
      projectile.spent || !enemiesById.has(projectile.targetId));
    return this.projectiles;
  }
}

export default ProjectileSystem;
