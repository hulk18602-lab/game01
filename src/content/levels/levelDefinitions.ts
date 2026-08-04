import map01 from "../maps/map01.js";
import map02 from "../maps/map02.js";
import map03 from "../maps/map03.js";
import map04 from "../maps/map04.js";
import map05 from "../maps/map05.js";
import map06 from "../maps/map06.js";
import map07 from "../maps/map07.js";
import map08 from "../maps/map08.js";
import waveDefinitions from "../waves/waveDefinitions.js";
import level02WaveDefinitions from "../waves/level02WaveDefinitions.js";
import level03WaveDefinitions from "../waves/level03WaveDefinitions.js";
import level04WaveDefinitions from "../waves/level04WaveDefinitions.js";
import level05WaveDefinitions from "../waves/level05WaveDefinitions.js";
import level06WaveDefinitions from "../waves/level06WaveDefinitions.js";
import level07WaveDefinitions from "../waves/level07WaveDefinitions.js";
import level08WaveDefinitions from "../waves/level08WaveDefinitions.js";
import type { MapDefinition, WaveDefinition } from "../../game/CampaignSession.js";
import type { Position } from "../../game/types.js";

export const levelIds = [
  "level-1",
  "level-2",
  "level-3",
  "level-4",
  "level-5",
  "level-6",
  "level-7",
  "level-8",
] as const;

export type LevelId = typeof levelIds[number];
export const firstLevelId: LevelId = levelIds[0]!;
export const finalLevelId: LevelId = levelIds[levelIds.length - 1]!;

export interface HeroLevelConfig {
  readonly id: string;
  readonly name: string;
  readonly spawnCell: Position;
  readonly speed: number;
  readonly range: number;
  readonly damage: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly xpToNextLevel: number;
}

export interface LevelDefinition {
  readonly id: LevelId;
  readonly number: number;
  readonly playable: boolean;
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
const citadelEnemies = Object.freeze([
  ...serpentEnemies,
  "eliteRunner",
  "arcaneSentinel",
  "stormLancer",
  "archonBoss",
]);
const highlandEnemies = Object.freeze([
  ...citadelEnemies,
  "berserker",
  "warBannerCaptain",
]);
const labyrinthEnemies = Object.freeze([
  ...highlandEnemies,
  "frostboundKnight",
  "iceShaman",
]);
const shadowfenEnemies = Object.freeze([
  ...labyrinthEnemies,
  "shadowAssassin",
  "shadowMinion",
  "necromancer",
]);
const eclipseEnemies = Object.freeze([
  ...shadowfenEnemies,
  "dreadPaladin",
  "voidWarlock",
  "eclipseKing",
]);
const eldrinStats = Object.freeze({
  id: "hero-eldrin",
  name: "Eldrin, Warden of the Greenwood",
  speed: 180,
  range: 210,
  damage: 28,
  fireRate: 1.25,
  projectileSpeed: 600,
  xpToNextLevel: 80,
});

const defineLevel = (level: LevelDefinition): LevelDefinition => Object.freeze(level);

export const levelDefinitions: readonly LevelDefinition[] = Object.freeze([
  defineLevel({
    id: "level-1",
    number: 1,
    playable: true,
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
    playable: true,
    name: "Serpent Pass",
    description: "Defend a long winding pass with Tesla and Poison technology.",
    map: map02 as unknown as MapDefinition,
    waves: level02WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: serpentEnemies,
    heroConfig: null,
    unlocksLevelId: "level-3",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-3",
    number: 3,
    playable: true,
    name: "Greenwood Siege",
    description: "Command Eldrin, Warden of the Greenwood, across a sprawling forest battlefield.",
    map: map03 as unknown as MapDefinition,
    waves: level03WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: serpentEnemies,
    heroConfig: Object.freeze({
      ...eldrinStats,
      spawnCell: Object.freeze({ x: 11, y: 10 }),
    }),
    unlocksLevelId: "level-4",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-4",
    number: 4,
    playable: true,
    name: "Arcane Citadel",
    description: "Break the elite citadel guard and confront the Astral Archon.",
    map: map04 as unknown as MapDefinition,
    waves: level04WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: citadelEnemies,
    heroConfig: Object.freeze({
      ...eldrinStats,
      spawnCell: Object.freeze({ x: 12, y: 11 }),
    }),
    unlocksLevelId: "level-5",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-5",
    number: 5,
    playable: true,
    name: "Ashen Highlands",
    description: "Cross volcanic highlands beneath the banners of an enraged warhost.",
    map: map05 as unknown as MapDefinition,
    waves: level05WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: highlandEnemies,
    heroConfig: Object.freeze({ ...eldrinStats, spawnCell: Object.freeze({ x: 14, y: 11 }) }),
    unlocksLevelId: "level-6",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-6",
    number: 6,
    playable: true,
    name: "Frostbound Labyrinth",
    description: "Hold a snowbound fortress against shielded knights and healing shamans.",
    map: map06 as unknown as MapDefinition,
    waves: level06WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: labyrinthEnemies,
    heroConfig: Object.freeze({ ...eldrinStats, spawnCell: Object.freeze({ x: 14, y: 11 }) }),
    unlocksLevelId: "level-7",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-7",
    number: 7,
    playable: true,
    name: "Shadowfen March",
    description: "Advance through drowned ruins hunted by assassins and death-bound summoners.",
    map: map07 as unknown as MapDefinition,
    waves: level07WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: shadowfenEnemies,
    heroConfig: Object.freeze({ ...eldrinStats, spawnCell: Object.freeze({ x: 14, y: 12 }) }),
    unlocksLevelId: "level-8",
    contentVersion: 1,
  }),
  defineLevel({
    id: "level-8",
    number: 8,
    playable: true,
    name: "Eclipse Throne",
    description: "Assault the final dark citadel and end the reign of the Eclipse King.",
    map: map08 as unknown as MapDefinition,
    waves: level08WaveDefinitions as unknown as readonly WaveDefinition[],
    availableTowerTypes: serpentTowers,
    availableEnemyTypes: eclipseEnemies,
    heroConfig: Object.freeze({ ...eldrinStats, spawnCell: Object.freeze({ x: 16, y: 12 }) }),
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
  return typeof value === "string" && levelIds.includes(value as LevelId);
}

export default levelDefinitions;
