export const MAX_HERO_LEVEL = 20;

export const heroSkillIds = [
  "keenEye", "rapidVolley", "piercingArrow", "rallyAura",
  "multishot", "venomArrows", "frostArrows",
  "rainOfArrows", "windStep", "huntersMark",
] as const;
export const activeHeroSkillIds = ["rainOfArrows", "windStep", "huntersMark"] as const;

export type HeroSkillId = typeof heroSkillIds[number];
export type ActiveHeroSkillId = typeof activeHeroSkillIds[number];
export type HeroSkillLevels = Record<HeroSkillId, number>;
export type HeroSkillBranch = "marksman" | "warden" | "ranger";

export interface HeroSkillPrerequisite {
  readonly skillId: HeroSkillId;
  readonly level: number;
}

export interface HeroSkillLevelDefinition {
  readonly requiredHeroLevel: number;
  readonly bonusText: string;
  readonly rangeBonus?: number;
  readonly fireRateBonus?: number;
  readonly projectileTargets?: number;
  readonly auraRadius?: number;
  readonly auraDamageBonus?: number;
  readonly auraFireRateBonus?: number;
  readonly arrowCount?: number;
  readonly secondaryDamage?: number;
  readonly poisonDamage?: number;
  readonly poisonDuration?: number;
  readonly slowMultiplier?: number;
  readonly slowDuration?: number;
  readonly cooldown?: number;
  readonly rainArrowCount?: number;
  readonly windStepDistance?: number;
  readonly markDuration?: number;
  readonly markHeroDamage?: number;
  readonly markTowerDamage?: number;
}

export interface HeroSkillDefinition {
  readonly id: HeroSkillId;
  readonly name: string;
  readonly description: string;
  readonly branch: HeroSkillBranch;
  readonly kind: "passive" | "active";
  readonly hotkey?: "Q" | "E" | "R";
  readonly prerequisites: readonly HeroSkillPrerequisite[];
  readonly levels: readonly HeroSkillLevelDefinition[];
}

const define = (definition: HeroSkillDefinition): HeroSkillDefinition => Object.freeze({
  ...definition,
  prerequisites: Object.freeze(definition.prerequisites.map((item) => Object.freeze(item))),
  levels: Object.freeze(definition.levels.map((level) => Object.freeze(level))),
});
const passive = (definition: Omit<HeroSkillDefinition, "kind" | "prerequisites"> & {
  readonly prerequisites?: readonly HeroSkillPrerequisite[];
}): HeroSkillDefinition => define({ ...definition, kind: "passive", prerequisites: definition.prerequisites ?? [] });
const active = (definition: Omit<HeroSkillDefinition, "kind" | "prerequisites"> & {
  readonly hotkey: "Q" | "E" | "R";
  readonly prerequisites?: readonly HeroSkillPrerequisite[];
}): HeroSkillDefinition => define({ ...definition, kind: "active", prerequisites: definition.prerequisites ?? [] });

