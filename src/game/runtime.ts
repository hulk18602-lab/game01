import type { Position, Tower } from "./types.js";

export interface RuntimeTower {
  readonly kind: "tower";
  readonly id: string;
  readonly type: string;
  readonly level: number;
  /** The single world-space position consumed by rendering, combat and hit testing. */
  readonly position: Position;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly baseDamage: number;
  readonly baseFireRate: number;
  effectiveDamage: number;
  effectiveFireRate: number;
  auraBuffed: boolean;
  readonly projectileSpeed: number;
  targeting: string;
  readonly damageType?: string;
  readonly areaRadius?: number;
  readonly chainCount?: number;
  readonly chainFalloff?: number;
  readonly chainRange?: number;
  readonly projectileColor?: string;
  readonly statusEffect?: unknown;
  readonly color: string;
  readonly radius: number;
  readonly label: string;
  cooldown?: number;
  targetId?: string | null;
  debuffMultiplier?: number;
  debuffRemaining?: number;
}

export interface RuntimeTowerDefinition {
  readonly name: string;
  readonly color?: string;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly targeting: string;
  readonly statusEffect?: unknown;
  readonly damageType?: string;
  readonly areaRadius?: number;
  readonly chainCount?: number;
  readonly chainFalloff?: number;
  readonly chainRange?: number;
  readonly levels?: readonly {
    readonly range: number;
    readonly damage: number;
    readonly fireRate: number;
    readonly projectileSpeed: number;
    readonly statusEffect?: unknown;
    readonly areaRadius?: number;
    readonly chainCount?: number;
    readonly chainFalloff?: number;
    readonly chainRange?: number;
  }[];
}

type RenderEntity = RuntimeTower | Record<string, unknown>;

export function runtimeTowerColor(type: string): string {
  if (type === "frost") return "#67e8f9";
  if (type === "rapid") return "#a78bfa";
  if (type === "cannon") return "#fb923c";
  if (type === "sniper") return "#f472b6";
  if (type === "tesla") return "#fde047";
  if (type === "poison") return "#4ade80";
  return "#60a5fa";
}

export function createRuntimeTower(
  tower: Pick<Tower, "id" | "type" | "level" | "targeting">,
  definition: RuntimeTowerDefinition,
  position: Position,
): RuntimeTower {
  const level = definition.levels?.[tower.level] ?? definition;
  return {
    kind: "tower",
    id: tower.id,
    type: tower.type,
    level: tower.level,
    position: { ...position },
    range: level.range,
    damage: level.damage,
    fireRate: level.fireRate,
    baseDamage: level.damage,
    baseFireRate: level.fireRate,
    effectiveDamage: level.damage,
    effectiveFireRate: level.fireRate,
    auraBuffed: false,
    projectileSpeed: level.projectileSpeed,
    targeting: tower.targeting ?? definition.targeting,
    statusEffect: level.statusEffect,
    damageType: definition.damageType,
    areaRadius: level.areaRadius ?? definition.areaRadius,
    chainCount: level.chainCount ?? definition.chainCount,
    chainFalloff: level.chainFalloff ?? definition.chainFalloff,
    chainRange: level.chainRange ?? definition.chainRange,
    projectileColor: definition.color,
    color: definition.color ?? runtimeTowerColor(tower.type),
    radius: 18 + tower.level * 2,
    label: definition.name,
  };
}

/** Derives the exact entity list consumed by EntityLayer. */
export function createRenderEntities(
  towers: readonly RuntimeTower[],
  enemies: readonly RenderEntity[],
  projectiles: readonly RenderEntity[],
): RenderEntity[] {
  return [
    ...towers,
    ...enemies.map((enemy) => ({
      ...enemy,
      kind: "enemy",
      color: enemy.color,
      radius: enemy.radius,
    })),
    ...projectiles.map((projectile) => ({
      ...projectile,
      kind: "projectile",
      color: projectile.color ?? "#f8fafc",
      radius: 4,
    })),
  ];
}
