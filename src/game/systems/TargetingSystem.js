import { distanceSquared, isAlive } from './systemUtils.js';

/** Selects targets in one pass per tower without allocating candidate arrays. */
export class TargetingSystem {
  update(towers, enemies) {
    for (const tower of towers) {
      let current = null;
      for (const enemy of enemies) {
        if (enemy.id === tower.targetId) {
          current = enemy;
          break;
        }
      }
      tower.targetId = this.isValidTarget(tower, current)
        ? current.id
        : (this.selectTarget(tower, enemies)?.id ?? null);
    }
  }

  isValidTarget(tower, enemy) {
    return isAlive(enemy) && enemy.targetable !== false && distanceSquared(tower, enemy) <= tower.range ** 2;
  }

  selectTarget(tower, enemies) {
    const priority = tower.targeting ?? 'first';
    let selected = null;
    let selectedMetric = priority === 'strongest' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      if (!this.isValidTarget(tower, enemy)) continue;
      if (priority === 'nearest') {
        const metric = distanceSquared(tower, enemy);
        if (metric < selectedMetric) {
          selected = enemy;
          selectedMetric = metric;
        }
      } else if (priority === 'strongest') {
        if (enemy.health > selectedMetric) {
          selected = enemy;
          selectedMetric = enemy.health;
        }
      } else {
        const metric = -(enemy.progress ?? 0);
        if (metric < selectedMetric) {
          selected = enemy;
          selectedMetric = metric;
        }
      }
    }
    return selected;
  }
}

export default TargetingSystem;
