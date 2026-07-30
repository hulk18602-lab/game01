import type { Position } from "../game/types.js";
import {
  createDefaultHeroSkills,
  heroSkillDefinitions,
  heroSkillIds,
  MAX_HERO_LEVEL,
  type HeroSkillId,
  type HeroSkillLevels,
  xpRequiredForHeroLevel,
} from "../content/heroes/heroSkills.js";

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
  readonly skillPoints?: number;
  readonly skills?: Readonly<Partial<HeroSkillLevels>>;
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
  skillPoints: number;
  readonly skills: HeroSkillLevels;
  readonly maximumLevel = MAX_HERO_LEVEL;
  readonly projectileSpeed: number;
  readonly damageType = "physical";
  readonly projectileType = "arrow";
  readonly projectileColor = "#f5d68a";
  chainCount = 1;
  chainFalloff = 0.86;
  chainRange = 120;
  readonly radius = 17;
  readonly targeting = "nearest";
  heading = -Math.PI / 2;
  moving = false;
  shotAnimation = 0;
  skillFeedback = 0;

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
    this.level = Math.min(MAX_HERO_LEVEL, Math.max(1, Math.floor(options.level ?? 1)));
    this.xp = this.level >= MAX_HERO_LEVEL ? 0 : Math.max(0, Math.floor(options.xp ?? 0));
    this.skills = createDefaultHeroSkills();
    for (const skillId of heroSkillIds) {
      const level = options.skills?.[skillId];
      if (Number.isInteger(level)) {
        const unlockedLevelCount = heroSkillDefinitions[skillId].levels
          .filter((skillLevel) => skillLevel.requiredHeroLevel <= this.level)
          .length;
        this.skills[skillId] = Math.max(
          0,
          Math.min(unlockedLevelCount, Number(level)),
        );
      }
    }
    const spentSkillPoints = heroSkillIds.reduce(
      (total, skillId) => total + this.skills[skillId],
      0,
    );
    const availableSkillPoints = Math.max(0, this.level - 1 - spentSkillPoints);
    this.skillPoints = Math.min(
      availableSkillPoints,
      Math.max(0, Math.floor(options.skillPoints ?? availableSkillPoints)),
    );
    this.range = 0;
    this.damage = 0;
    this.fireRate = 0;
    this.xpToNextLevel = 0;
    this.#applyLevelStats();
  }

  gainXp(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError("Hero XP must be non-negative");
    if (this.level >= MAX_HERO_LEVEL) return 0;
    this.xp += Math.floor(amount);
    let levelsGained = 0;
    while (this.level < MAX_HERO_LEVEL && this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level += 1;
      this.skillPoints += 1;
      levelsGained += 1;
      this.#applyLevelStats();
    }
    if (this.level >= MAX_HERO_LEVEL) this.xp = 0;
    return levelsGained;
  }

  skillUpgradeError(skillId: HeroSkillId): string | null {
    const definition = heroSkillDefinitions[skillId];
    const current = this.skills[skillId];
    const next = definition.levels[current];
    if (!next) return `${definition.name} is already at maximum level.`;
    if (this.skillPoints < 1) return "Earn a hero level to gain another skill point.";
    if (this.level < next.requiredHeroLevel) {
      return `${definition.name} level ${current + 1} requires hero level ${next.requiredHeroLevel}.`;
    }
    return null;
  }

  upgradeSkill(skillId: HeroSkillId): void {
    const error = this.skillUpgradeError(skillId);
    if (error) throw new Error(error);
    this.skills[skillId] += 1;
    this.skillPoints -= 1;
    this.skillFeedback = 1;
    this.#applyLevelStats();
  }

  tickAnimation(deltaSeconds: number): void {
    this.shotAnimation = Math.max(0, this.shotAnimation - deltaSeconds * 5);
    this.skillFeedback = Math.max(0, this.skillFeedback - deltaSeconds * 1.8);
  }

  get auraRadius(): number {
    return heroSkillDefinitions.rallyAura.levels[this.skills.rallyAura - 1]?.auraRadius ?? 0;
  }

  get auraDamageBonus(): number {
    return heroSkillDefinitions.rallyAura.levels[this.skills.rallyAura - 1]
      ?.auraDamageBonus ?? 0;
  }

  get auraFireRateBonus(): number {
    return heroSkillDefinitions.rallyAura.levels[this.skills.rallyAura - 1]
      ?.auraFireRateBonus ?? 0;
  }

  #applyLevelStats(): void {
    const upgrades = this.level - 1;
    this.damage = Math.round(this.#baseDamage * (1 + upgrades * 0.18));
    const keenEye = heroSkillDefinitions.keenEye.levels[this.skills.keenEye - 1];
    const rapidVolley = heroSkillDefinitions.rapidVolley.levels[this.skills.rapidVolley - 1];
    const piercingArrow = heroSkillDefinitions.piercingArrow.levels[this.skills.piercingArrow - 1];
    this.range = this.#baseRange + upgrades * 8 + (keenEye?.rangeBonus ?? 0);
    this.fireRate = Number((
      (this.#baseFireRate + upgrades * 0.05) * (1 + (rapidVolley?.fireRateBonus ?? 0))
    ).toFixed(2));
    this.chainCount = piercingArrow?.projectileTargets ?? 1;
    this.xpToNextLevel = xpRequiredForHeroLevel(this.level, this.#baseXpToNextLevel);
  }
}

export default HeroEntity;
