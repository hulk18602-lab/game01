import { applyDamage, entityPosition, isAlive } from './systemUtils.js';

let nextProjectileId = 1;

const createProjectile = () => ({
  id: '',
  sourceId: '',
  targetId: '',
  position: { x: 0, y: 0 },
  damage: 0,
  damageType: 'physical',
  speed: 0,
  areaRadius: 0,
  chainCount: 1,
  chainFalloff: 1,
  chainRange: 0,
  color: '#f8fafc',
  projectileType: 'orb',
  rotation: 0,
  statusEffect: null,
  spent: true,
});

/** Moves projectiles and applies hits. Active objects are recycled through a bounded pool. */
export class ProjectileSystem {
  constructor({ hitRadius = 4, poolCapacity = 256 } = {}) {
    this.hitRadius = hitRadius;
    this.poolCapacity = poolCapacity;
    this.projectiles = [];
    this.events = [];
    this.pool = Array.from({ length: poolCapacity }, createProjectile);
    this.enemiesById = new Map();
  }

  spawn(projectile) {
    const sourcePosition = entityPosition(projectile);
    const created = this.pool.pop() ?? createProjectile();
    created.id = `projectile-${nextProjectileId++}`;
    created.sourceId = projectile.sourceId;
    created.targetId = projectile.targetId;
    created.position.x = sourcePosition.x;
    created.position.y = sourcePosition.y;
    created.damage = projectile.damage;
    created.damageType = projectile.damageType ?? 'physical';
    created.speed = projectile.speed;
    created.areaRadius = projectile.areaRadius ?? 0;
    created.chainCount = projectile.chainCount ?? 1;
    created.chainFalloff = projectile.chainFalloff ?? 1;
    created.chainRange = projectile.chainRange ?? 0;
    created.color = projectile.color ?? '#f8fafc';
    created.projectileType = projectile.projectileType ?? 'orb';
    created.rotation = 0;
    created.statusEffect = projectile.statusEffect ?? null;
    created.spent = false;
    this.projectiles.push(created);
    this.events.push({
      type: 'shot',
      sourceId: created.sourceId,
      targetId: created.targetId,
      position: { x: created.position.x, y: created.position.y },
      damageType: created.damageType,
    });
    return created;
  }

  update(deltaSeconds, enemies, statusEffectSystem) {
    if (deltaSeconds < 0) throw new RangeError('deltaSeconds must not be negative');
    this.enemiesById.clear();
    for (const enemy of enemies) this.enemiesById.set(enemy.id, enemy);

    for (const projectile of this.projectiles) {
      const target = this.enemiesById.get(projectile.targetId);
      if (!isAlive(target)) {
        projectile.spent = true;
        continue;
      }

      const targetPosition = entityPosition(target);
      const dx = targetPosition.x - projectile.position.x;
      const dy = targetPosition.y - projectile.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) projectile.rotation = Math.atan2(dy, dx);
      const travel = projectile.speed * deltaSeconds;
      if (distance <= travel + this.hitRadius) {
        projectile.position.x = targetPosition.x;
        projectile.position.y = targetPosition.y;
        if (projectile.areaRadius > 0) {
          const radiusSquared = projectile.areaRadius ** 2;
          for (const enemy of enemies) {
            if (!isAlive(enemy)) continue;
            const enemyPosition = entityPosition(enemy);
            const areaX = enemyPosition.x - targetPosition.x;
            const areaY = enemyPosition.y - targetPosition.y;
            if (areaX * areaX + areaY * areaY <= radiusSquared) {
              this.applyHit(projectile, enemy, statusEffectSystem);
            }
          }
        } else {
          this.applyHit(projectile, target, statusEffectSystem);
          if (projectile.chainCount > 1 && projectile.chainRange > 0) {
            this.applyChain(projectile, target, enemies, statusEffectSystem);
          }
        }
        projectile.spent = true;
      } else if (distance > 0) {
        projectile.position.x += (dx / distance) * travel;
        projectile.position.y += (dy / distance) * travel;
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (!projectile.spent && this.enemiesById.has(projectile.targetId)) continue;
      this.projectiles.splice(index, 1);
      projectile.spent = true;
      projectile.statusEffect = null;
      if (this.pool.length < this.poolCapacity) this.pool.push(projectile);
    }
    return this.projectiles;
  }

  applyHit(projectile, victim, statusEffectSystem) {
    this.applyDamageHit(projectile, victim, statusEffectSystem, projectile.damage);
  }

  applyChain(projectile, firstVictim, enemies, statusEffectSystem) {
    const visited = [firstVictim.id];
    let origin = firstVictim;
    let damage = projectile.damage;
    const rangeSquared = projectile.chainRange ** 2;
    for (let bounce = 1; bounce < projectile.chainCount; bounce += 1) {
      let next = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      const originPosition = entityPosition(origin);
      for (const enemy of enemies) {
        if (!isAlive(enemy) || visited.includes(enemy.id)) continue;
        const position = entityPosition(enemy);
        const dx = position.x - originPosition.x;
        const dy = position.y - originPosition.y;
        const distance = dx * dx + dy * dy;
        if (distance <= rangeSquared && distance < nearestDistance) {
          next = enemy;
          nearestDistance = distance;
        }
      }
      if (!next) break;
      damage *= projectile.chainFalloff;
      this.applyDamageHit(projectile, next, statusEffectSystem, damage);
      visited.push(next.id);
      origin = next;
    }
  }

  applyDamageHit(projectile, victim, statusEffectSystem, damage) {
    const healthBefore = victim.health;
    const shieldBefore = victim.shield ?? 0;
    const healthAfter = applyDamage(victim, damage, projectile.damageType);
    const shieldAfter = victim.shield ?? 0;
    const position = entityPosition(victim);
    this.events.push({
      type: 'hit',
      sourceId: projectile.sourceId,
      targetId: victim.id,
      position: { x: position.x, y: position.y },
      damage: healthBefore + shieldBefore - healthAfter - shieldAfter,
      damageType: projectile.damageType,
      areaRadius: projectile.areaRadius,
    });
    if (healthAfter === 0) {
      this.events.push({
        type: 'enemy-death',
        sourceId: projectile.sourceId,
        targetId: victim.id,
        position: { x: position.x, y: position.y },
        damageType: projectile.damageType,
        reward: victim.reward ?? 0,
      });
    } else if (projectile.statusEffect && statusEffectSystem) {
      statusEffectSystem.apply(victim, projectile.statusEffect);
    }
  }

  drainEvents() {
    return this.events.splice(0, this.events.length);
  }
}

export default ProjectileSystem;
