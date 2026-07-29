import type { Position, Tower } from "./types.js";

export interface RuntimeTower {
  readonly kind: "tower";
  readonly id: string;
  readonly type: string;
  /** The single world-space position consumed by rendering, combat and hit testing. */
  readonly position: Position;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly targeting: string;
  readonly statusEffect?: unknown;
  readonly color: string;
  readonly radius: number;
  readonly label: string;
  cooldown?: number;
  targetId?: string | null;
}

export interface RuntimeTowerDefinition {
  readonly name: string;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly targeting: string;
  readonly statusEffect?: unknown;
}

type RenderEntity = Record<string, any>;

export function runtimeTowerColor(type: string): string {
  return type === "frost" ? "#67e8f9" : type === "rapid" ? "#a78bfa" : "#60a5fa";
}

export function createRuntimeTower(
  tower: Pick<Tower, "id" | "type" | "level">,
  definition: RuntimeTowerDefinition,
  position: Position,
): RuntimeTower {
  return {
    kind: "tower",
    id: tower.id,
    type: tower.type,
    position: { ...position },
    range: definition.range * (1 + tower.level * 0.12),
    damage: definition.damage * (1 + tower.level * 0.5),
    fireRate: definition.fireRate,
    projectileSpeed: definition.projectileSpeed,
    targeting: definition.targeting,
    statusEffect: definition.statusEffect,
    color: runtimeTowerColor(tower.type),
    radius: 18,
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
      color: enemy.type === "tank" ? "#ef4444" : enemy.type === "runner" ? "#fbbf24" : "#fb7185",
      radius: enemy.type === "tank" ? 17 : 12,
    })),
    ...projectiles.map((projectile) => ({
      ...projectile,
      kind: "projectile",
      color: "#f8fafc",
      radius: 4,
    })),
  ];
}
