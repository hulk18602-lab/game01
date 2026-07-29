import enemyTypes from '../content/enemies/enemyTypes.js';

let nextEnemyId = 1;

export class Enemy {
  constructor(type, overrides = {}) {
    const definition = typeof type === 'string' ? enemyTypes[type] : type;
    if (!definition) throw new Error(`Unknown enemy type: ${type}`);

    this.id = overrides.id ?? `enemy-${nextEnemyId++}`;
    this.type = definition.id;
    this.maxHealth = overrides.health ?? definition.health;
    this.health = this.maxHealth;
    this.speed = overrides.speed ?? definition.speed;
    this.reward = overrides.reward ?? definition.reward;
    this.baseDamage = overrides.baseDamage ?? definition.baseDamage;
    this.progress = clampProgress(overrides.progress ?? 0);
    this.position = { ...(overrides.position ?? { x: 0, y: 0 }) };
    this.speedMultiplier = 1;
    this.dead = false;
    this.reachedBase = false;
    this.pendingRemoval = false;
    this.removalReason = null;
  }

  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Damage must be a non-negative number');
    if (!this.isAlive) return this.health;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.dead = true;
      this.markForRemoval('destroyed');
    }
    return this.health;
  }

  markForRemoval(reason = 'removed') {
    if (this.pendingRemoval) return;
    this.pendingRemoval = true;
    this.removalReason = reason;
  }

  get isAlive() {
    return this.health > 0 && !this.dead && !this.pendingRemoval && !this.reachedBase;
  }
}

function clampProgress(value) {
  if (!Number.isFinite(value)) throw new TypeError('Progress must be a finite number');
  return Math.min(1, Math.max(0, value));
}

export default Enemy;
