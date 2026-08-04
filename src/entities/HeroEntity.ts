import type { Position } from "../game/types.js";
import type { HeroDirection } from "../content/visuals/heroVisuals.js";
import {
  createDefaultHeroSkills,
  heroSkillDefinitions,
  heroSkillIds,
  MAX_HERO_LEVEL,
  type HeroSkillId,
  type HeroSkillLevels,
  type ActiveHeroSkillId,
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
  readonly abilityCooldowns?: Readonly<Partial<Record<ActiveHeroSkillId, number>>>;
}

export type HeroMovementState = "idle" | "walking" | "running";
export type HeroCombatState = "idle" | "aiming" | "shooting";

export interface RainOfArrowsState {
  readonly center: Position;
  remaining: number;
  accumulator: number;
  strikesRemaining: number;
}

const orderedDirections: readonly HeroDirection[] = [
  "east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east",
];

/** A mobile combatant. It deliberately does not implement or extend a tower entity. */
export class HeroEntity {
  readonly kind = "hero";
  readonly id: string;
  readonly name: string;
  position: { x: number; y: number };
  previousPosition: { x: number; y: number };
  moveTarget: { x: number; y: number } | null;
  facingDirection: HeroDirection = "south";
  movementState: HeroMovementState = "idle";
  combatState: HeroCombatState = "idle";
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
  readonly abilityCooldowns: Record<ActiveHeroSkillId, number> = {
    rainOfArrows: 0,
    windStep: 0,
    huntersMark: 0,
  };
  rainOfArrows: RainOfArrowsState | null = null;
  markedTargetId: string | null = null;
  markRemaining = 0;
  markHeroDamageBonus = 0;
  markTowerDamageBonus = 0;
  windStepActive = false;
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
  attackElapsed = 0;
  recoveryElapsed = 0;
  readonly attackWindup = 0.18;
  readonly attackRecovery = 0.12;

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
    this.previousPosition = { ...options.position };
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
    for (const skillId of Object.keys(this.abilityCooldowns) as ActiveHeroSkillId[]) {
      const cooldown = options.abilityCooldowns?.[skillId];
      if (Number.isFinite(cooldown) && Number(cooldown) >= 0) this.abilityCooldowns[skillId] = Number(cooldown);
    }
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
    for (const prerequisite of definition.prerequisites) {
      if (this.skills[prerequisite.skillId] < prerequisite.level) {
        return `${definition.name} requires ${heroSkillDefinitions[prerequisite.skillId].name} level ${prerequisite.level}.`;
      }
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
    for (const skillId of Object.keys(this.abilityCooldowns) as ActiveHeroSkillId[]) {
      this.abilityCooldowns[skillId] = Math.max(0, this.abilityCooldowns[skillId] - deltaSeconds);
    }
    this.markRemaining = Math.max(0, this.markRemaining - deltaSeconds);
    if (this.markRemaining === 0) {
      this.markedTargetId = null;
      this.markHeroDamageBonus = 0;
      this.markTowerDamageBonus = 0;
    }
  }

  beginFrame(): void {
    this.previousPosition = { ...this.position };
  }

  updateFacingFromVelocity(deadZone = 0.75): void {
    const dx = this.position.x - this.previousPosition.x;
    const dy = this.position.y - this.previousPosition.y;
    if (Math.hypot(dx, dy) < deadZone) return;
    this.#setFacing(Math.atan2(dy, dx));
  }

  updateFacingToward(target: Position, deadZone = 0.75): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    if (Math.hypot(dx, dy) < deadZone) return;
    this.#setFacing(Math.atan2(dy, dx));
  }

  directionToward(target: Position): HeroDirection {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    if (Math.hypot(dx, dy) < 0.75) return this.facingDirection;
    return this.#directionForAngle(Math.atan2(dy, dx));
  }

  setMovementState(state: HeroMovementState): void {
    this.movementState = state;
    this.moving = state !== "idle";
  }

  beginAiming(): void {
    this.combatState = "aiming";
    this.attackElapsed = 0;
    this.recoveryElapsed = 0;
  }

  releaseShot(): void {
    this.combatState = "shooting";
    this.shotAnimation = 1;
    this.recoveryElapsed = 0;
  }

  finishShot(): void {
    this.combatState = "idle";
    this.attackElapsed = 0;
    this.recoveryElapsed = 0;
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

  skillEffect(skillId: HeroSkillId) {
    const level = this.skills[skillId];
    return level > 0 ? heroSkillDefinitions[skillId].levels[level - 1] ?? null : null;
  }

  startRainOfArrows(center: Position): void {
    const effect = this.skillEffect("rainOfArrows");
    if (!effect?.rainArrowCount || !effect.cooldown) throw new Error("Rain of Arrows is not learned.");
    if (this.abilityCooldowns.rainOfArrows > 0) throw new Error("Rain of Arrows is cooling down.");
    this.rainOfArrows = { center: { ...center }, remaining: 2, accumulator: 0, strikesRemaining: effect.rainArrowCount };
    this.abilityCooldowns.rainOfArrows = effect.cooldown;
  }

  applyHuntersMark(targetId: string): void {
    const effect = this.skillEffect("huntersMark");
    if (!effect?.markDuration || !effect.cooldown) throw new Error("Hunter's Mark is not learned.");
    if (this.abilityCooldowns.huntersMark > 0) throw new Error("Hunter's Mark is cooling down.");
    this.markedTargetId = targetId;
    this.markRemaining = effect.markDuration;
    this.markHeroDamageBonus = effect.markHeroDamage ?? 0;
    this.markTowerDamageBonus = effect.markTowerDamage ?? 0;
    this.abilityCooldowns.huntersMark = effect.cooldown;
  }

  beginWindStepCooldown(): void {
    const effect = this.skillEffect("windStep");
    if (!effect?.cooldown) throw new Error("Wind Step is not learned.");
    if (this.abilityCooldowns.windStep > 0) throw new Error("Wind Step is cooling down.");
    this.abilityCooldowns.windStep = effect.cooldown;
    this.windStepActive = true;
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

  #setFacing(angle: number): void {
    this.heading = angle;
    this.facingDirection = this.#directionForAngle(angle);
  }

  #directionForAngle(angle: number): HeroDirection {
    const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
    const index = Math.round(normalized / (Math.PI / 4)) % orderedDirections.length;
    return orderedDirections[index] ?? this.facingDirection;
  }
}

export default HeroEntity;
