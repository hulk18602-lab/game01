import map01 from "../content/maps/map01.js";
import towerTypes from "../content/towers/towerTypes.js";
import waveDefinitions from "../content/waves/waveDefinitions.js";
import { GameLoop } from "../core/GameLoop.js";
import {
  cellKey,
  CommandValidationError,
  createRenderEntities,
  createRuntimeTower,
  PlaceTowerCommand,
  PlacementSystem,
  runtimeTowerColor,
  SellTowerCommand,
  UpgradeTowerCommand,
  type CellDefinition,
  type GameState,
  type Position,
  type RuntimeTower,
  type Tower,
} from "../game/index.js";
import { Grid, CoordinateConverter } from "../game/map/index.js";
import { CleanupSystem, CombatSystem, ProjectileSystem, StatusEffectSystem, TargetingSystem } from "../game/systems/index.js";
import { CanvasCoordinateConverter, KeyboardInputAdapter, PointerInputAdapter } from "../input/index.js";
import Path from "../path/Path.js";
import { Camera, DebugLayer, EffectLayer, EntityLayer, MapLayer, PlacementLayer, Renderer } from "../rendering/index.js";
import MovementSystem from "../systems/MovementSystem.js";
import WaveSystem from "../systems/WaveSystem.js";
import { GameUi, type OverlayView, type UiCommand, type UiMessageView, type UiSelectors } from "../ui/index.js";

type Mode = "playing" | "paused" | "victory" | "defeat";
type PlacementPreview = {
  readonly position: Position;
  readonly cellBounds: Position & { readonly width: number; readonly height: number };
  readonly range: number;
  readonly radius: number;
  readonly color: string;
  readonly valid: boolean;
};
type UiSnapshot = readonly [
  lives: number,
  money: number,
  waveIndex: number,
  waveInProgress: boolean,
  mode: Mode,
  selectedBuildType: string | null,
  selectedTowerId: string | null,
  messageKind: UiMessageView["kind"] | null,
  messageText: string | null,
  selectedTowerType: string | null,
  selectedTowerLevel: number | null,
  score: number,
];
type GameDebugApi = {
  readonly towers: readonly RuntimeTower[];
  readonly enemies: readonly any[];
  readonly projectiles: readonly any[];
  readonly lives: number;
  readonly gold: number;
  readonly currentWave: number;
};
type Runtime = GameState & {
  lives: number;
  mode: Mode;
  waveInProgress: boolean;
  selectedBuildType: string | null;
  selectedTowerId: string | null;
  placementPreview: PlacementPreview | null;
  message: UiMessageView | null;
  enemies: any[];
  runtimeTowers: RuntimeTower[];
  effects: any[];
  entities: any[];
  score: number;
};

declare global {
  interface Window {
    __GAME_DEBUG__?: GameDebugApi;
  }
}

const PLAYER = "player";
const levels = (definition: any) => [0, 1, 2].map((level) => ({
  cost: level === 0 ? definition.cost : Math.round(definition.cost * (0.7 + level * 0.3)),
  sellValue: Math.round(definition.cost * (0.5 + level * 0.2)),
}));

/** Browser composition root. Domain systems remain unaware of DOM and scheduling APIs. */
export class GameApplication {
  readonly #root: HTMLElement;
  readonly #canvas = document.createElement("canvas");
  readonly #grid = new Grid(map01);
  readonly #converter = new CoordinateConverter(map01.tileSize);
  readonly #path: Path;
  readonly #renderer: Renderer;
  readonly #loop: GameLoop;
  readonly #ui: GameUi<Runtime>;
  readonly #pointer: PointerInputAdapter;
  readonly #keyboard: KeyboardInputAdapter;
  readonly #screen: CanvasCoordinateConverter;
  readonly #listeners = new Set<() => void>();
  #state!: Runtime;
  #lastUiSnapshot: UiSnapshot | null = null;
  #movement: MovementSystem;
  #waves: WaveSystem;
  #targeting = new TargetingSystem();
  #combat = new CombatSystem();
  #projectiles = new ProjectileSystem();
  #effects = new StatusEffectSystem();
  #cleanup = new CleanupSystem();
  #placement = new PlacementSystem();
  #pointerPosition: Position | null = null;
  #nextTower = 1;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#canvas.className = "game-canvas";
    this.#canvas.width = map01.width * map01.tileSize;
    this.#canvas.height = map01.height * map01.tileSize;
    this.#canvas.setAttribute("aria-label", "Tower Defense battlefield");
    const context = this.#canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not supported");

