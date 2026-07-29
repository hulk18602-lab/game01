import { applyDamage, isAlive } from './systemUtils.js';

/** Owns status lifetime and derived enemy properties. It never grants rewards. */
export class StatusEffectSystem {
  apply(enemy, effect) {
    enemy.statusEffects ??= [];
    const existing = enemy.statusEffects.find((item) => item.type === effect.type);
    if (existing) Object.assign(existing, effect, { remaining: effect.duration });
    else enemy.statusEffects.push({ ...effect, remaining: effect.duration });
    this.refreshDerivedProperties(enemy);
  }

  update(deltaSeconds, enemies) {
    if (deltaSeconds < 0) throw new RangeError('deltaSeconds must not be negative');
    for (const enemy of enemies) {
      if (!isAlive(enemy)) continue;
      enemy.statusEffects ??= [];
      for (const effect of enemy.statusEffects) {
        if (effect.type === 'damageOverTime') {
          applyDamage(enemy, effect.damagePerSecond * deltaSeconds);
        }
        effect.remaining -= deltaSeconds;
      }
      enemy.statusEffects = enemy.statusEffects.filter((effect) => effect.remaining > 0);
      this.refreshDerivedProperties(enemy);
    }
  }

  refreshDerivedProperties(enemy) {
    const slows = (enemy.statusEffects ?? [])
      .filter((effect) => effect.type === 'slow')
      .map((effect) => effect.multiplier);
    enemy.speedMultiplier = slows.length ? Math.min(...slows) : 1;
  }
}

export default StatusEffectSystem;
