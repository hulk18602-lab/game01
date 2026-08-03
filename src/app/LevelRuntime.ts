import type { LevelDefinition } from "../content/levels/levelDefinitions.js";
import testMap from "../content/maps/mapTest.js";
import testWaves from "../content/waves/testWaveDefinitions.js";
import {
  CampaignSession,
  type CampaignRuntime,
  type EnemyEntity,
  type MapDefinition,
  type ProjectileEntity,
  type VisualEffect,
  type WaveDefinition,
} from "../game/CampaignSession.js";
import type { GameStorage } from "../game/persistence/GameStorage.js";
import type { Position, RuntimeTower } from "../game/index.js";
import { CanvasCoordinateConverter, PointerInputAdapter } from "../input/index.js";
import {
  Camera,
  DebugLayer,
  EffectLayer,
  EntityLayer,
  HeroLayer,
  MapLayer,
  PlacementLayer,
  Renderer,
} from "../rendering/index.js";
import MonsterSpriteRenderer from "../rendering/monsters/MonsterSpriteRenderer.js";
import { GameUi, type UiCommand } from "../ui/index.js";
import type { AudioManager } from "../audio/AudioManager.js";
import { createUiSelectors } from "./createUiSelectors.js";

interface RenderState {
  runtimeTowers: readonly RuntimeTower[];
  enemies: readonly EnemyEntity[];
  projectiles: readonly ProjectileEntity[];
  effects: readonly VisualEffect[];
  placementPreview: CampaignRuntime["placementPreview"];
  selectedTowerRange: { readonly position: Position; readonly range: number } | null;
  hero: CampaignRuntime["hero"];
  selectedHeroId: string | null;
  visualTime: number;
  reducedMotion: boolean;
  shakeOffset: { x: number; y: number };
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

type RendererConstructor = new (options: {
  readonly context: CanvasRenderingContext2D;
  readonly camera: InstanceType<typeof Camera>;
  readonly layers: readonly CanvasLayer[];
}) => RendererPort;

type MapLayerConstructor = new (options: {
  readonly grid: unknown;
  readonly converter: unknown;
}) => CanvasLayer;

type DebugLayerConstructor = new (options: {
  readonly grid: unknown;
  readonly converter: unknown;
}) => CanvasLayer;

export interface LevelRuntimeOptions {
  readonly root: HTMLElement;
  readonly level: LevelDefinition;
  readonly levels: readonly LevelDefinition[];
  readonly storage: GameStorage;
  readonly audio: AudioManager;
  readonly shortScenario: boolean;
  readonly reducedMotion: boolean;
  readonly dispatch: (command: UiCommand) => void;
  readonly run: (action: () => void) => void;
}

/** Owns every browser adapter tied to one immutable LevelDefinition. */
export class LevelRuntime {
  readonly canvas = document.createElement("canvas");
  readonly session: CampaignSession;
  readonly worldWidth: number;
  readonly worldHeight: number;

  readonly #root: HTMLElement;
  readonly #audio: AudioManager;
  readonly #camera: InstanceType<typeof Camera>;
  readonly #renderer: RendererPort;
  readonly #ui: GameUi<CampaignRuntime>;
  readonly #pointer: PointerInputAdapter;
  readonly #unsubscribePresentation: () => void;
  readonly #visualStartedAt = performance.now();
  readonly #renderState: RenderState = {
    runtimeTowers: [],
    enemies: [],
    projectiles: [],
    effects: [],
    placementPreview: null,
    selectedTowerRange: null,
    hero: null,
    selectedHeroId: null,
    visualTime: 0,
    reducedMotion: false,
    shakeOffset: { x: 0, y: 0 },
  };
  readonly #preventContextMenu = (event: Event): void => event.preventDefault();
  #mounted = false;

  constructor(options: LevelRuntimeOptions) {
    this.#root = options.root;
    this.#audio = options.audio;
    const useShortScenario = options.shortScenario && options.level.id === "level-1";
    this.session = new CampaignSession({
      levelId: options.level.id,
      map: (useShortScenario ? testMap : options.level.map) as unknown as MapDefinition,
      waves: (useShortScenario ? testWaves : options.level.waves) as unknown as readonly WaveDefinition[],
      availableTowerTypes: options.level.availableTowerTypes,
      availableEnemyTypes: options.level.availableEnemyTypes,
      contentVersion: useShortScenario ? 1001 : options.level.contentVersion,
      levels: options.levels,
      storage: options.storage,
    });
    this.session.setReducedMotion(options.reducedMotion);
    this.#unsubscribePresentation = this.session.subscribePresentation(
      (cue) => this.#audio.play(cue),
    );

