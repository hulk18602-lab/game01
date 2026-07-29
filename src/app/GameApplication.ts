import map01 from "../content/maps/map01.js";
import towerTypes from "../content/towers/towerTypes.js";
import waveDefinitions from "../content/waves/waveDefinitions.js";
import { GameLoop } from "../core/GameLoop.js";
import { PlaceTowerCommand, SellTowerCommand, UpgradeTowerCommand, type GameState } from "../game/index.js";
import { Grid, Path as GridPath, CoordinateConverter } from "../game/map/index.js";
import { CleanupSystem, CombatSystem, ProjectileSystem, StatusEffectSystem, TargetingSystem } from "../game/systems/index.js";
import { CanvasCoordinateConverter, KeyboardInputAdapter, PointerInputAdapter } from "../input/index.js";
import Path from "../path/Path.js";
import { Camera, DebugLayer, EffectLayer, EntityLayer, MapLayer, Renderer } from "../rendering/index.js";
import MovementSystem from "../systems/MovementSystem.js";
import WaveSystem from "../systems/WaveSystem.js";
import { GameUi, type OverlayView, type UiCommand, type UiSelectors } from "../ui/index.js";

type Mode = "playing" | "paused" | "victory" | "defeat";
type RuntimeTower = { id: string; type: string; x: number; y: number; range: number; damage: number; fireRate: number; projectileSpeed: number; targeting: string; statusEffect?: unknown; cooldown?: number; targetId?: string | null; color: string; radius: number; label: string };
type Runtime = GameState & { lives: number; mode: Mode; waveInProgress: boolean; selectedBuildType: string | null; selectedTowerId: string | null; enemies: any[]; runtimeTowers: RuntimeTower[]; effects: any[]; entities: any[]; score: number };

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
  readonly #listeners = new Set<() => void>();
  #state!: Runtime;
  #movement: MovementSystem;
  #waves: WaveSystem;
  #targeting = new TargetingSystem();
  #combat = new CombatSystem();
  #projectiles = new ProjectileSystem();
  #effects = new StatusEffectSystem();
  #cleanup = new CleanupSystem();
  #nextTower = 1;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#canvas.className = "game-canvas";
    this.#canvas.width = map01.width * map01.tileSize;
    this.#canvas.height = map01.height * map01.tileSize;
    this.#canvas.setAttribute("aria-label", "Tower Defense battlefield");
    const context = this.#canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not supported");

    const route = GridPath.find(this.#grid, map01.spawnPoints.enemies[0], map01.spawnPoints.player);
    if (!route) throw new Error("Map has no route from enemy spawn to the base");
    this.#path = new Path([...route].map((cell) => this.#converter.gridToWorld(cell, { center: true })));
    this.#movement = new MovementSystem(this.#path);
    this.#waves = new WaveSystem(waveDefinitions);
    const camera = new Camera({ viewportWidth: this.#canvas.width, viewportHeight: this.#canvas.height });
    this.#renderer = new (Renderer as any)({ context, camera, layers: [
      new (MapLayer as any)({ grid: this.#grid, converter: this.#converter }), new EntityLayer(), new EffectLayer(),
      new (DebugLayer as any)({ grid: this.#grid, converter: this.#converter }),
    ] });
    this.#loop = new (GameLoop as any)({
      schedule: (callback: FrameRequestCallback) => requestAnimationFrame(callback), cancel: (handle: number) => cancelAnimationFrame(handle),
      update: (delta: number) => this.#update(delta), render: () => this.#render(),
    });
    this.#state = this.#newState();
    this.#ui = new GameUi(this, this.#selectors(), (command) => this.#dispatch(command));
    const screen = new CanvasCoordinateConverter(this.#canvas, this.#canvas.width, this.#canvas.height);
    this.#pointer = new PointerInputAdapter(this.#canvas, screen, (event) => {
      if (event.phase === "down") this.#onPointer(event.position);
    });
    this.#keyboard = new KeyboardInputAdapter(window, (event) => {
      if (event.phase !== "down" || event.repeat) return;
      if (event.code === "Escape" || event.code === "KeyP") this.#dispatch({ type: "toggle-pause" });
      if (event.code === "Space") this.#dispatch({ type: "start-wave" });
    });
  }

  getState(): Runtime { return this.#state; }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }

  start(): void {
    this.#root.replaceChildren(this.#canvas);
    this.#ui.mount(this.#root);
    this.#render();
    this.#loop.start();
  }

  destroy(): void { this.#loop.stop(); this.#pointer.destroy(); this.#keyboard.destroy(); this.#ui.unmount(); }

  #newState(): Runtime {
    return {
      width: map01.width, height: map01.height,
      players: new Map([[PLAYER, { id: PLAYER, balance: 350 }]]), towers: new Map(), occupiedCells: new Map(),
      towerDefinitions: new Map(Object.values(towerTypes).map((tower: any) => [tower.id, { type: tower.id, levels: levels(tower) }])),
      lives: 20, mode: "playing", waveInProgress: false, selectedBuildType: null, selectedTowerId: null,
      enemies: [], runtimeTowers: [], effects: [], entities: [], score: 0,
    };
  }

  #update(delta: number): void {
    if (this.#state.mode !== "playing") return;
    const spawned: any[] = this.#waves.update(delta);
    for (const enemy of spawned) { enemy.position = this.#path.getPointAt(0); enemy.x = enemy.position.x; enemy.y = enemy.position.y; }
    this.#state.enemies.push(...spawned);
    this.#state.waveInProgress = this.#waves.active || this.#state.enemies.length > 0;
    this.#effects.update(delta, this.#state.enemies);
    const reached = this.#movement.update(this.#state.enemies, delta);
    for (const enemy of this.#state.enemies) { enemy.x = enemy.position.x; enemy.y = enemy.position.y; }
    (this.#movement as any).handleBaseReached(reached, (enemy: any) => { this.#state.lives -= enemy.baseDamage; });
    this.#state.enemies = this.#movement.removeMarked(this.#state.enemies);
    this.#targeting.update(this.#state.runtimeTowers, this.#state.enemies);
    this.#combat.update(delta, this.#state.runtimeTowers, this.#state.enemies, this.#projectiles);
    this.#projectiles.update(delta, this.#state.enemies, this.#effects);
    const before = this.#state.players.get(PLAYER)!.balance;
    const wallet = { currency: before };
    this.#cleanup.update(this.#state.enemies, wallet);
    this.#state.players.get(PLAYER)!.balance = wallet.currency;
    this.#state.score += wallet.currency - before;
    if (this.#state.lives <= 0) this.#finish("defeat");
    else if (this.#waves.waveIndex === waveDefinitions.length - 1 && !this.#state.waveInProgress) this.#finish("victory");
    this.#emit();
  }

  #render(): void {
    this.#state.entities = [
      ...this.#state.runtimeTowers,
      ...this.#state.enemies.map((enemy) => ({ ...enemy, color: enemy.type === "tank" ? "#ef4444" : enemy.type === "runner" ? "#fbbf24" : "#fb7185", radius: enemy.type === "tank" ? 17 : 12 })),
      ...this.#projectiles.projectiles.map((projectile: any) => ({ ...projectile, color: "#f8fafc", radius: 4 })),
    ];
    this.#renderer.render(this.#state);
  }

  #dispatch(command: UiCommand): void {
    try {
      if (command.type === "start-wave" && this.#state.mode === "playing" && !this.#state.waveInProgress) {
        this.#state.waveInProgress = this.#waves.start();
      } else if (command.type === "select-build") this.#state.selectedBuildType = command.towerType;
      else if (command.type === "cancel-build") this.#state.selectedBuildType = null;
      else if (command.type === "toggle-pause" && !["victory", "defeat"].includes(this.#state.mode)) {
        this.#state.mode = this.#state.mode === "paused" ? "playing" : "paused";
      } else if (command.type === "upgrade-tower") this.#upgrade(command.towerId);
      else if (command.type === "sell-tower") this.#sell(command.towerId);
      else if (command.type === "restart-game") this.#restart();
    } catch (error) { console.warn(error); }
    this.#emit(); this.#render();
  }

  #onPointer(point: { x: number; y: number }): void {
    if (this.#state.mode !== "playing") return;
    const selected = this.#state.runtimeTowers.find((tower) => Math.hypot(tower.x - point.x, tower.y - point.y) < 24);
    if (selected) { this.#state.selectedTowerId = selected.id; this.#state.selectedBuildType = null; this.#emit(); return; }
    if (!this.#state.selectedBuildType) { this.#state.selectedTowerId = null; this.#emit(); return; }
    const cell = this.#converter.worldToGrid(point);
    if (!this.#grid.isWalkable(cell) || [...GridPath.find(this.#grid, map01.spawnPoints.enemies[0], map01.spawnPoints.player) ?? []].some((p) => p.x === cell.x && p.y === cell.y)) return;
    const id = `tower-${this.#nextTower++}`;
    const tower = new PlaceTowerCommand(PLAYER, id, this.#state.selectedBuildType, cell).execute(this.#state);
    this.#addRuntimeTower(tower.id, tower.type, tower.level, cell);
    this.#state.selectedTowerId = id; this.#state.selectedBuildType = null; this.#emit(); this.#render();
  }

  #addRuntimeTower(id: string, type: string, level: number, cell: { x: number; y: number }): void {
    const definition: any = towerTypes[type as keyof typeof towerTypes];
    const position = this.#converter.gridToWorld(cell, { center: true });
    this.#state.runtimeTowers.push({ id, type, ...position, range: definition.range * (1 + level * .12), damage: definition.damage * (1 + level * .5), fireRate: definition.fireRate, projectileSpeed: definition.projectileSpeed, targeting: definition.targeting, statusEffect: definition.statusEffect, color: type === "frost" ? "#67e8f9" : type === "rapid" ? "#a78bfa" : "#60a5fa", radius: 18, label: definition.name });
  }

  #upgrade(id: string): void { const tower = new UpgradeTowerCommand(PLAYER, id).execute(this.#state); const index = this.#state.runtimeTowers.findIndex((item) => item.id === id); this.#state.runtimeTowers.splice(index, 1); this.#addRuntimeTower(id, tower.type, tower.level, tower.position); }
  #sell(id: string): void { new SellTowerCommand(PLAYER, id).execute(this.#state); this.#state.runtimeTowers = this.#state.runtimeTowers.filter((tower) => tower.id !== id); this.#state.selectedTowerId = null; }
  #finish(mode: "victory" | "defeat"): void { this.#state.mode = mode; }
  #restart(): void { this.#waves = new WaveSystem(waveDefinitions); this.#projectiles = new ProjectileSystem(); this.#state = this.#newState(); this.#nextTower = 1; }
  #emit(): void { for (const listener of this.#listeners) listener(); }

  #selectors(): UiSelectors<Runtime> {
    return {
      hud: (s) => ({ lives: s.lives, money: s.players.get(PLAYER)!.balance, wave: s.waveInProgress ? this.#waves.waveIndex + 1 : Math.max(0, this.#waves.waveIndex + 1), totalWaves: waveDefinitions.length, waveInProgress: s.waveInProgress }),
      buildOptions: (s) => Object.values(towerTypes).map((tower: any) => ({ type: tower.id, name: tower.name, cost: tower.cost, available: s.players.get(PLAYER)!.balance >= tower.cost })),
      selectedTower: (s) => { const tower = s.towers.get(s.selectedTowerId ?? ""); if (!tower) return null; const definition: any = towerTypes[tower.type as keyof typeof towerTypes]; const next = s.towerDefinitions.get(tower.type)!.levels[tower.level + 1]; return { id: tower.id, name: definition.name, level: tower.level + 1, damage: Math.round(definition.damage * (1 + tower.level * .5)), range: Math.round(definition.range * (1 + tower.level * .12)), upgradeCost: next?.cost ?? null, sellValue: s.towerDefinitions.get(tower.type)!.levels[tower.level]!.sellValue }; },
      overlay: (s): OverlayView => s.mode === "paused" ? { kind: "paused" } : s.mode === "victory" ? { kind: "victory", score: s.score } : s.mode === "defeat" ? { kind: "defeat", wave: this.#waves.waveIndex + 1 } : { kind: "none" },
      selectedBuildType: (s) => s.selectedBuildType,
    };
  }
}
