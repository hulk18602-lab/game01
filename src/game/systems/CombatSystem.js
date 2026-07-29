import { isAlive } from './systemUtils.js';

/** Turns a valid target selection into projectile spawn requests. */
export class CombatSystem {
  update(deltaSeconds, towers, enemies, projectileSystem) {
    if (deltaSeconds < 0) throw new RangeError('deltaSeconds must not be negative');
    const enemiesById = new Map(enemies.map((enemy) => [enemy.id, enemy]));

    for (const tower of towers) {
      tower.cooldown = Math.max(0, (tower.cooldown ?? 0) - deltaSeconds);
      const target = enemiesById.get(tower.targetId);
      if (tower.cooldown > 0 || !isAlive(target)) continue;

      projectileSystem.spawn({
        sourceId: tower.id,
        targetId: target.id,
        x: tower.position.x,
        y: tower.position.y,
        damage: tower.damage,
        speed: tower.projectileSpeed,
        statusEffect: tower.statusEffect,
      });
      tower.cooldown = 1 / tower.fireRate;
    }
  }
}

export default CombatSystem;
