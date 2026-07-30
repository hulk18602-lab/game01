import map01 from "../content/maps/map01.js";
import testMap from "../content/maps/mapTest.js";
import testWaves from "../content/waves/testWaveDefinitions.js";
import { GameLoop } from "../core/GameLoop.js";
import {
  CampaignSession,
  type CampaignRuntime,
  type EnemyEntity,
  type MapDefinition,
  type ProjectileEntity,
  type VisualEffect,
  type WaveDefinition,
} from "../game/CampaignSession.js";
import type { GameSpeed } from "../game/GameFlow.js";
import type { Position, RuntimeTower, TargetingMode } from "../game/index.js";
import { CanvasCoordinateConverter, KeyboardInputAdapter, PointerInputAdapter } from "../input/index.js";
import {
  Camera,
  DebugLayer,
  EffectLayer,
  EntityLayer,
  MapLayer,
  PlacementLayer,
  Renderer,
} from "../rendering/index.js";
import {
  GameUi,
  type UiCommand,
} from "../ui/index.js";
import { createUiSelectors, isGameplayPhase } from "./createUiSelectors.js";

interface RenderState {
  runtimeTowers: readonly RuntimeTower[];
  enemies: readonly EnemyEntity[];
  projectiles: readonly ProjectileEntity[];
  effects: readonly VisualEffect[];
  placementPreview: CampaignRuntime["placementPreview"];
  selectedTowerRange: { readonly position: Position; readonly range: number } | null;
}

interface CanvasLayer {
  render(
    context: CanvasRenderingContext2D,
    state: RenderState,
    camera: InstanceType<typeof Camera>,
  ): void;
}

interface RendererPort {
  render(state: RenderState): void;
}

interface GameLoopPort {
  start(): boolean;
  stop(): boolean;
}

type RendererConstructor = new (options: {
  readonly context: CanvasRenderingContext2D;
  readonly camera: InstanceType<typeof Camera>;
  readonly layers: readonly CanvasLayer[];
}) => RendererPort;

type GameLoopConstructor = new (options: {
  readonly schedule: (callback: FrameRequestCallback) => number;
  readonly cancel: (handle: number) => void;
  readonly update: (delta: number) => void;
  readonly render: () => void;
}) => GameLoopPort;

type MapLayerConstructor = new (options: {
  readonly grid: unknown;
  readonly converter: unknown;
}) => CanvasLayer;

type DebugLayerConstructor = new (options: {
  readonly grid: unknown;
  readonly converter: unknown;
}) => CanvasLayer;

interface GameDebugApi {
  readonly towers: readonly RuntimeTower[];
  readonly enemies: readonly EnemyEntity[];
  readonly projectiles: readonly ProjectileEntity[];
  readonly lives: number;
  readonly gold: number;
  readonly score: number;
  readonly currentWave: number;
  readonly phase: string;
  readonly speed: GameSpeed;
}

declare global {
  interface Window {
    __GAME_DEBUG__?: GameDebugApi;
  }
}

