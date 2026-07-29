import { removeInPlace } from './systemUtils.js';

/**
 * The only system that converts enemy death into currency/rewards.
 * `_deathProcessed` makes cleanup idempotent even when removal is deferred.
 */
export class CleanupSystem {
  constructor({ onReward } = {}) {
    this.onReward = onReward ?? (() => {});
  }

  update(enemies, player) {
    for (const enemy of enemies) {
      const destroyed = enemy.removalReason === 'destroyed'
        || (enemy.health <= 0 && enemy.removalReason !== 'reached-base');
      if (destroyed) {
        enemy.dead = true;
        enemy.pendingRemoval = true;
        enemy.removalReason = 'destroyed';
        if (!enemy._deathProcessed) {
          enemy._deathProcessed = true;
          const reward = enemy.reward ?? 0;
          if (player) player.currency = (player.currency ?? 0) + reward;
          this.onReward(reward, enemy, player);
        }
      }
    }
    removeInPlace(enemies, (enemy) => enemy.pendingRemoval === true);
    return enemies;
  }
}

export default CleanupSystem;