    this.worldWidth = this.session.map.width * this.session.map.tileSize;
    this.worldHeight = this.session.map.height * this.session.map.tileSize;
    this.canvas.className = "game-canvas";
    this.canvas.width = this.worldWidth;
    this.canvas.height = this.worldHeight;
    this.canvas.style.aspectRatio = `${this.worldWidth} / ${this.worldHeight}`;
    this.canvas.setAttribute("aria-label", `${this.session.levelName} battlefield`);
    this.canvas.dataset.mapId = this.session.map.id;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not supported");

    this.#camera = new Camera({
      viewportWidth: this.worldWidth,
      viewportHeight: this.worldHeight,
    });
    const RendererAdapter = Renderer as unknown as RendererConstructor;
    const MapLayerAdapter = MapLayer as unknown as MapLayerConstructor;
    const DebugLayerAdapter = DebugLayer as unknown as DebugLayerConstructor;
    const monsterRenderer = new MonsterSpriteRenderer();
    void monsterRenderer.preload((progress) => {
      this.canvas.dataset.monsterLoadingProgress = progress.toFixed(2);
    });
    this.#renderer = new RendererAdapter({
      context,
      camera: this.#camera,
      layers: [
        new MapLayerAdapter({ grid: this.session.grid, converter: this.session.converter }),
        new PlacementLayer() as unknown as CanvasLayer,
        new EntityLayer({ monsterRenderer }) as unknown as CanvasLayer,
        new HeroLayer() as unknown as CanvasLayer,
        new EffectLayer() as unknown as CanvasLayer,
        new DebugLayerAdapter({ grid: this.session.grid, converter: this.session.converter }),
      ],
    });
    this.#ui = new GameUi(
      this.session,
      createUiSelectors(this.session),
      options.dispatch,
    );
    const screen = new CanvasCoordinateConverter(this.canvas, this.worldWidth, this.worldHeight);
    this.#pointer = new PointerInputAdapter(this.canvas, screen, (event) => {
      if (event.phase === "move") {
        this.session.updatePointer(event.position);
      } else if (event.phase === "cancel") {
        this.session.updatePointer(null);
      } else if (event.phase === "down" && event.button === 0) {
        options.run(() => this.session.handleBattlefieldClick(event.position));
      } else if (event.phase === "down" && event.button === 2) {
        options.run(() => this.session.moveHero(event.position));
      }
    });
    this.canvas.addEventListener("contextmenu", this.#preventContextMenu);
  }

  mount(): void {
    if (this.#mounted) return;
    this.#root.replaceChildren(this.canvas);
    this.#ui.mount(this.#root);
    this.#mounted = true;
    this.resize();
    this.render();
  }

  destroy(): void {
    this.#pointer.destroy();
    this.canvas.removeEventListener("contextmenu", this.#preventContextMenu);
    this.#unsubscribePresentation();
    this.#ui.unmount();
    this.canvas.remove();
    this.#mounted = false;
  }

  update(deltaSeconds: number): void {
    this.session.update(deltaSeconds);
  }

  setHeroMovementInput(x: number, y: number): void {
    this.session.setHeroMovementInput({ x, y });
  }

  setReducedMotion(reduced: boolean): void {
    this.session.setReducedMotion(reduced);
  }

  render(): void {
    const state = this.session.getState();
    this.#renderState.runtimeTowers = state.runtimeTowers;
    this.#renderState.enemies = state.enemies;
    this.#renderState.projectiles = this.session.projectiles;
    this.#renderState.effects = state.effects;
    this.#renderState.placementPreview = state.placementPreview;
    this.#renderState.selectedTowerRange = this.session.selectedTowerRange;
    this.#renderState.hero = state.hero;
    this.#renderState.selectedHeroId = state.selectedHeroId;
    const visualTime = state.reducedMotion
      ? 0
      : (performance.now() - this.#visualStartedAt) / 1000;
    this.#renderState.visualTime = visualTime;
    this.#renderState.reducedMotion = state.reducedMotion;
    const shake = state.reducedMotion ? 0 : state.screenShake;
    this.#renderState.shakeOffset.x = shake === 0 ? 0 : Math.sin(visualTime * 47) * shake;
    this.#renderState.shakeOffset.y = shake === 0 ? 0 : Math.cos(visualTime * 39) * shake * 0.72;
    this.#renderer.render(this.#renderState);
  }

  resize(): void {
    const availableWidth = Math.max(1, window.innerWidth - 24);
    const availableHeight = Math.max(1, window.innerHeight - 24);
    const cssScale = Math.min(
      1,
      availableWidth / this.worldWidth,
      availableHeight / this.worldHeight,
    );
    const cssWidth = Math.max(1, Math.round(this.worldWidth * cssScale));
    const cssHeight = Math.max(1, Math.round(this.worldHeight * cssScale));
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const backingWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
    const backingHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.#camera.viewportWidth = backingWidth;
    this.#camera.viewportHeight = backingHeight;
    this.#camera.zoom = Math.min(
      backingWidth / this.worldWidth,
      backingHeight / this.worldHeight,
    );
  }
}

export default LevelRuntime;
