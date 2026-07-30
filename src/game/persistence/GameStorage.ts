import type { DifficultyId, FlowSnapshot, GameSpeed } from "../GameFlow.js";
import type { Position } from "../types.js";

export const SAVE_SCHEMA_VERSION = 1;
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
  readonly bestScore: number;
  readonly soundEnabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
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
  readonly progress: number;
  readonly position: Position;
  readonly statusEffects: readonly Record<string, unknown>[];
  readonly bossPhase: number;
}

export interface SavedWave {
  readonly waveIndex: number;
  readonly elapsed: number;
  readonly active: boolean;
  readonly queue: readonly { readonly at: number; readonly type: string }[];
}

export interface ActiveGameSave {
  readonly version: typeof SAVE_SCHEMA_VERSION;
  readonly savedAt: number;
  readonly flow: FlowSnapshot;
  readonly lives: number;
  readonly gold: number;
  readonly score: number;
  readonly elapsedSeconds: number;
  readonly nextTower: number;
  readonly waveLivesAtStart: number;
  readonly towers: readonly SavedTower[];
  readonly enemies: readonly SavedEnemy[];
  readonly wave: SavedWave;
}

const defaultSettings = (): GameSettings => ({
  version: SAVE_SCHEMA_VERSION,
  tutorialSeen: false,
  difficulty: "normal",
  speed: 1,
  bestScore: 0,
  soundEnabled: true,
  musicVolume: 0.34,
  sfxVolume: 0.62,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const volume = (value: unknown, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, Number(value))) : fallback;

/** Defensive versioned localStorage boundary. Invalid data is ignored and removed. */
export class GameStorage {
  constructor(private readonly storage: StorageLike | null) {}

  loadSettings(): GameSettings {
    const parsed = this.read(SETTINGS_KEY);
    if (!isRecord(parsed) || parsed.version !== SAVE_SCHEMA_VERSION) return defaultSettings();
    const difficulty = parsed.difficulty;
    const speed = parsed.speed;
    return {
      version: SAVE_SCHEMA_VERSION,
      tutorialSeen: parsed.tutorialSeen === true,
      difficulty: difficulty === "easy" || difficulty === "hard" ? difficulty : "normal",
      speed: speed === 2 || speed === 3 ? speed : 1,
      bestScore: Number.isFinite(parsed.bestScore) && Number(parsed.bestScore) >= 0
        ? Math.floor(Number(parsed.bestScore))
        : 0,
      soundEnabled: parsed.soundEnabled !== false,
      musicVolume: volume(parsed.musicVolume, 0.34),
      sfxVolume: volume(parsed.sfxVolume, 0.62),
    };
  }

  saveSettings(settings: Omit<GameSettings, "version">): void {
    this.write(SETTINGS_KEY, { version: SAVE_SCHEMA_VERSION, ...settings });
  }

  loadGame(): ActiveGameSave | null {
    const parsed = this.read(ACTIVE_GAME_KEY);
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

  private isActiveGame(value: unknown): value is ActiveGameSave {
    if (!isRecord(value) || value.version !== SAVE_SCHEMA_VERSION) return false;
    if (!isRecord(value.flow) || !isRecord(value.wave)) return false;
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
