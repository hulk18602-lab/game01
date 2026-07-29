import { distanceSquared, isAlive } from './systemUtils.js';

/** Selects targets, but deliberately performs no attacks or damage. */
export class TargetingSystem {
  update(towers, enemies) {
    for (const tower of towers) {
      const current = enemies.find((enemy) => enemy.id === tower.targetId);
      tower.targetId = this.isValidTarget(tower, current)
        ? current.id
        : (this.selectTarget(tower, enemies)?.id ?? null);
    }
  }

  isValidTarget(tower, enemy) {
    return isAlive(enemy) && distanceSquared(tower, enemy) <= tower.range ** 2;
  }

  selectTarget(tower, enemies) {
    const candidates = enemies.filter((enemy) => this.isValidTarget(tower, enemy));
    const priority = tower.targeting ?? 'first';

    if (priority === 'nearest') {
      candidates.sort((a, b) => distanceSquared(tower, a) - distanceSquared(tower, b));
    } else if (priority === 'strongest') {
      candidates.sort((a, b) => b.health - a.health);
    } else {
      // Path progress is optional so simple enemies remain valid inputs.
      candidates.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    }
    return candidates[0] ?? null;
  }
}

export default TargetingSystem;
