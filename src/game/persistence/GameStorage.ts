import { isLevelId, type LevelId } from "../../content/levels/levelDefinitions.js";
import {
  createDefaultHeroSkills,
  heroSkillDefinitions,
  heroSkillIds,
  MAX_HERO_LEVEL,
  type HeroSkillLevels,
  xpRequiredForHeroLevel,
} from "../../content/heroes/heroSkills.js";
import type { DifficultyId, FlowSnapshot, GameSpeed } from "../GameFlow.js";
import type { Position } from "../types.js";

export const SAVE_SCHEMA_VERSION = 2;
const SETTINGS_KEY = "river-outpost.settings";
const ACTIVE_GAME_KEY = "river-outpost.active-game";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GameSettings {
  readonly version: typeof SAVE_SCHEMA_VERSION;
  readonly tutorialSeen: boolean;
  readonly difficulty: DifficultyId;
  readonly speed: GameSpeed;
  readonly soundEnabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly selectedLevelId: LevelId;
  readonly unlockedLevelIds: readonly LevelId[];
  readonly completedLevelIds: readonly LevelId[];
  readonly bestScoreByLevel: Readonly<Partial<Record<LevelId, number>>>;
  readonly bestDifficultyByLevel: Readonly<Partial<Record<LevelId, DifficultyId>>>;
  readonly heroLevel: number;
  readonly heroXp: number;
  readonly heroSkillPoints: number;
  readonly heroSkills: Readonly<HeroSkillLevels>;
}

export interface SavedTower {
  readonly id: string;
  readonly type: string;
  readonly level: number;
  readonly targeting: string;
  readonly position: Position;
}

export interface SavedEnemy {
  readonly id: string;
  readonly type: string;
  readonly health: number;
  readonly shield?: number;
  readonly splitGeneration?: number;
  readonly progress: number;
  readonly position: Position;
  readonly statusEffects: readonly Record<string, unknown>[];
  readonly damageContributors?: readonly (readonly [string, number])[];
  readonly bossPhase: number;
}

export interface SavedWave {
  readonly waveIndex: number;
  readonly elapsed: number;
  readonly active: boolean;
  readonly queue: readonly { readonly at: number; readonly type: string }[];
}

export interface SavedHero {
  readonly id: string;
  readonly position: Position;
  readonly moveTarget: Position | null;
  readonly level: number;
  readonly xp: number;
  readonly skillPoints?: number;
  readonly skills?: Readonly<HeroSkillLevels>;
}

export interface ActiveGameSave {
  readonly version: typeof SAVE_SCHEMA_VERSION;
  readonly savedAt: number;
  readonly levelId: LevelId;
  readonly mapId: string;
  readonly contentVersion: number;
  readonly flow: FlowSnapshot;
  readonly lives: number;
  readonly gold: number;
  readonly score: number;
  readonly elapsedSeconds: number;
  readonly nextTower: number;
  readonly waveLivesAtStart: number;
  readonly towers: readonly SavedTower[];
  readonly enemies: readonly SavedEnemy[];
  readonly hero?: SavedHero | null;
  readonly wave: SavedWave;
}

const defaultSettings = (): GameSettings => ({
  version: SAVE_SCHEMA_VERSION,
  tutorialSeen: false,
  difficulty: "normal",
  speed: 1,
  soundEnabled: true,
  musicVolume: 0.34,
  sfxVolume: 0.62,
  selectedLevelId: "level-1",
  unlockedLevelIds: ["level-1"],
  completedLevelIds: [],
  bestScoreByLevel: {},
  bestDifficultyByLevel: {},
  heroLevel: 1,
  heroXp: 0,
  heroSkillPoints: 0,
  heroSkills: createDefaultHeroSkills(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const volume = (value: unknown, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, Number(value))) : fallback;
const difficulty = (value: unknown): DifficultyId =>
  value === "easy" || value === "hard" ? value : "normal";
const speed = (value: unknown): GameSpeed => value === 2 || value === 3 ? value : 1;

const levelIds = (value: unknown, fallback: readonly LevelId[]): LevelId[] => {
  if (!Array.isArray(value)) return [...fallback];
  const result: LevelId[] = [];
  for (const candidate of value) {
    if (isLevelId(candidate) && !result.includes(candidate)) result.push(candidate);
  }
  return result.length > 0 ? result : [...fallback];
};

const scoreRecord = (value: unknown): Partial<Record<LevelId, number>> => {
  if (!isRecord(value)) return {};
  const result: Partial<Record<LevelId, number>> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (isLevelId(key) && Number.isFinite(candidate) && Number(candidate) >= 0) {
      result[key] = Math.floor(Number(candidate));
    }
  }
  return result;
};

const difficultyRecord = (value: unknown): Partial<Record<LevelId, DifficultyId>> => {
  if (!isRecord(value)) return {};
  const result: Partial<Record<LevelId, DifficultyId>> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (isLevelId(key)
      && (candidate === "easy" || candidate === "normal" || candidate === "hard")) {
      result[key] = candidate;
    }
  }
  return result;
};

