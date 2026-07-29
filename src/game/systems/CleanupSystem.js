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
      if (enemy.health > 0 || enemy._deathProcessed) continue;
      enemy.dead = true;
      enemy._deathProcessed = true;
      const reward = enemy.reward ?? 0;
      if (player) player.currency = (player.currency ?? 0) + reward;
      this.onReward(reward, enemy, player);
    }
    removeInPlace(enemies, (enemy) => enemy._deathProcessed);
    return enemies;
  }
}

export default CleanupSystem;
