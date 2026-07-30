import map01 from "../maps/map01.js";
import map02 from "../maps/map02.js";
import waveDefinitions from "../waves/waveDefinitions.js";
import level02WaveDefinitions from "../waves/level02WaveDefinitions.js";
import type { MapDefinition, WaveDefinition } from "../../game/CampaignSession.js";

export type LevelId = "level-1" | "level-2" | "level-3" | "level-4";

export interface HeroLevelConfig {
  readonly id: string;
}

export interface LevelDefinition {
  readonly id: LevelId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly map: MapDefinition;
  readonly waves: readonly WaveDefinition[];
  readonly availableTowerTypes: readonly string[];
  readonly availableEnemyTypes: readonly string[];
  readonly heroConfig: HeroLevelConfig | null;
  readonly unlocksLevelId: LevelId | null;
  readonly contentVersion: number;
}

const originalTowers = Object.freeze(["basic", "rapid", "frost", "cannon", "sniper"]);
const originalEnemies = Object.freeze(["grunt", "runner", "tank", "armored", "regenerator", "boss"]);
const serpentTowers = Object.freeze([...originalTowers, "tesla", "poison"]);
const serpentEnemies = Object.freeze([...originalEnemies, "swarm", "shielded", "splitter"]);

const defineLevel = (level: LevelDefinition): LevelDefinition => Object.freeze(level);

export const levelDefinitions: readonly LevelDefinition[] = Object.freeze([
  defineLevel({
    id: "level-1",
    number: 1,
    name: "River Outpost",
    description: "Hold the river crossing through twelve escalating waves.",
    map: map01 as unknown as MapDefinition,
    waves: waveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: originalTowers,
    availableEnemyTypes: originalEnemies,
    heroConfig: null,
    unlocksLevelId: "level-2",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-2",
    number: 2,
    name: "Serpent Pass",
    description: "Defend a long winding pass with Tesla and Poison technology.",
    map: map02 as unknown as MapDefinition,
    waves: level02WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: serpentEnemies,
    heroConfig: null,
    unlocksLevelId: null,
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-3",
    number: 3,
    name: "The Sunken Crown",
    description: "A future campaign chapter. Complete Serpent Pass content first.",
    map: map02 as unknown as MapDefinition,
    waves: level02WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: serpentEnemies,
    heroConfig: null,
    unlocksLevelId: null,
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-4",
    number: 4,
    name: "Dragon's Reach",
    description: "A future campaign chapter, currently sealed.",
    map: map02 as unknown as MapDefinition,
    waves: level02WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: serpentEnemies,
    heroConfig: null,
    unlocksLevelId: null,
    contentVersion: 1,
  }),
]);

const levelById = new Map<LevelId, LevelDefinition>(
  levelDefinitions.map((level) => [level.id, level]),
);

export function getLevelDefinition(levelId: LevelId): LevelDefinition {
  const level = levelById.get(levelId);
  if (!level) throw new Error(`Unknown campaign level: ${levelId}`);
  return level;
}

export function isLevelId(value: unknown): value is LevelId {
  return typeof value === "string" && levelById.has(value as LevelId);
}

export default levelDefinitions;