interface HeroProgression {
  readonly level: number;
  readonly xp: number;
  readonly skillPoints: number;
  readonly skills: HeroSkillLevels;
}

const heroProgression = (value: Record<string, unknown>): HeroProgression => {
  const level = Number.isInteger(value.heroLevel)
    && Number(value.heroLevel) >= 1
    && Number(value.heroLevel) <= MAX_HERO_LEVEL
    ? Number(value.heroLevel)
    : 1;
  const skills = createDefaultHeroSkills();
  if (isRecord(value.heroSkills)) {
    for (const skillId of heroSkillIds) {
      const candidate = value.heroSkills[skillId];
      const maximum = heroSkillDefinitions[skillId].levels.length;
      if (Number.isInteger(candidate)
        && Number(candidate) >= 0
        && Number(candidate) <= maximum) {
        const unlockedLevelCount = heroSkillDefinitions[skillId].levels
          .filter((skillLevel) => skillLevel.requiredHeroLevel <= level)
          .length;
        skills[skillId] = Math.min(Number(candidate), unlockedLevelCount);
      }
    }
  }
  const spent = heroSkillIds.reduce((total, skillId) => total + skills[skillId], 0);
  if (spent > level - 1) {
    Object.assign(skills, createDefaultHeroSkills());
  }
  const available = level - 1
    - heroSkillIds.reduce((total, skillId) => total + skills[skillId], 0);
  const skillPoints = Number.isInteger(value.heroSkillPoints)
    && Number(value.heroSkillPoints) >= 0
    && Number(value.heroSkillPoints) <= available
    ? Number(value.heroSkillPoints)
    : available;
  const required = xpRequiredForHeroLevel(level);
  const xp = level < MAX_HERO_LEVEL
    && Number.isInteger(value.heroXp)
    && Number(value.heroXp) >= 0
    && Number(value.heroXp) < required
    ? Number(value.heroXp)
    : 0;
  return { level, xp, skillPoints, skills };
};

/** Defensive schema-v2 localStorage boundary with settings-only migration from v1. */
export class GameStorage {
  constructor(private readonly storage: StorageLike | null) {}

  loadSettings(): GameSettings {
    const parsed = this.read(SETTINGS_KEY);
    if (!isRecord(parsed)) return defaultSettings();
    if (parsed.version === 1) return this.migrateV1Settings(parsed);
    if (parsed.version !== SAVE_SCHEMA_VERSION) return defaultSettings();

    const unlocked = levelIds(parsed.unlockedLevelIds, ["level-1"]);
    if (!unlocked.includes("level-1")) unlocked.unshift("level-1");
    const completed = levelIds(parsed.completedLevelIds, []);
    const hero = heroProgression(parsed);
    const selected = isLevelId(parsed.selectedLevelId) && unlocked.includes(parsed.selectedLevelId)
      ? parsed.selectedLevelId
      : "level-1";
    return {
      version: SAVE_SCHEMA_VERSION,
      tutorialSeen: parsed.tutorialSeen === true,
      difficulty: difficulty(parsed.difficulty),
      speed: speed(parsed.speed),
      soundEnabled: parsed.soundEnabled !== false,
      musicVolume: volume(parsed.musicVolume, 0.34),
      sfxVolume: volume(parsed.sfxVolume, 0.62),
      selectedLevelId: selected,
      unlockedLevelIds: unlocked,
      completedLevelIds: completed,
      bestScoreByLevel: scoreRecord(parsed.bestScoreByLevel),
      bestDifficultyByLevel: difficultyRecord(parsed.bestDifficultyByLevel),
      heroLevel: hero.level,
      heroXp: hero.xp,
      heroSkillPoints: hero.skillPoints,
      heroSkills: hero.skills,
    };
  }

  saveSettings(settings: Omit<GameSettings, "version">): void {
    this.write(SETTINGS_KEY, { version: SAVE_SCHEMA_VERSION, ...settings });
  }

  loadGame(): ActiveGameSave | null {
    const parsed = this.read(ACTIVE_GAME_KEY);
    if (isRecord(parsed) && parsed.version === 1) {
      this.remove(ACTIVE_GAME_KEY);
      return null;
    }
    if (!this.isActiveGame(parsed)) {
      if (parsed !== null) this.remove(ACTIVE_GAME_KEY);
      return null;
    }
    return parsed;
  }

