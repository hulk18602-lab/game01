export const MAX_HERO_LEVEL = 10;

export const heroSkillIds = [
  "keenEye",
  "rapidVolley",
  "piercingArrow",
  "rallyAura",
] as const;

export type HeroSkillId = typeof heroSkillIds[number];
export type HeroSkillLevels = Record<HeroSkillId, number>;

export interface HeroSkillLevelDefinition {
  readonly requiredHeroLevel: number;
  readonly bonusText: string;
  readonly rangeBonus?: number;
  readonly fireRateBonus?: number;
  readonly projectileTargets?: number;
  readonly auraRadius?: number;
  readonly auraDamageBonus?: number;
  readonly auraFireRateBonus?: number;
}

export interface HeroSkillDefinition {
  readonly id: HeroSkillId;
  readonly name: string;
  readonly description: string;
  readonly levels: readonly HeroSkillLevelDefinition[];
}

const define = (definition: HeroSkillDefinition): HeroSkillDefinition => Object.freeze({
  ...definition,
  levels: Object.freeze(definition.levels.map((level) => Object.freeze(level))),
});

export const heroSkillDefinitions: Readonly<Record<HeroSkillId, HeroSkillDefinition>> = Object.freeze({
  keenEye: define({
    id: "keenEye",
    name: "Keen Eye",
    description: "Extends Eldrin's attack range.",
    levels: [
      { requiredHeroLevel: 2, rangeBonus: 35, bonusText: "+35 range" },
      { requiredHeroLevel: 4, rangeBonus: 70, bonusText: "+70 range" },
      { requiredHeroLevel: 7, rangeBonus: 110, bonusText: "+110 range" },
    ],
  }),
  rapidVolley: define({
    id: "rapidVolley",
    name: "Rapid Volley",
    description: "Improves Eldrin's arrow fire rate.",
    levels: [
      { requiredHeroLevel: 2, fireRateBonus: 0.12, bonusText: "+12% fire rate" },
      { requiredHeroLevel: 5, fireRateBonus: 0.25, bonusText: "+25% fire rate" },
      { requiredHeroLevel: 8, fireRateBonus: 0.4, bonusText: "+40% fire rate" },
    ],
  }),
  piercingArrow: define({
    id: "piercingArrow",
    name: "Piercing Arrow",
    description: "Arrows continue through additional nearby enemies.",
    levels: [
      { requiredHeroLevel: 3, projectileTargets: 2, bonusText: "Hits up to 2 targets" },
      { requiredHeroLevel: 6, projectileTargets: 3, bonusText: "Hits up to 3 targets" },
      { requiredHeroLevel: 9, projectileTargets: 4, bonusText: "Hits up to 4 targets" },
    ],
  }),
  rallyAura: define({
    id: "rallyAura",
    name: "Rally Aura",
    description: "Temporarily boosts nearby towers without changing their base stats.",
    levels: [
      {
        requiredHeroLevel: 2,
        auraRadius: 150,
        auraDamageBonus: 0.2,
        auraFireRateBonus: 0.15,
        bonusText: "150 radius · +20% damage · +15% rate",
      },
      {
        requiredHeroLevel: 5,
        auraRadius: 180,
        auraDamageBonus: 0.25,
        auraFireRateBonus: 0.2,
        bonusText: "180 radius · +25% damage · +20% rate",
      },
      {
        requiredHeroLevel: 8,
        auraRadius: 220,
        auraDamageBonus: 0.3,
        auraFireRateBonus: 0.25,
        bonusText: "220 radius · +30% damage · +25% rate",
      },
    ],
  }),
});

export function createDefaultHeroSkills(): HeroSkillLevels {
  return { keenEye: 0, rapidVolley: 0, piercingArrow: 0, rallyAura: 0 };
}

export function isHeroSkillId(value: unknown): value is HeroSkillId {
  return typeof value === "string" && heroSkillIds.includes(value as HeroSkillId);
}

export function xpRequiredForHeroLevel(level: number, base = 80): number {
  if (level >= MAX_HERO_LEVEL) return 0;
  return Math.round(base * (1.35 ** Math.max(0, level - 1)));
}
