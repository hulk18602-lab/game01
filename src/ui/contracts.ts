/** Read-only projections consumed by the UI. Game entities never cross this boundary. */
export interface HudView {
  readonly lives: number;
  readonly money: number;
  readonly wave: number;
  readonly totalWaves: number;
  readonly waveInProgress: boolean;
}

export interface BuildOptionView {
  readonly type: string;
  readonly name: string;
  readonly cost: number;
  readonly available: boolean;
}

export interface SelectedTowerView {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly damage: number;
  readonly range: number;
  readonly upgradeCost: number | null;
  readonly sellValue: number;
}

export type OverlayView =
  | { readonly kind: "none" }
  | { readonly kind: "paused" }
  | { readonly kind: "victory"; readonly score: number }
  | { readonly kind: "defeat"; readonly wave: number };

export interface UiView {
  readonly hud: HudView;
  readonly buildOptions: readonly BuildOptionView[];
  readonly selectedTower: SelectedTowerView | null;
  readonly overlay: OverlayView;
  readonly selectedBuildType: string | null;
}

/** Commands are intent messages. The game/application layer owns all mutations. */
export type UiCommand =
  | { readonly type: "start-wave" }
  | { readonly type: "select-build"; readonly towerType: string }
  | { readonly type: "cancel-build" }
  | { readonly type: "upgrade-tower"; readonly towerId: string }
  | { readonly type: "sell-tower"; readonly towerId: string }
  | { readonly type: "toggle-pause" }
  | { readonly type: "restart-game" };

export interface UiSelectors<State> {
  hud(state: State): HudView;
  buildOptions(state: State): readonly BuildOptionView[];
  selectedTower(state: State): SelectedTowerView | null;
  overlay(state: State): OverlayView;
  selectedBuildType(state: State): string | null;
}

export interface StateReader<State> {
  getState(): State;
  subscribe(listener: () => void): () => void;
}

export type CommandDispatcher = (command: UiCommand) => void;

export function selectUiView<State>(state: State, selectors: UiSelectors<State>): UiView {
  return Object.freeze({
    hud: selectors.hud(state),
    buildOptions: selectors.buildOptions(state),
    selectedTower: selectors.selectedTower(state),
    overlay: selectors.overlay(state),
    selectedBuildType: selectors.selectedBuildType(state),
  });
}
