import type { DifficultyId, GameSpeed } from "../game/GameFlow.js";
import type { TargetingMode } from "../game/types.js";
import type { LevelId } from "../content/levels/levelDefinitions.js";

/** Read-only projections consumed by the UI. Game entities never cross this boundary. */
export interface HudView {
  readonly visible: boolean;
  readonly lives: number;
  readonly money: number;
  readonly score: number;
  readonly wave: number;
  readonly totalWaves: number;
  readonly enemiesRemaining: number;
  readonly waveInProgress: boolean;
  readonly countdown: number;
  readonly canStartWave: boolean;
  readonly earlyStartBonus: number;
  readonly nextWaveTitle: string;
  readonly nextWaveComposition: string;
  readonly speed: GameSpeed;
  readonly paused: boolean;
}

export interface AudioSettingsView {
  readonly enabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
}

export interface BuildOptionView {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly hotkey: string;
  readonly cost: number;
  readonly damage: number;
  readonly range: number;
  readonly fireRate: number;
  readonly available: boolean;
}

export interface UiMessageView {
  readonly kind: "info" | "success" | "error";
  readonly text: string;
}

export interface UpgradeDeltaView {
  readonly damage: number;
  readonly range: number;
  readonly fireRate: number;
}

export interface SelectedTowerView {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly damage: number;
  readonly range: number;
  readonly fireRate: number;
  readonly targeting: TargetingMode;
  readonly upgradeCost: number | null;
  readonly upgradeAffordable: boolean;
  readonly upgradeDelta: UpgradeDeltaView | null;
  readonly sellValue: number;
}

export interface EnemyTooltipView {
  readonly name: string;
  readonly type: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly reward: number;
  readonly baseDamage: number;
  readonly armorPercent: number;
  readonly effects: string;
}

export interface DifficultyOptionView {
  readonly id: DifficultyId;
  readonly name: string;
  readonly description: string;
  readonly startingGold: number;
  readonly lives: number;
}

export interface LevelOptionView {
  readonly id: LevelId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly bestScore: number;
  readonly bestDifficulty: DifficultyId | null;
}

export type OverlayView =
  | {
    readonly kind: "menu";
    readonly continueAvailable: boolean;
    readonly bestScore: number;
  }
  | {
    readonly kind: "level-select";
    readonly options: readonly LevelOptionView[];
  }
  | {
    readonly kind: "difficulty";
    readonly options: readonly DifficultyOptionView[];
  }
  | { readonly kind: "tutorial" }
  | { readonly kind: "none" }
  | { readonly kind: "paused" }
  | {
    readonly kind: "victory";
    readonly score: number;
    readonly bestScore: number;
    readonly levelName: string;
    readonly totalWaves: number;
    readonly nextLevelId: LevelId | null;
  }
  | { readonly kind: "defeat"; readonly wave: number; readonly score: number };

export interface UiView {
  readonly hud: HudView;
  readonly audio: AudioSettingsView;
  readonly buildOptions: readonly BuildOptionView[];
  readonly selectedTower: SelectedTowerView | null;
  readonly enemyTooltip: EnemyTooltipView | null;
  readonly overlay: OverlayView;
  readonly selectedBuildType: string | null;
  readonly message: UiMessageView | null;
}

/** Commands are intent messages. The game/application layer owns all mutations. */
export type UiCommand =
  | { readonly type: "open-level-select" }
  | { readonly type: "select-level"; readonly levelId: LevelId }
  | { readonly type: "next-level"; readonly levelId: LevelId }
  | { readonly type: "return-level-select" }
  | { readonly type: "open-difficulty" }
  | { readonly type: "new-game"; readonly difficulty: DifficultyId }
  | { readonly type: "continue-game" }
  | { readonly type: "complete-tutorial" }
  | { readonly type: "start-wave" }
  | { readonly type: "select-build"; readonly towerType: string }
  | { readonly type: "cancel-build" }
  | { readonly type: "upgrade-tower"; readonly towerId: string }
  | { readonly type: "sell-tower"; readonly towerId: string }
  | { readonly type: "set-targeting"; readonly towerId: string; readonly mode: TargetingMode }
  | { readonly type: "toggle-pause" }
  | { readonly type: "set-speed"; readonly speed: GameSpeed }
  | {
    readonly type: "set-audio";
    readonly enabled?: boolean;
    readonly musicVolume?: number;
    readonly sfxVolume?: number;
  }
  | { readonly type: "restart-game" }
  | { readonly type: "return-menu" };

export interface UiSelectors<State> {
  hud(state: State): HudView;
  audio(state: State): AudioSettingsView;
  buildOptions(state: State): readonly BuildOptionView[];
  selectedTower(state: State): SelectedTowerView | null;
  enemyTooltip(state: State): EnemyTooltipView | null;
  overlay(state: State): OverlayView;
  selectedBuildType(state: State): string | null;
  message(state: State): UiMessageView | null;
}

export interface StateReader<State> {
  getState(): State;
  subscribe(listener: () => void): () => void;
}

export type CommandDispatcher = (command: UiCommand) => void;

export function selectUiView<State>(state: State, selectors: UiSelectors<State>): UiView {
  return Object.freeze({
    hud: selectors.hud(state),
    audio: selectors.audio(state),
    buildOptions: selectors.buildOptions(state),
    selectedTower: selectors.selectedTower(state),
    enemyTooltip: selectors.enemyTooltip(state),
    overlay: selectors.overlay(state),
    selectedBuildType: selectors.selectedBuildType(state),
    message: selectors.message(state),
  });
}