    const route = map01.enemyRoute;
    if (route.length < 2 || route.some((cell) => !this.#grid.isWalkable(cell))) {
      throw new Error("Map has no valid enemy route");
    }
    this.#path = new Path(route.map((cell) => this.#converter.gridToWorld(cell, { center: true })));
    this.#movement = new MovementSystem(this.#path);
    this.#waves = new WaveSystem(waveDefinitions);
    const camera = new Camera({ viewportWidth: this.#canvas.width, viewportHeight: this.#canvas.height });
    this.#renderer = new (Renderer as any)({ context, camera, layers: [
      new (MapLayer as any)({ grid: this.#grid, converter: this.#converter }), new PlacementLayer(), new EntityLayer(), new EffectLayer(),
      new (DebugLayer as any)({ grid: this.#grid, converter: this.#converter }),
    ] });
    this.#loop = new (GameLoop as any)({
      schedule: (callback: FrameRequestCallback) => requestAnimationFrame(callback), cancel: (handle: number) => cancelAnimationFrame(handle),
      update: (delta: number) => this.#update(delta), render: () => this.#render(),
    });
    this.#state = this.#newState();
    if (import.meta.env.DEV) {
      const application = this;
      window.__GAME_DEBUG__ = {
        get towers() { return application.#state.runtimeTowers; },
        get enemies() { return application.#state.enemies; },
        get projectiles() { return application.#projectiles.projectiles; },
        get lives() { return application.#state.lives; },
        get gold() { return application.#state.players.get(PLAYER)!.balance; },
        get currentWave() { return application.#waves.waveIndex + 1; },
      };
    }
    this.#ui = new GameUi(this, this.#selectors(), (command) => this.#dispatch(command));
    this.#screen = new CanvasCoordinateConverter(this.#canvas, this.#canvas.width, this.#canvas.height);
    this.#pointer = new PointerInputAdapter(this.#canvas, this.#screen, (event) => {
      if (event.phase === "move") this.#onPointerMove(event.position);
      else if (event.phase === "cancel") this.#clearPointer();
      else if (event.phase === "down" && event.button === 0) this.#onPointer(event.position);
    });
    this.#keyboard = new KeyboardInputAdapter(window, (event) => {
      if (event.phase !== "down" || event.repeat) return;
      if (event.code === "Escape") {
        this.#dispatch(this.#state.selectedBuildType ? { type: "cancel-build" } : { type: "toggle-pause" });
      } else if (event.code === "KeyP") this.#dispatch({ type: "toggle-pause" });
      else if (event.code === "Space") this.#dispatch({ type: "start-wave" });
    });
    window.addEventListener("pointerdown", this.#outsidePointer);
  }

  getState(): Runtime { return this.#state; }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }

  start(): void {
    this.#root.replaceChildren(this.#canvas);
    this.#ui.mount(this.#root);
    this.#lastUiSnapshot = this.#uiSnapshot();
    this.#render();
    this.#loop.start();
  }

  destroy(): void {
    this.#loop.stop();
    this.#pointer.destroy();
    this.#keyboard.destroy();
    window.removeEventListener("pointerdown", this.#outsidePointer);
    if (import.meta.env.DEV) delete window.__GAME_DEBUG__;
    this.#ui.unmount();
  }

  readonly #outsidePointer = (event: PointerEvent): void => {
    if (!this.#state.selectedBuildType || event.button !== 0) return;
    const target = event.target;
    if (target instanceof Node && (this.#canvas.contains(target) || this.#ui.element.contains(target))) return;
    this.#onPointer(this.#screen.screenToWorld({ x: event.clientX, y: event.clientY }));
  };

  #newState(): Runtime {
    return {
      width: map01.width, height: map01.height,
      players: new Map([[PLAYER, { id: PLAYER, balance: 350 }]]), towers: new Map(), occupiedCells: new Map(),
      towerDefinitions: new Map(Object.values(towerTypes).map((tower: any) => [tower.id, { type: tower.id, levels: levels(tower) }])),
      cells: this.#mapCells(),
      lives: 20, mode: "playing", waveInProgress: false, selectedBuildType: null, selectedTowerId: null,
      placementPreview: null, message: null,
      enemies: [], runtimeTowers: [], effects: [], entities: [], score: 0,
    };
  }

  #mapCells(): ReadonlyMap<string, CellDefinition> {
    const cells = new Map<string, CellDefinition>();
    this.#grid.forEach((tile: any, position: Position) => {
      cells.set(cellKey(position), {
        terrain: tile.id,
        walkable: tile.walkable === true,
        buildable: tile.buildable === true,
      });
    });
    return cells;
  }

  #update(delta: number): void {
    if (this.#state.mode !== "playing") return;
    this.#updateVisualEffects(delta);
    const spawned: any[] = this.#waves.update(delta);
    for (const enemy of spawned) enemy.position = this.#path.getPointAt(0);
    this.#state.enemies.push(...spawned);
    this.#effects.update(delta, this.#state.enemies);
    const reached = this.#movement.update(this.#state.enemies, delta);
    (this.#movement as any).handleBaseReached(reached, (enemy: any) => { this.#state.lives -= enemy.baseDamage; });
    this.#targeting.update(this.#state.runtimeTowers, this.#state.enemies);
    this.#combat.update(delta, this.#state.runtimeTowers, this.#state.enemies, this.#projectiles);
    this.#projectiles.update(delta, this.#state.enemies, this.#effects);
    this.#recordCombatEvents(this.#projectiles.drainEvents());
    const before = this.#state.players.get(PLAYER)!.balance;
    const wallet = { currency: before };
    this.#cleanup.update(this.#state.enemies, wallet);
    this.#state.players.get(PLAYER)!.balance = wallet.currency;
    this.#state.score += wallet.currency - before;
    this.#state.waveInProgress = this.#waves.active || this.#state.enemies.length > 0;
    if (this.#state.lives <= 0) this.#finish("defeat");
    else if (this.#waves.waveIndex === waveDefinitions.length - 1 && !this.#state.waveInProgress) this.#finish("victory");
    this.#emitUiIfChanged();
  }

  #render(): void {
    this.#state.entities = createRenderEntities(
      this.#state.runtimeTowers,
      this.#state.enemies,
      this.#projectiles.projectiles,
    );
    this.#renderer.render(this.#state);
  }

  #dispatch(command: UiCommand): void {
    try {
      if (command.type === "start-wave") {
        if (this.#state.mode !== "playing") {
          throw new CommandValidationError("Resume the game before starting a wave.");
        }
        if (this.#state.waveInProgress) {
          throw new CommandValidationError("A wave is already in progress.");
        }
        if (!this.#waves.start()) {
          throw new CommandValidationError("No wave is available to start.");
        }
        this.#state.waveInProgress = true;
        this.#showMessage("Wave started.", "info");
      } else if (command.type === "select-build") {
        const definition = towerTypes[command.towerType as keyof typeof towerTypes];
        if (!definition) throw new CommandValidationError("Unknown tower type.");
        this.#state.selectedBuildType = command.towerType;
        this.#state.selectedTowerId = null;
        this.#showMessage(`Building ${definition.name}. Choose a cell.`, "info");
        this.#refreshPlacementPreview();
      } else if (command.type === "cancel-build") {
        this.#cancelBuild();
      } else if (command.type === "toggle-pause") {
        if (["victory", "defeat"].includes(this.#state.mode)) {
          throw new CommandValidationError("Restart the game to continue playing.");
        }
        this.#state.mode = this.#state.mode === "paused" ? "playing" : "paused";
      } else if (command.type === "upgrade-tower") {
        this.#upgrade(command.towerId);
        this.#showMessage("Tower upgraded.", "success");
      } else if (command.type === "sell-tower") {
        this.#sell(command.towerId);
        this.#showMessage("Tower sold.", "success");
      } else if (command.type === "restart-game") this.#restart();
    } catch (error) {
      this.#reportError(error);
    }
    this.#emitUiIfChanged(); this.#render();
  }

  #onPointerMove(point: Position): void {
    this.#pointerPosition = point;
    this.#refreshPlacementPreview();
    this.#render();
  }

  #clearPointer(): void {
    this.#pointerPosition = null;
    this.#state.placementPreview = null;
    this.#render();
  }

  #onPointer(point: Position): void {
    if (this.#state.mode !== "playing") return;
    this.#pointerPosition = point;
    if (this.#state.selectedBuildType) {
      this.#placeSelectedTower(point);
      return;
    }

    const selected = this.#state.runtimeTowers.find((tower) =>
      Math.hypot(tower.position.x - point.x, tower.position.y - point.y) < 24
    );
    this.#state.selectedTowerId = selected?.id ?? null;
    this.#emitUiIfChanged();
    this.#render();
  }

  #placeSelectedTower(point: Position): void {
    const type = this.#state.selectedBuildType;
    if (!type) return;
    const cell = this.#converter.worldToGrid(point);
    const validationError = this.#placementError(type, cell);
    if (validationError) {
      this.#showMessage(validationError, "error");
      this.#refreshPlacementPreview();
      this.#emitUiIfChanged();
      this.#render();
      return;
    }

    try {
      const id = `tower-${this.#nextTower}`;
      const tower = new PlaceTowerCommand(PLAYER, id, type, cell).execute(this.#state);
      this.#addRuntimeTower(tower);
      this.#nextTower += 1;
      this.#state.selectedTowerId = null;
      this.#showMessage(`${towerTypes[type as keyof typeof towerTypes].name} built.`, "success");
    } catch (error) {
      this.#reportError(error);
    }
    this.#refreshPlacementPreview();
    this.#emitUiIfChanged();
    this.#render();
  }

  #placementError(type: string, cell: Position): string | null {
    try {
      this.#placement.validateCell(this.#state, cell);
      const definition = this.#state.towerDefinitions.get(type);
      if (!definition) throw new CommandValidationError("Unknown tower type.");
      const cost = definition.levels[0]?.cost;
      if (cost === undefined) throw new CommandValidationError("Tower has no placement cost.");
      if (this.#state.players.get(PLAYER)!.balance < cost) {
        throw new CommandValidationError("Not enough money for this tower.");
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Tower placement failed.";
    }
  }

  #refreshPlacementPreview(): void {
    const type = this.#state.selectedBuildType;
    if (!type || !this.#pointerPosition) {
      this.#state.placementPreview = null;
      return;
    }
    const definition: any = towerTypes[type as keyof typeof towerTypes];
    if (!definition) {
      this.#state.placementPreview = null;
      return;
    }
    const cell = this.#converter.worldToGrid(this.#pointerPosition);
    this.#state.placementPreview = {
      position: this.#converter.gridToWorld(cell, { center: true }),
      cellBounds: this.#converter.gridRect(cell),
      range: definition.range,
      radius: 18,
      color: runtimeTowerColor(type),
      valid: this.#placementError(type, cell) === null,
    };
  }