  saveGame(save: Omit<ActiveGameSave, "version" | "savedAt">): void {
    this.write(ACTIVE_GAME_KEY, {
      version: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      ...save,
    });
  }

  clearGame(): void {
    this.remove(ACTIVE_GAME_KEY);
  }

  resetCampaignProgress(): GameSettings {
    const current = this.loadSettings();
    const reset: GameSettings = {
      ...defaultSettings(),
      tutorialSeen: current.tutorialSeen,
      difficulty: current.difficulty,
      speed: current.speed,
      soundEnabled: current.soundEnabled,
      musicVolume: current.musicVolume,
      sfxVolume: current.sfxVolume,
    };
    this.saveSettings(reset);
    this.clearGame();
    return reset;
  }

  private migrateV1Settings(parsed: Record<string, unknown>): GameSettings {
    const legacyScore = Number.isFinite(parsed.bestScore) && Number(parsed.bestScore) >= 0
      ? Math.floor(Number(parsed.bestScore))
      : 0;
    const migrated: GameSettings = {
      version: SAVE_SCHEMA_VERSION,
      tutorialSeen: parsed.tutorialSeen === true,
      difficulty: difficulty(parsed.difficulty),
      speed: speed(parsed.speed),
      soundEnabled: parsed.soundEnabled !== false,
      musicVolume: volume(parsed.musicVolume, 0.34),
      sfxVolume: volume(parsed.sfxVolume, 0.62),
      selectedLevelId: "level-1",
      unlockedLevelIds: ["level-1"],
      completedLevelIds: [],
      bestScoreByLevel: legacyScore > 0 ? { "level-1": legacyScore } : {},
      bestDifficultyByLevel: {},
      heroLevel: 1,
      heroXp: 0,
      heroSkillPoints: 0,
      heroSkills: createDefaultHeroSkills(),
    };
    this.saveSettings(migrated);
    return migrated;
  }

  private isActiveGame(value: unknown): value is ActiveGameSave {
    if (!isRecord(value) || value.version !== SAVE_SCHEMA_VERSION) return false;
    if (!isLevelId(value.levelId)
      || typeof value.mapId !== "string"
      || value.mapId.length === 0
      || !Number.isInteger(value.contentVersion)
      || Number(value.contentVersion) < 1) return false;
    if (!isRecord(value.flow) || !isRecord(value.wave)) return false;
    if (value.hero !== undefined && value.hero !== null) {
      if (!isRecord(value.hero)
        || typeof value.hero.id !== "string"
        || value.hero.id.length === 0
        || !this.isPosition(value.hero.position)
        || (value.hero.moveTarget !== null && !this.isPosition(value.hero.moveTarget))
        || !Number.isInteger(value.hero.level)
        || Number(value.hero.level) < 1
        || Number(value.hero.level) > MAX_HERO_LEVEL
        || !Number.isInteger(value.hero.xp)
        || Number(value.hero.xp) < 0
        || (value.hero.skillPoints !== undefined
          && (!Number.isInteger(value.hero.skillPoints)
            || Number(value.hero.skillPoints) < 0))
        || (value.hero.skills !== undefined && !this.isHeroSkills(value.hero.skills))) return false;
    }
    return Number.isFinite(value.lives)
      && Number.isFinite(value.gold)
      && Number.isFinite(value.score)
      && Number.isFinite(value.elapsedSeconds)
      && Number.isInteger(value.nextTower)
      && Number(value.nextTower) >= 1
      && Number.isFinite(value.waveLivesAtStart)
      && Number(value.waveLivesAtStart) >= 0
      && Array.isArray(value.towers)
      && Array.isArray(value.enemies)
      && Array.isArray(value.wave.queue);
  }

  private isPosition(value: unknown): value is Position {
    return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
  }

  private isHeroSkills(value: unknown): value is HeroSkillLevels {
    if (!isRecord(value)) return false;
    return heroSkillIds.every((skillId) => {
      const candidate = value[skillId];
      return Number.isInteger(candidate)
        && Number(candidate) >= 0
        && Number(candidate) <= heroSkillDefinitions[skillId].levels.length;
    });
  }

  private read(key: string): unknown {
    if (!this.storage) return null;
    try {
      const value = this.storage.getItem(key);
      return value === null ? null : JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in privacy mode. Gameplay remains functional.
    }
  }

  private remove(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch {
      // A failed cleanup must not prevent the application from starting.
    }
  }
}

export default GameStorage;
