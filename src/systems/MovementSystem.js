export class MovementSystem {
  constructor(path) {
    if (!path || !(path.length > 0) || typeof path.getPointAt !== 'function') {
      throw new TypeError('MovementSystem requires a Path');
    }
    this.path = path;
  }

  /** Moves entities only. Reaching the base does not implicitly remove an enemy. */
  update(enemies, deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('Delta time must be non-negative');
    const reachedBase = [];
    for (const enemy of enemies) {
      if (enemy.pendingRemoval || enemy.dead || enemy.reachedBase) continue;
      const effectiveSpeed = enemy.speed
        * (enemy.speedMultiplier ?? 1)
        * (enemy.abilitySpeedMultiplier ?? 1);
      enemy.progress = Math.min(1, enemy.progress + (effectiveSpeed * deltaSeconds) / this.path.length);
      enemy.position = this.path.getPointAt(enemy.progress);
      if (enemy.progress === 1) {
        enemy.reachedBase = true;
        reachedBase.push(enemy);
      }
    }
    return reachedBase;
  }

  /** Base damage/lives can be handled before the caller explicitly removes these. */
  handleBaseReached(enemies, onBaseReached = () => {}) {
    const handled = [];
    for (const enemy of enemies) {
      if (!enemy.reachedBase || enemy.pendingRemoval) continue;
      onBaseReached(enemy);
      enemy.markForRemoval('reached-base');
      handled.push(enemy);
    }
    return handled;
  }

  removeMarked(enemies, onRemove = () => {}) {
    return enemies.filter((enemy) => {
      if (!enemy.pendingRemoval) return true;
      onRemove(enemy);
      return false;
    });
  }
}

export default MovementSystem;