  #cancelBuild(): void {
    this.#state.selectedBuildType = null;
    this.#state.placementPreview = null;
    this.#showMessage("Building cancelled.", "info");
  }

  #addRuntimeTower(tower: Tower): void {
    const definition: any = towerTypes[tower.type as keyof typeof towerTypes];
    const position = this.#converter.gridToWorld(tower.position, { center: true });
    this.#state.runtimeTowers.push(createRuntimeTower(tower, definition, position));
  }

  #showMessage(text: string, kind: UiMessageView["kind"]): void {
    this.#state.message = { text, kind };
  }

  #reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    this.#showMessage(message, "error");
    if (!(error instanceof CommandValidationError)) console.error(error);
  }

  #recordCombatEvents(events: readonly any[]): void {
    for (const event of events) {
      if (event.type === "shot") {
        this.#state.effects.push({
          type: "shot",
          position: { ...event.position },
          radius: 8,
          color: "#fef08a",
          fill: true,
          duration: 0.12,
          remaining: 0.12,
          opacity: 1,
        });
      } else if (event.type === "hit") {
        this.#state.effects.push(
          {
            type: "hit",
            position: { ...event.position },
            radius: 9,
            color: "#f8fafc",
            duration: 0.18,
            remaining: 0.18,
            opacity: 1,
          },
          {
            type: "damage",
            position: { x: event.position.x, y: event.position.y - 18 },
            text: `-${Math.round(event.damage)}`,
            color: "#fef2f2",
            duration: 0.55,
            remaining: 0.55,
            rise: 22,
            opacity: 1,
          },
        );
      } else if (event.type === "enemy-death") {
        this.#state.effects.push({
          type: "enemy-death",
          position: { ...event.position },
          radius: 14,
          growth: 45,
          color: "#fb7185",
          duration: 0.45,
          remaining: 0.45,
          opacity: 1,
        });
      }
    }
  }

  #updateVisualEffects(delta: number): void {
    for (const effect of this.#state.effects) {
      effect.remaining -= delta;
      effect.opacity = Math.max(0, effect.remaining / effect.duration);
      if (effect.growth) effect.radius += effect.growth * delta;
      if (effect.rise) {
        effect.position = {
          x: effect.position.x,
          y: effect.position.y - effect.rise * delta,
        };
      }
    }
    this.#state.effects = this.#state.effects.filter((effect) => effect.remaining > 0);
  }

  #upgrade(id: string): void {
    const tower = new UpgradeTowerCommand(PLAYER, id).execute(this.#state);
    const index = this.#state.runtimeTowers.findIndex((item) => item.id === id);
    if (index >= 0) this.#state.runtimeTowers.splice(index, 1);
    this.#addRuntimeTower(tower);
  }
  #sell(id: string): void { new SellTowerCommand(PLAYER, id).execute(this.#state); this.#state.runtimeTowers = this.#state.runtimeTowers.filter((tower) => tower.id !== id); this.#state.selectedTowerId = null; }
  #finish(mode: "victory" | "defeat"): void { this.#state.mode = mode; }
  #restart(): void { this.#waves = new WaveSystem(waveDefinitions); this.#projectiles = new ProjectileSystem(); this.#pointerPosition = null; this.#state = this.#newState(); this.#nextTower = 1; }
  #uiSnapshot(): UiSnapshot {
    const selected = this.#state.towers.get(this.#state.selectedTowerId ?? "");
    return [
      this.#state.lives,
      this.#state.players.get(PLAYER)!.balance,
      this.#waves.waveIndex,
      this.#state.waveInProgress,
      this.#state.mode,
      this.#state.selectedBuildType,
      this.#state.selectedTowerId,
      this.#state.message?.kind ?? null,
      this.#state.message?.text ?? null,
      selected?.type ?? null,
      selected?.level ?? null,
      this.#state.score,
    ];
  }

  #emitUiIfChanged(): void {
    const next = this.#uiSnapshot();
    const previous = this.#lastUiSnapshot;
    if (previous && previous.every((value, index) => value === next[index])) return;
    this.#lastUiSnapshot = next;
    for (const listener of this.#listeners) listener();
  }

  #selectors(): UiSelectors<Runtime> {
    return {
      hud: (s) => ({ lives: s.lives, money: s.players.get(PLAYER)!.balance, wave: s.waveInProgress ? this.#waves.waveIndex + 1 : Math.max(0, this.#waves.waveIndex + 1), totalWaves: waveDefinitions.length, waveInProgress: s.waveInProgress }),
      buildOptions: (s) => Object.values(towerTypes).map((tower: any) => ({ type: tower.id, name: tower.name, cost: tower.cost, available: s.players.get(PLAYER)!.balance >= tower.cost })),
      selectedTower: (s) => { const tower = s.towers.get(s.selectedTowerId ?? ""); if (!tower) return null; const definition: any = towerTypes[tower.type as keyof typeof towerTypes]; const next = s.towerDefinitions.get(tower.type)!.levels[tower.level + 1]; return { id: tower.id, name: definition.name, level: tower.level + 1, damage: Math.round(definition.damage * (1 + tower.level * .5)), range: Math.round(definition.range * (1 + tower.level * .12)), upgradeCost: next?.cost ?? null, sellValue: s.towerDefinitions.get(tower.type)!.levels[tower.level]!.sellValue }; },
      overlay: (s): OverlayView => s.mode === "paused" ? { kind: "paused" } : s.mode === "victory" ? { kind: "victory", score: s.score } : s.mode === "defeat" ? { kind: "defeat", wave: this.#waves.waveIndex + 1 } : { kind: "none" },
      selectedBuildType: (s) => s.selectedBuildType,
      message: (s) => s.message,
    };
  }
}