/** Browser composition root: input, Canvas, scheduling and UI adapters only. */
export class GameApplication {
  readonly #root: HTMLElement;
  readonly #canvas = document.createElement("canvas");
  readonly #session: CampaignSession;
  readonly #renderer: RendererPort;
  readonly #loop: GameLoopPort;
  readonly #ui: GameUi<CampaignRuntime>;
  readonly #pointer: PointerInputAdapter;
  readonly #keyboard: KeyboardInputAdapter;
  readonly #screen: CanvasCoordinateConverter;
  readonly #renderState: RenderState = {
    runtimeTowers: [],
    enemies: [],
    projectiles: [],
    effects: [],
    placementPreview: null,
    selectedTowerRange: null,
  };

  constructor(root: HTMLElement) {
    this.#root = root;
    const shortScenario = import.meta.env.DEV
      && new URLSearchParams(window.location.search).get("scenario") === "short";
    this.#session = new CampaignSession({
      map: (shortScenario ? testMap : map01) as unknown as MapDefinition,
      waves: (shortScenario ? testWaves : undefined) as unknown as readonly WaveDefinition[] | undefined,
    });

    const worldWidth = this.#session.map.width * this.#session.map.tileSize;
    const worldHeight = this.#session.map.height * this.#session.map.tileSize;
    this.#canvas.className = "game-canvas";
    this.#canvas.width = worldWidth;
    this.#canvas.height = worldHeight;
    this.#canvas.style.aspectRatio = `${worldWidth} / ${worldHeight}`;
    this.#canvas.setAttribute("aria-label", "Tower Defense battlefield");
    const context = this.#canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not supported");

    const camera = new Camera({
      viewportWidth: worldWidth,
      viewportHeight: worldHeight,
    });
    const RendererAdapter = Renderer as unknown as RendererConstructor;
    const MapLayerAdapter = MapLayer as unknown as MapLayerConstructor;
    const DebugLayerAdapter = DebugLayer as unknown as DebugLayerConstructor;
    this.#renderer = new RendererAdapter({
      context,
      camera,
      layers: [
        new MapLayerAdapter({ grid: this.#session.grid, converter: this.#session.converter }),
        new PlacementLayer() as unknown as CanvasLayer,
        new EntityLayer() as unknown as CanvasLayer,
        new EffectLayer() as unknown as CanvasLayer,
        new DebugLayerAdapter({ grid: this.#session.grid, converter: this.#session.converter }),
      ],
    });
    const GameLoopAdapter = GameLoop as unknown as GameLoopConstructor;
    this.#loop = new GameLoopAdapter({
      schedule: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
      cancel: (handle: number) => cancelAnimationFrame(handle),
      update: (delta: number) => this.#session.update(delta),
      render: () => this.#render(),
    });
    this.#ui = new GameUi(
      this.#session,
      createUiSelectors(this.#session),
      (command) => this.#dispatch(command),
    );
    this.#screen = new CanvasCoordinateConverter(this.#canvas, worldWidth, worldHeight);
    this.#pointer = new PointerInputAdapter(this.#canvas, this.#screen, (event) => {
      if (event.phase === "move") {
        this.#session.updatePointer(event.position);
      } else if (event.phase === "cancel") {
        this.#session.updatePointer(null);
      } else if (event.phase === "down" && event.button === 0) {
        this.#run(() => this.#session.handleBattlefieldClick(event.position));
      }
    });
    this.#keyboard = new KeyboardInputAdapter(window, (event) => {
      if (event.phase === "down" && !event.repeat) this.#onKey(event.code);
    });
    this.#installDebugApi();
  }

  start(): void {
    this.#root.replaceChildren(this.#canvas);
    this.#ui.mount(this.#root);
    this.#render();
    this.#loop.start();
  }

  destroy(): void {
    this.#loop.stop();
    this.#pointer.destroy();
    this.#keyboard.destroy();
    if (import.meta.env.DEV) delete window.__GAME_DEBUG__;
    this.#ui.unmount();
  }

  #dispatch(command: UiCommand): void {
    this.#run(() => {
      switch (command.type) {
        case "open-difficulty":
          this.#session.openDifficulty();
          break;
        case "new-game":
          this.#session.newGame(command.difficulty);
          break;
        case "continue-game":
          this.#session.continueGame();
          break;
        case "complete-tutorial":
          this.#session.completeTutorial();
          break;
        case "start-wave":
          this.#session.startWave(true);
          break;
        case "select-build":
          this.#session.selectBuild(command.towerType);
          break;
        case "cancel-build":
          this.#session.cancelAction();
          break;
        case "upgrade-tower":
          this.#session.upgradeTower(command.towerId);
          break;
        case "sell-tower":
          this.#session.sellTower(command.towerId);
          break;
        case "set-targeting":
          this.#session.setTargeting(command.towerId, command.mode);
          break;
        case "toggle-pause":
          this.#session.togglePause();
          break;
        case "set-speed":
          this.#session.setSpeed(command.speed);
          break;
        case "restart-game":
          this.#session.restart();
          break;
        case "return-menu":
          this.#session.returnToMenu();
          break;
      }
    });
  }

  #onKey(code: string): void {
    const state = this.#session.getState();
    if (code === "Escape") {
      if (state.selectedBuildType || state.selectedTowerId) {
        this.#run(() => this.#session.cancelAction());
      } else if (isGameplayPhase(this.#session.phase)) {
        this.#run(() => this.#session.togglePause());
      } else if (this.#session.phase === "difficulty" || this.#session.phase === "tutorial") {
        this.#session.returnToMenu();
      }
      return;
    }
    if (code === "KeyP") {
      this.#run(() => this.#session.togglePause());
      return;
    }
    if (code === "Space") {
      if (this.#session.canStartWave) this.#run(() => this.#session.startWave(true));
      return;
    }
    const tower = this.#session.towerOptions.find((option) => `Digit${option.hotkey}` === code);
    if (tower) {
      this.#run(() => this.#session.selectBuild(tower.id));
      return;
    }
    if (code === "KeyU" && state.selectedTowerId) {
      this.#run(() => this.#session.upgradeTower(state.selectedTowerId!));
    } else if ((code === "Delete" || code === "KeyS") && state.selectedTowerId) {
      this.#run(() => this.#session.sellTower(state.selectedTowerId!));
    } else if (code === "KeyT" && state.selectedTowerId) {
      this.#run(() => this.#session.cycleSelectedTargeting());
    } else if (code === "Digit0") {
      const next = (this.#session.speed % 3 + 1) as GameSpeed;
      this.#session.setSpeed(next);
    }
  }

  #run(action: () => void): void {
    try {
      action();
    } catch (error) {
      this.#session.reportError(error);
    }
    this.#render();
  }

  #render(): void {
    const state = this.#session.getState();
    this.#renderState.runtimeTowers = state.runtimeTowers;
    this.#renderState.enemies = state.enemies;
    this.#renderState.projectiles = this.#session.projectiles;
    this.#renderState.effects = state.effects;
    this.#renderState.placementPreview = state.placementPreview;
    this.#renderState.selectedTowerRange = this.#session.selectedTowerRange;
    this.#renderer.render(this.#renderState);
  }

  #installDebugApi(): void {
    if (!import.meta.env.DEV) return;
    const session = this.#session;
    window.__GAME_DEBUG__ = {
      get towers() { return session.getState().runtimeTowers; },
      get enemies() { return session.getState().enemies; },
      get projectiles() { return session.projectiles; },
      get lives() { return session.getState().lives; },
      get gold() { return session.getState().players.get("player")!.balance; },
      get score() { return session.getState().score; },
      get currentWave() { return session.currentWaveNumber; },
      get phase() { return session.phase; },
      get speed() { return session.speed; },
    };
  }
}
