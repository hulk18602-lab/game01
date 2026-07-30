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
          const healthBefore = enemy.health;
          const shieldBefore = enemy.shield ?? 0;
          applyDamage(enemy, effect.damagePerSecond * deltaSeconds, effect.damageType ?? 'cold');
          const applied = healthBefore + shieldBefore - enemy.health - (enemy.shield ?? 0);
          if (applied > 0 && effect.sourceId) {
            enemy.damageContributors ??= new Map();
            enemy.damageContributors.set(
              effect.sourceId,
              (enemy.damageContributors.get(effect.sourceId) ?? 0) + applied,
            );
            enemy.lastDamageSourceId = effect.sourceId;
          }
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
