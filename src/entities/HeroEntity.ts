import type { Position } from "../game/types.js";

export interface HeroDefinition {
  readonly id: string;
  readonly name: string;
  readonly speed: number;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly xpToNextLevel: number;
}

export interface HeroEntityOptions {
  readonly position: Position;
  readonly moveTarget?: Position | null;
  readonly level?: number;
  readonly xp?: number;
}

/** A mobile combatant. It deliberately does not implement or extend a tower entity. */
export class HeroEntity {
  readonly kind = "hero";
  readonly id: string;
  readonly name: string;
  position: { x: number; y: number };
  moveTarget: { x: number; y: number } | null;
  readonly speed: number;
  range: number;
  damage: number;
  fireRate: number;
  cooldown = 0;
  targetId: string | null = null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  readonly projectileSpeed: number;
  readonly damageType = "physical";
  readonly projectileType = "arrow";
  readonly projectileColor = "#f5d68a";
  readonly radius = 17;
  readonly targeting = "nearest";
  heading = -Math.PI / 2;
  moving = false;
  shotAnimation = 0;

  readonly #baseRange: number;
  readonly #baseDamage: number;
  readonly #baseFireRate: number;
  readonly #baseXpToNextLevel: number;

  constructor(definition: HeroDefinition, options: HeroEntityOptions) {
    if (!Number.isFinite(options.position.x) || !Number.isFinite(options.position.y)) {
      throw new TypeError("Hero position must be finite");
    }
    this.id = definition.id;
    this.name = definition.name;
    this.position = { ...options.position };
    this.moveTarget = options.moveTarget ? { ...options.moveTarget } : null;
    this.speed = definition.speed;
    this.projectileSpeed = definition.projectileSpeed;
    this.#baseRange = definition.range;
    this.#baseDamage = definition.damage;
    this.#baseFireRate = definition.fireRate;
    this.#baseXpToNextLevel = definition.xpToNextLevel;
    this.level = Math.max(1, Math.floor(options.level ?? 1));
    this.xp = Math.max(0, Math.floor(options.xp ?? 0));
    this.range = 0;
    this.damage = 0;
    this.fireRate = 0;
    this.xpToNextLevel = 0;
    this.#applyLevelStats();
  }

  gainXp(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError("Hero XP must be non-negative");
    this.xp += Math.floor(amount);
    let levelsGained = 0;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level += 1;
      levelsGained += 1;
      this.#applyLevelStats();
    }
    return levelsGained;
  }

  tickAnimation(deltaSeconds: number): void {
    this.shotAnimation = Math.max(0, this.shotAnimation - deltaSeconds * 5);
  }

  #applyLevelStats(): void {
    const upgrades = this.level - 1;
    this.damage = Math.round(this.#baseDamage * (1 + upgrades * 0.18));
    this.range = this.#baseRange + upgrades * 8;
    this.fireRate = Number((this.#baseFireRate + upgrades * 0.05).toFixed(2));
    this.xpToNextLevel = Math.round(this.#baseXpToNextLevel * (1.35 ** upgrades));
  }
}

export default HeroEntity;
