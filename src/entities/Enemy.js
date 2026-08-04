import enemyTypes from '../content/enemies/enemyTypes.js';

let nextEnemyId = 1;

export class Enemy {
  constructor(type, overrides = {}) {
    const definition = typeof type === 'string' ? enemyTypes[type] : type;
    if (!definition) throw new Error(`Unknown enemy type: ${type}`);

    this.id = overrides.id ?? `enemy-${nextEnemyId++}`;
    this.type = definition.id;
    this.name = definition.name ?? definition.id;
    this.shortLabel = definition.shortLabel ?? definition.id.slice(0, 1).toUpperCase();
    this.color = definition.color ?? "#fb7185";
    this.radius = definition.radius ?? 12;
    this.maxHealth = overrides.health ?? definition.health;
    this.health = Math.min(this.maxHealth, overrides.currentHealth ?? this.maxHealth);
    this.maxShield = overrides.maxShield ?? definition.shield ?? 0;
    this.shield = Math.min(this.maxShield, overrides.shield ?? this.maxShield);
    this.splitInto = overrides.splitInto ?? definition.splitInto ?? null;
    this.splitCount = overrides.splitCount ?? definition.splitCount ?? 0;
    this.splitGeneration = overrides.splitGeneration ?? 0;
    this.splitProcessed = false;
    this.speed = overrides.speed ?? definition.speed;
    this.reward = overrides.reward ?? definition.reward;
    this.baseDamage = overrides.baseDamage ?? definition.baseDamage;
    this.armor = overrides.armor ?? definition.armor ?? 0;
    this.regeneration = overrides.regeneration ?? definition.regeneration ?? 0;
    this.coldResistance = overrides.coldResistance ?? definition.coldResistance ?? 0;
    this.enrageThreshold = overrides.enrageThreshold ?? definition.enrageThreshold ?? 0;
    this.enrageSpeed = overrides.enrageSpeed ?? definition.enrageSpeed ?? 1;
    this.enraged = overrides.enraged ?? false;
    this.speedAura = overrides.speedAura ?? definition.speedAura ?? 1;
    this.auraRadius = overrides.auraRadius ?? definition.auraRadius ?? 0;
    this.healAmount = overrides.healAmount ?? definition.healAmount ?? 0;
    this.healCooldown = overrides.healCooldown ?? definition.healCooldown ?? 0;
    this.healRadius = overrides.healRadius ?? definition.healRadius ?? 0;
    this.abilityCooldown = overrides.abilityCooldown ?? definition.summonDelay ?? 0;
    this.phaseInterval = overrides.phaseInterval ?? definition.phaseInterval ?? 0;
    this.phaseDuration = overrides.phaseDuration ?? definition.phaseDuration ?? 0;
    this.phaseCooldown = overrides.phaseCooldown ?? this.phaseInterval;
    this.phaseRemaining = overrides.phaseRemaining ?? 0;
    this.targetable = overrides.targetable ?? true;
    this.summonInto = overrides.summonInto ?? definition.summonInto ?? null;
    this.summonCount = overrides.summonCount ?? definition.summonCount ?? 0;
    this.summonDelay = overrides.summonDelay ?? definition.summonDelay ?? 0;
    this.summonThreshold = overrides.summonThreshold ?? definition.summonThreshold ?? 1;
    this.summonProcessed = overrides.summonProcessed ?? false;
    this.minion = overrides.minion ?? definition.minion ?? false;
    this.towerDebuff = overrides.towerDebuff ?? definition.towerDebuff ?? 1;
    this.debuffDuration = overrides.debuffDuration ?? definition.debuffDuration ?? 0;
    this.debuffCooldown = overrides.debuffCooldown ?? definition.debuffCooldown ?? 0;
    this.debuffRadius = overrides.debuffRadius ?? definition.debuffRadius ?? 0;
    this.debuffTimer = overrides.debuffTimer ?? 0;
    this.huntersMarked = false;
    this.huntersMarkTowerBonus = 0;
    this.boss = overrides.boss ?? definition.boss ?? false;
    this.elite = overrides.elite ?? definition.elite ?? false;
    this.bossPhase = overrides.bossPhase ?? 1;
    this.progress = clampProgress(overrides.progress ?? 0);
    this.position = { ...(overrides.position ?? { x: 0, y: 0 }) };
    this.speedMultiplier = 1;
    this.abilitySpeedMultiplier = 1;
    this.supportSpeedMultiplier = 1;
    this.statusEffects = [...(overrides.statusEffects ?? [])];
    this.damageContributors = new Map(overrides.damageContributors ?? []);
    this.dead = false;
    this.reachedBase = false;
    this.pendingRemoval = false;
    this.removalReason = null;
  }

  takeDamage(amount, damageType = 'true') {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Damage must be a non-negative number');
    if (!this.isAlive) return this.health;
    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
      if (remaining <= 0) return this.health;
    }
    const armorEffect = damageType === 'cold'
      ? this.coldResistance
      : damageType === 'physical'
      ? this.armor
      : damageType === 'explosive'
        ? this.armor * 0.35
        : 0;
    const applied = remaining * Math.max(0, 1 - armorEffect);
    this.health = Math.max(0, this.health - applied);
    if (this.health === 0) {
      this.dead = true;
      this.markForRemoval('destroyed');
    }
    return this.health;
  }

  heal(amount) {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Healing must be a non-negative number');
    if (!this.isAlive) return this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
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