export const heroSkillDefinitions: Readonly<Record<HeroSkillId, HeroSkillDefinition>> = Object.freeze({
  keenEye: passive({ id: "keenEye", name: "Keen Eye", branch: "marksman", description: "Extends Eldrin's attack range.", levels: [
    { requiredHeroLevel: 2, rangeBonus: 35, bonusText: "+35 range" },
    { requiredHeroLevel: 4, rangeBonus: 70, bonusText: "+70 range" },
    { requiredHeroLevel: 7, rangeBonus: 110, bonusText: "+110 range" },
  ] }),
  rapidVolley: passive({ id: "rapidVolley", name: "Rapid Volley", branch: "ranger", description: "Improves Eldrin's arrow fire rate.", levels: [
    { requiredHeroLevel: 2, fireRateBonus: .12, bonusText: "+12% fire rate" },
    { requiredHeroLevel: 5, fireRateBonus: .25, bonusText: "+25% fire rate" },
    { requiredHeroLevel: 8, fireRateBonus: .4, bonusText: "+40% fire rate" },
  ] }),
  piercingArrow: passive({ id: "piercingArrow", name: "Piercing Arrow", branch: "marksman", description: "Arrows continue through additional nearby enemies.", levels: [
    { requiredHeroLevel: 3, projectileTargets: 2, bonusText: "Hits up to 2 targets" },
    { requiredHeroLevel: 6, projectileTargets: 3, bonusText: "Hits up to 3 targets" },
    { requiredHeroLevel: 9, projectileTargets: 4, bonusText: "Hits up to 4 targets" },
  ] }),
  rallyAura: passive({ id: "rallyAura", name: "Rally Aura", branch: "warden", description: "Boosts nearby towers without changing base stats.", levels: [
    { requiredHeroLevel: 2, auraRadius: 150, auraDamageBonus: .2, auraFireRateBonus: .15, bonusText: "150 radius · +20% damage · +15% rate" },
    { requiredHeroLevel: 5, auraRadius: 180, auraDamageBonus: .25, auraFireRateBonus: .2, bonusText: "180 radius · +25% damage · +20% rate" },
    { requiredHeroLevel: 8, auraRadius: 220, auraDamageBonus: .3, auraFireRateBonus: .25, bonusText: "220 radius · +30% damage · +25% rate" },
  ] }),
  multishot: passive({ id: "multishot", name: "Multishot", branch: "marksman", description: "Fires secondary arrows at different living targets.", prerequisites: [{ skillId: "rapidVolley", level: 1 }], levels: [
    { requiredHeroLevel: 6, arrowCount: 2, secondaryDamage: .55, bonusText: "2 arrows · secondary 55%" },
    { requiredHeroLevel: 10, arrowCount: 3, secondaryDamage: .65, bonusText: "3 arrows · secondary 65%" },
    { requiredHeroLevel: 15, arrowCount: 4, secondaryDamage: .75, bonusText: "4 arrows · secondary 75%" },
  ] }),
  venomArrows: passive({ id: "venomArrows", name: "Venom Arrows", branch: "ranger", description: "Refreshes a strongest-only poison effect.", prerequisites: [{ skillId: "rapidVolley", level: 1 }], levels: [
    { requiredHeroLevel: 7, poisonDamage: 6, poisonDuration: 3, bonusText: "6 poison/s for 3s" },
    { requiredHeroLevel: 12, poisonDamage: 10, poisonDuration: 3.5, bonusText: "10 poison/s for 3.5s" },
    { requiredHeroLevel: 17, poisonDamage: 15, poisonDuration: 4, bonusText: "15 poison/s for 4s" },
  ] }),
  frostArrows: passive({ id: "frostArrows", name: "Frost Arrows", branch: "warden", description: "Applies the strongest available slow.", prerequisites: [{ skillId: "rallyAura", level: 1 }], levels: [
    { requiredHeroLevel: 7, slowMultiplier: .85, slowDuration: 2, bonusText: "15% slow for 2s" },
    { requiredHeroLevel: 12, slowMultiplier: .75, slowDuration: 2.5, bonusText: "25% slow for 2.5s" },
    { requiredHeroLevel: 17, slowMultiplier: .65, slowDuration: 3, bonusText: "35% slow for 3s" },
  ] }),
  rainOfArrows: active({ id: "rainOfArrows", name: "Rain of Arrows", branch: "ranger", hotkey: "Q", description: "Select an area for a two-second arrow rain.", prerequisites: [{ skillId: "multishot", level: 2 }], levels: [
    { requiredHeroLevel: 11, rainArrowCount: 6, cooldown: 24, bonusText: "6 arrows · 24s cooldown" },
    { requiredHeroLevel: 14, rainArrowCount: 9, cooldown: 20, bonusText: "9 arrows · 20s cooldown" },
    { requiredHeroLevel: 18, rainArrowCount: 12, cooldown: 16, bonusText: "12 arrows · 16s cooldown" },
  ] }),
  windStep: active({ id: "windStep", name: "Wind Step", branch: "warden", hotkey: "E", description: "Rapidly follows a valid path to the selected point.", prerequisites: [{ skillId: "frostArrows", level: 1 }], levels: [
    { requiredHeroLevel: 11, windStepDistance: 180, cooldown: 14, bonusText: "180 distance · 14s cooldown" },
    { requiredHeroLevel: 14, windStepDistance: 240, cooldown: 11, bonusText: "240 distance · 11s cooldown" },
    { requiredHeroLevel: 18, windStepDistance: 320, cooldown: 8, bonusText: "320 distance · 8s cooldown" },
  ] }),
  huntersMark: active({ id: "huntersMark", name: "Hunter's Mark", branch: "marksman", hotkey: "R", description: "Marks one living enemy for effective hero and tower damage bonuses.", prerequisites: [{ skillId: "keenEye", level: 2 }], levels: [
    { requiredHeroLevel: 11, markDuration: 6, markHeroDamage: .2, markTowerDamage: .1, cooldown: 18, bonusText: "6s · +20% hero · +10% towers" },
    { requiredHeroLevel: 14, markDuration: 8, markHeroDamage: .3, markTowerDamage: .15, cooldown: 16, bonusText: "8s · +30% hero · +15% towers" },
    { requiredHeroLevel: 18, markDuration: 10, markHeroDamage: .4, markTowerDamage: .2, cooldown: 14, bonusText: "10s · +40% hero · +20% towers" },
  ] }),
});

export function createDefaultHeroSkills(): HeroSkillLevels {
  return Object.fromEntries(heroSkillIds.map((id) => [id, 0])) as HeroSkillLevels;
}

export function isHeroSkillId(value: unknown): value is HeroSkillId {
  return typeof value === "string" && heroSkillIds.includes(value as HeroSkillId);
}
export function isActiveHeroSkillId(value: unknown): value is ActiveHeroSkillId {
  return typeof value === "string" && activeHeroSkillIds.includes(value as ActiveHeroSkillId);
}
export function xpRequiredForHeroLevel(level: number, base = 80): number {
  if (level >= MAX_HERO_LEVEL) return 0;
  return Math.round(base * (1.22 ** Math.max(0, level - 1)));
}
