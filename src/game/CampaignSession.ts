import difficulties, { getDifficulty } from "../content/balance/difficulties.js";
import {
  earlyStartReward,
  rewards,
  waveCompletionReward,
} from "../content/balance/rewards.js";
import enemyTypes from "../content/enemies/enemyTypes.js";
import map01 from "../content/maps/map01.js";
import towerTypes from "../content/towers/towerTypes.js";
import waveDefinitions from "../content/waves/waveDefinitions.js";
import Enemy from "../entities/Enemy.js";
import Path from "../path/Path.js";
import {
  CombatEffectPool,
  type CombatEffectEvent,
  type VisualEffect,
} from "../rendering/CombatEffectPool.js";
import WaveSystem from "../systems/WaveSystem.js";
import { Grid, CoordinateConverter } from "./map/index.js";
import {
  PlaceTowerCommand,
  SellTowerCommand,
  SetTargetingCommand,
  UpgradeTowerCommand,
} from "./commands/index.js";
import { CommandValidationError } from "./errors.js";
import { GameFlow, type DifficultyId, type GamePhase, type GameSpeed } from "./GameFlow.js";
import { GameStorage, type ActiveGameSave, type GameSettings } from "./persistence/GameStorage.js";
import { PlacementSystem } from "./PlacementSystem.js";
import {
  createRuntimeTower,
  runtimeTowerColor,
  type RuntimeTower,
  type RuntimeTowerDefinition,
} from "./runtime.js";
import { BattleSimulation } from "./systems/index.js";
import {
  cellKey,
  type CellDefinition,
  type GameState,
  type Position,
  type TargetingMode,
  type Tower,
  type TowerDefinition,
} from "./types.js";

const PLAYER_ID = "player";
const AUTOSAVE_SECONDS = 2;

export interface MapDefinition {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly layout: readonly string[];
  readonly legend: Readonly<Record<string, {
    readonly id: string;
    readonly walkable: boolean;
    readonly buildable: boolean;
    readonly movementCost: number;
    readonly color?: string;
  }>>;
  readonly enemyRoute: readonly Position[];
}

export interface WaveGroup {
  readonly type: string;
  readonly count: number;
  readonly at?: number;
  readonly interval?: number;
}

export interface WaveDefinition {
  readonly id: string;
  readonly title: string;
  readonly groups: readonly WaveGroup[];
}

interface TowerLevelContent {
  readonly cost: number;
  readonly sellValue: number;
  readonly damage: number;
  readonly range: number;
  readonly fireRate: number;
  readonly projectileSpeed: number;
  readonly areaRadius?: number;
  readonly statusEffect?: StatusEffect;
}

export interface TowerContent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hotkey: string;
  readonly targeting: TargetingMode;
  readonly damageType: string;
  readonly color: string;
  readonly levels: readonly TowerLevelContent[];
}

export interface EnemyContent {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  readonly speed: number;
  readonly reward: number;
  readonly baseDamage: number;
  readonly armor: number;
  readonly regeneration?: number;
  readonly boss?: boolean;
  readonly color: string;
  readonly radius: number;
}

export interface StatusEffect {
  readonly type: string;
  remaining: number;
  readonly duration?: number;
  readonly multiplier?: number;
  readonly damagePerSecond?: number;
  readonly damageType?: string;
}

export interface EnemyEntity {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly color: string;
  readonly radius: number;
  readonly maxHealth: number;
  health: number;
  readonly speed: number;
  readonly reward: number;
  readonly baseDamage: number;
  readonly armor: number;
  readonly regeneration: number;
  readonly boss: boolean;
  bossPhase: number;
  progress: number;
  position: { x: number; y: number };
  speedMultiplier: number;
  abilitySpeedMultiplier: number;
  statusEffects: StatusEffect[];
  dead: boolean;
  reachedBase: boolean;
  pendingRemoval: boolean;
  removalReason: string | null;
  takeDamage(amount: number, damageType?: string): number;
  heal(amount: number): number;
  markForRemoval(reason?: string): void;
  readonly isAlive: boolean;
}

export interface ProjectileEntity {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly damage: number;
  readonly damageType?: string;
  readonly areaRadius?: number;
  readonly radius?: number;
  readonly color?: string;
  position: { x: number; y: number };
}

export type { VisualEffect } from "../rendering/CombatEffectPool.js";

export interface PlacementPreview {
  readonly position: Position;
  readonly cellBounds: Position & { readonly width: number; readonly height: number };
  readonly range: number;
  readonly radius: number;
  readonly color: string;
  readonly valid: boolean;
}

export interface UiMessage {
  readonly kind: "info" | "success" | "error";
  readonly text: string;
}

export interface AudioSettings {
  readonly enabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
}

export interface CampaignRuntime extends GameState {
  lives: number;
  score: number;
  elapsedSeconds: number;
  selectedBuildType: string | null;
  selectedTowerId: string | null;
  hoveredEnemyId: string | null;
  placementPreview: PlacementPreview | null;
  message: UiMessage | null;
  enemies: EnemyEntity[];
  runtimeTowers: RuntimeTower[];
  effects: VisualEffect[];
  screenShake: number;
  reducedMotion: boolean;
}

interface WaveSnapshot {
  readonly waveIndex: number;
  readonly elapsed: number;
  readonly active: boolean;
  readonly queue: readonly { readonly at: number; readonly type: string }[];
}

interface WaveSystemPort {
  readonly waveIndex: number;
  readonly active: boolean;
  readonly pendingCount: number;
  readonly currentWave: WaveDefinition | null;
  start(index?: number): boolean;
  update(deltaSeconds: number): EnemyEntity[];
  snapshot(): WaveSnapshot;
  restore(snapshot: WaveSnapshot): void;
}

type BattleEvent = CombatEffectEvent;

export interface PresentationCue {
  readonly type:
    | "shot"
    | "hit"
    | "enemy-death"
    | "boss-phase"
    | "build"
    | "upgrade"
    | "sell"
    | "wave"
    | "victory"
    | "defeat";
  readonly damage?: number;
  readonly damageType?: string;
  readonly areaRadius?: number;
}

interface BattleResult {
  readonly baseDamage: number;
  readonly reward: number;
  readonly events: readonly BattleEvent[];
}

interface BattleSimulationPort {
  readonly projectiles: { readonly projectiles: ProjectileEntity[] };
  update(deltaSeconds: number, towers: RuntimeTower[], enemies: EnemyEntity[]): BattleResult;
  reset(): void;
}

interface DifficultyContent {
  readonly id: DifficultyId;
  readonly name: string;
  readonly description: string;
  readonly startingGold: number;
  readonly lives: number;
  readonly enemyHealth: number;
  readonly enemySpeed: number;
  readonly enemyReward: number;
  readonly scoreMultiplier: number;
  readonly preparationSeconds: number;
}

export interface CampaignSessionOptions {
  readonly map?: MapDefinition;
  readonly waves?: readonly WaveDefinition[];
  readonly storage?: GameStorage;
}

const towerCatalog = towerTypes as unknown as Readonly<Record<string, TowerContent>>;
const enemyCatalog = enemyTypes as unknown as Readonly<Record<string, EnemyContent>>;
const difficultyCatalog = difficulties as unknown as Readonly<Record<DifficultyId, DifficultyContent>>;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isFinitePosition = (position: Position): boolean =>
  Number.isFinite(position.x) && Number.isFinite(position.y);

/** Owns one campaign and coordinates existing commands/systems without browser or DOM concerns. */
export class CampaignSession {
  readonly map: MapDefinition;
  readonly grid: InstanceType<typeof Grid>;
  readonly converter: InstanceType<typeof CoordinateConverter>;
  readonly path: InstanceType<typeof Path>;
  readonly flow = new GameFlow();
  readonly waves: readonly WaveDefinition[];

  readonly #storage: GameStorage;
  readonly #placement = new PlacementSystem();
  readonly #effectPool = new CombatEffectPool();
  readonly #listeners = new Set<() => void>();
  readonly #presentationListeners = new Set<(cue: PresentationCue) => void>();
  #settings: GameSettings;
  #state: CampaignRuntime;
  #waveSystem!: WaveSystemPort;
  #battle!: BattleSimulationPort;
  #nextTower = 1;
  #waveLivesAtStart = 0;
  #autosaveElapsed = 0;
  #savedGameAvailable = false;
  #reducedMotion = false;

  constructor(options: CampaignSessionOptions = {}) {
    this.map = options.map ?? (map01 as unknown as MapDefinition);
    this.waves = options.waves ?? (waveDefinitions as unknown as readonly WaveDefinition[]);
    this.#storage = options.storage ?? new GameStorage(
      typeof localStorage === "undefined" ? null : localStorage,
    );
    this.#settings = this.#storage.loadSettings();
    this.grid = new Grid(this.map);
    this.converter = new CoordinateConverter(this.map.tileSize);
    if (this.map.enemyRoute.length < 2 || this.map.enemyRoute.some((cell) => !this.grid.isWalkable(cell))) {
      throw new Error("Map has no valid enemy route");
    }
    this.path = new Path(
      this.map.enemyRoute.map((cell) => this.converter.gridToWorld(cell, { center: true })),
    );
    this.#state = this.#createState(this.#settings.difficulty);
    this.#resetSystems();
    this.#savedGameAvailable = this.#storage.loadGame() !== null;
    this.flow.setSpeed(this.#settings.speed);
  }

  getState(): CampaignRuntime {
    return this.#state;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  subscribePresentation(listener: (cue: PresentationCue) => void): () => void {
    this.#presentationListeners.add(listener);
    return () => this.#presentationListeners.delete(listener);
  }

  get phase(): GamePhase {
    return this.flow.phase;
  }

  get difficulty(): DifficultyId {
    return this.flow.difficulty;
  }

  get speed(): GameSpeed {
    return this.flow.speed;
  }

  get countdown(): number {
    return this.flow.countdown;
  }

  get currentWaveNumber(): number {
    return Math.max(0, this.#waveSystem.waveIndex + 1);
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  get enemiesRemaining(): number {
    return this.#state.enemies.length + this.#waveSystem.pendingCount;
  }

  get waveInProgress(): boolean {
    return this.flow.phase === "wave"
      || (this.flow.phase === "paused" && this.flow.resumePhase === "wave");
  }

  get canStartWave(): boolean {
    return this.flow.phase === "preparing"
      && this.#waveSystem.waveIndex + 1 < this.waves.length;
  }

  get earlyStartBonus(): number {
    return this.canStartWave ? earlyStartReward(this.flow.countdown) : 0;
  }

  get savedGameAvailable(): boolean {
    return this.#savedGameAvailable;
  }

  get bestScore(): number {
    return this.#settings.bestScore;
  }

  get audioSettings(): AudioSettings {
    return {
      enabled: this.#settings.soundEnabled,
      musicVolume: this.#settings.musicVolume,
      sfxVolume: this.#settings.sfxVolume,
    };
  }

  get nextWaveTitle(): string {
    return this.waves[this.#waveSystem.waveIndex + 1]?.title ?? "Final wave";
  }

  get projectiles(): readonly ProjectileEntity[] {
    return this.#battle.projectiles.projectiles;
  }

  get selectedTowerRange(): { readonly position: Position; readonly range: number } | null {
    const selected = this.#state.runtimeTowers.find(
      (tower) => tower.id === this.#state.selectedTowerId,
    );
    return selected ? { position: selected.position, range: selected.range } : null;
  }

  get difficultyOptions(): readonly DifficultyContent[] {
    return Object.values(difficultyCatalog);
  }

  get towerOptions(): readonly TowerContent[] {
    return Object.values(towerCatalog);
  }

  openDifficulty(): void {
    this.flow.openDifficulty();
    this.#emit();
  }

  newGame(difficulty: DifficultyId): void {
    const content = this.#difficulty(difficulty);
    this.#storage.clearGame();
    this.#savedGameAvailable = false;
    this.flow.startNewGame(
      difficulty,
      !this.#settings.tutorialSeen,
      content.preparationSeconds,
    );
    this.flow.setSpeed(this.#settings.speed);
    this.#state = this.#createState(difficulty);
    this.#resetSystems();
    this.#nextTower = 1;
    this.#waveLivesAtStart = content.lives;
    this.#autosaveElapsed = 0;
    this.#settings = { ...this.#settings, difficulty };
    this.#saveSettings();
    this.#showMessage(
      this.flow.phase === "tutorial"
        ? "Learn the essentials, then begin the defense."
        : "Build towers and launch the first wave when ready.",
      "info",
    );
    this.#saveGame();
    this.#emit();
  }

  completeTutorial(): void {
    if (this.flow.phase !== "tutorial") return;
    this.flow.completeTutorial();
    this.#settings = { ...this.#settings, tutorialSeen: true };
    this.#saveSettings();
    this.#showMessage("Build on grass, then press Space to launch early.", "info");
    this.#saveGame();
    this.#emit();
  }

  continueGame(): boolean {
    const save = this.#storage.loadGame();
    if (!save) {
      this.#savedGameAvailable = false;
      this.#showMessage("No valid saved game was found.", "error");
      this.#emit();
      return false;
    }
    try {
      this.#restore(save);
      this.#savedGameAvailable = true;
      this.#showMessage("Saved defense restored.", "success");
      this.#emit();
      return true;
    } catch {
      this.#storage.clearGame();
      this.#savedGameAvailable = false;
      this.flow.returnToMenu();
      this.#state = this.#createState(this.#settings.difficulty);
      this.#resetSystems();
      this.#showMessage("The saved game was damaged and has been discarded.", "error");
      this.#emit();
      return false;
    }
  }

  returnToMenu(): void {
    if (this.flow.phase === "preparing"
      || this.flow.phase === "wave"
      || this.flow.phase === "paused"
      || this.flow.phase === "tutorial") {
      this.#saveGame();
      this.#savedGameAvailable = true;
    }
    this.flow.returnToMenu();
    this.#state.selectedBuildType = null;
    this.#state.selectedTowerId = null;
    this.#state.placementPreview = null;
    this.#emit();
  }

  restart(): void {
    const difficulty = this.flow.difficulty;
    this.newGame(difficulty);
    if (this.flow.phase === "tutorial") this.completeTutorial();
  }

  startWave(awardEarlyBonus = true): number {
    if (this.flow.phase !== "preparing") {
      throw new CommandValidationError("A wave can only start during preparation.");
    }
    const bonus = awardEarlyBonus ? this.earlyStartBonus : 0;
    if (!this.#waveSystem.start()) {
      throw new CommandValidationError("No wave is available to start.");
    }
    this.#state.players.get(PLAYER_ID)!.balance += bonus;
    this.#state.score += this.#scoreValue(bonus);
    this.#waveLivesAtStart = this.#state.lives;
    this.flow.beginWave();
    this.#showMessage(
      bonus > 0 ? `Wave launched early: +${bonus} Gold.` : "Wave started.",
      bonus > 0 ? "success" : "info",
    );
    this.#publish({ type: "wave" });
    this.#saveGame();
    this.#emit();
    return bonus;
  }

  togglePause(): boolean {
    const changed = this.flow.togglePause();
    if (!changed) throw new CommandValidationError("The game cannot be paused from this screen.");
    this.#saveGame();
    this.#emit();
    return true;
  }

  setSpeed(speed: GameSpeed): void {
    this.flow.setSpeed(speed);
    this.#settings = { ...this.#settings, speed };
    this.#saveSettings();
    this.#saveGame();
    this.#emit();
  }

  reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    this.#showMessage(message, "error");
    if (!(error instanceof CommandValidationError)) console.error(error);
    this.#emit();
  }

  setReducedMotion(reduced: boolean): void {
    this.#reducedMotion = reduced;
    this.#state.reducedMotion = reduced;
    this.#effectPool.setReducedMotion(reduced);
    if (reduced) this.#state.screenShake = 0;
  }

  setAudioSettings(settings: Partial<AudioSettings>): void {
    const clamp = (value: number, fallback: number): number =>
      Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    this.#settings = {
      ...this.#settings,
      soundEnabled: settings.enabled ?? this.#settings.soundEnabled,
      musicVolume: settings.musicVolume === undefined
        ? this.#settings.musicVolume
        : clamp(settings.musicVolume, this.#settings.musicVolume),
      sfxVolume: settings.sfxVolume === undefined
        ? this.#settings.sfxVolume
        : clamp(settings.sfxVolume, this.#settings.sfxVolume),
    };
    this.#saveSettings();
    this.#emit();
  }

  selectBuild(type: string): void {
    const tower = this.#tower(type);
    if (this.flow.phase !== "preparing" && this.flow.phase !== "wave") {
      throw new CommandValidationError("Start or continue a game before building.");
    }
    this.#state.selectedBuildType = type;
    this.#state.selectedTowerId = null;
    this.#state.hoveredEnemyId = null;
    this.#showMessage(`Building ${tower.name}. Choose a buildable cell.`, "info");
    this.#emit();
  }

  cancelAction(): void {
    if (this.#state.selectedBuildType) {
      this.#state.selectedBuildType = null;
      this.#state.placementPreview = null;
      this.#showMessage("Building cancelled.", "info");
    } else {
      this.#state.selectedTowerId = null;
    }
    this.#emit();
  }

  updatePointer(point: Position | null): void {
    if (!point) {
      this.#state.placementPreview = null;
      this.#state.hoveredEnemyId = null;
      this.#emit();
      return;
    }
    this.#refreshPlacementPreview(point);
    if (!this.#state.selectedBuildType) {
      this.#state.hoveredEnemyId = this.#enemyAt(point)?.id ?? null;
    }
    this.#emit();
  }

  handleBattlefieldClick(point: Position): void {
    if (this.flow.phase !== "preparing" && this.flow.phase !== "wave") return;
    if (this.#state.selectedBuildType) {
      this.placeSelectedTower(point);
      return;
    }
    const selected = this.#state.runtimeTowers.find(
      (tower) => Math.hypot(tower.position.x - point.x, tower.position.y - point.y) <= tower.radius + 7,
    );
    this.#state.selectedTowerId = selected?.id ?? null;
    this.#state.hoveredEnemyId = selected ? null : (this.#enemyAt(point)?.id ?? null);
    this.#emit();
  }

  placeSelectedTower(point: Position): Tower {
    const type = this.#state.selectedBuildType;
    if (!type) throw new CommandValidationError("Select a tower before placing it.");
    const cell = this.converter.worldToGrid(point);
    const error = this.placementError(type, cell);
    if (error) throw new CommandValidationError(error);
    const id = `tower-${this.#nextTower}`;
    const tower = new PlaceTowerCommand(PLAYER_ID, id, type, cell).execute(this.#state);
    this.#state.runtimeTowers.push(this.#createRuntimeTower(tower));
    this.#nextTower += 1;
    this.#state.selectedTowerId = null;
    this.#showMessage(`${this.#tower(type).name} built.`, "success");
    this.#publish({ type: "build" });
    this.#refreshPlacementPreview(point);
    this.#saveGame();
    this.#emit();
    return tower;
  }

  placementError(type: string, cell: Position): string | null {
    try {
      this.#placement.validateCell(this.#state, cell);
      const definition = this.#state.towerDefinitions.get(type);
      if (!definition) throw new CommandValidationError("Unknown tower type.");
      const cost = definition.levels[0]?.cost;
      if (cost === undefined) throw new CommandValidationError("Tower has no placement cost.");
      if (this.#state.players.get(PLAYER_ID)!.balance < cost) {
        throw new CommandValidationError("Not enough Gold for this tower.");
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Tower placement failed.";
    }
  }

  upgradeTower(id: string): Tower {
    const tower = new UpgradeTowerCommand(PLAYER_ID, id).execute(this.#state);
    this.#replaceRuntimeTower(tower);
    this.#showMessage(`${this.#tower(tower.type).name} upgraded to level ${tower.level + 1}.`, "success");
    this.#publish({ type: "upgrade" });
    this.#saveGame();
    this.#emit();
    return tower;
  }

  sellTower(id: string): number {
    const refund = new SellTowerCommand(PLAYER_ID, id).execute(this.#state);
    this.#state.runtimeTowers = this.#state.runtimeTowers.filter((tower) => tower.id !== id);
    this.#state.selectedTowerId = null;
    this.#showMessage(`Tower sold for ${refund} Gold.`, "success");
    this.#publish({ type: "sell" });
    this.#saveGame();
    this.#emit();
    return refund;
  }

  setTargeting(id: string, mode: TargetingMode): void {
    const tower = new SetTargetingCommand(PLAYER_ID, id, mode).execute(this.#state);
    const runtime = this.#state.runtimeTowers.find((item) => item.id === id);
    if (runtime) runtime.targeting = tower.targeting;
    this.#showMessage(`Targeting set to ${mode}.`, "info");
    this.#saveGame();
    this.#emit();
  }

  cycleSelectedTargeting(): void {
    const id = this.#state.selectedTowerId;
    if (!id) throw new CommandValidationError("Select a tower before changing targeting.");
    const tower = this.#state.towers.get(id);
    if (!tower) throw new CommandValidationError("Selected tower no longer exists.");
    const modes: readonly TargetingMode[] = ["first", "nearest", "strongest"];
    const next = modes[(modes.indexOf(tower.targeting) + 1) % modes.length] ?? "first";
    this.setTargeting(id, next);
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("Campaign delta must be a non-negative finite number");
    }
    if (this.flow.phase !== "preparing" && this.flow.phase !== "wave") return;
    const scaledDelta = deltaSeconds * this.flow.speed;
    this.#state.elapsedSeconds += scaledDelta;
    this.#effectPool.update(scaledDelta);
    this.#state.screenShake = this.#effectPool.shakeIntensity;

    if (this.flow.phase === "preparing") {
      if (this.flow.update(scaledDelta)) this.startWave(false);
      else this.#tickAutosave(scaledDelta);
      this.#emit();
      return;
    }

    const spawned = this.#waveSystem.update(scaledDelta);
    for (const enemy of spawned) enemy.position = { ...this.path.getPointAt(0) };
    this.#state.enemies.push(...spawned);
    const result = this.#battle.update(
      scaledDelta,
      this.#state.runtimeTowers,
      this.#state.enemies,
    );
    this.#state.lives = Math.max(0, this.#state.lives - result.baseDamage);
    if (result.reward > 0) {
      this.#state.players.get(PLAYER_ID)!.balance += result.reward;
      this.#state.score += this.#scoreValue(result.reward);
    }
    this.#recordBattleEvents(result.events);

    if (this.#state.lives <= 0) {
      this.#finish("defeat");
    } else if (!this.#waveSystem.active && this.#state.enemies.length === 0) {
      this.#completeWave();
    } else {
      this.#tickAutosave(scaledDelta);
    }
    this.#emit();
  }

  nextWaveComposition(): readonly { readonly type: string; readonly name: string; readonly count: number }[] {
    const definition = this.waves[this.#waveSystem.waveIndex + 1];
    if (!definition) return [];
    const counts = new Map<string, number>();
    for (const group of definition.groups) {
      counts.set(group.type, (counts.get(group.type) ?? 0) + group.count);
    }
    return [...counts].map(([type, count]) => ({
      type,
      name: enemyCatalog[type]?.name ?? type,
      count,
    }));
  }

  selectedEnemy(): EnemyEntity | null {
    return this.#state.enemies.find((enemy) => enemy.id === this.#state.hoveredEnemyId) ?? null;
  }

  #createState(difficultyId: DifficultyId): CampaignRuntime {
    const difficulty = this.#difficulty(difficultyId);
    const towerDefinitions = new Map<string, TowerDefinition>();
    for (const tower of Object.values(towerCatalog)) {
      towerDefinitions.set(tower.id, {
        type: tower.id,
        defaultTargeting: tower.targeting,
        levels: tower.levels.map((level) => ({
          cost: level.cost,
          sellValue: level.sellValue,
        })),
      });
    }
    return {
      width: this.map.width,
      height: this.map.height,
      players: new Map([[PLAYER_ID, { id: PLAYER_ID, balance: difficulty.startingGold }]]),
      towers: new Map(),
      occupiedCells: new Map(),
      towerDefinitions,
      cells: this.#mapCells(),
      lives: difficulty.lives,
      score: 0,
      elapsedSeconds: 0,
      selectedBuildType: null,
      selectedTowerId: null,
      hoveredEnemyId: null,
      placementPreview: null,
      message: null,
      enemies: [],
      runtimeTowers: [],
      effects: [],
      screenShake: 0,
      reducedMotion: this.#reducedMotion,
    };
  }

  #mapCells(): ReadonlyMap<string, CellDefinition> {
    const cells = new Map<string, CellDefinition>();
    this.grid.forEach((tile: CellDefinition & { readonly id: string }, position: Position) => {
      cells.set(cellKey(position), {
        terrain: tile.id,
        walkable: tile.walkable === true,
        buildable: tile.buildable === true,
      });
    });
    return cells;
  }

  #resetSystems(): void {
    const difficulty = this.#difficulty(this.flow.difficulty);
    this.#waveSystem = new WaveSystem(this.waves, {
      createEnemy: (type: string) => this.#createEnemy(type, difficulty),
    }) as unknown as WaveSystemPort;
    this.#battle = new BattleSimulation(this.path) as unknown as BattleSimulationPort;
    const reducedMotion = this.#state.reducedMotion;
    this.#effectPool.clear();
    this.#effectPool.setReducedMotion(reducedMotion);
    this.#state.effects = this.#effectPool.effects;
    this.#state.screenShake = 0;
  }

  #createEnemy(
    type: string,
    difficulty = this.#difficulty(this.flow.difficulty),
    currentHealth?: number,
    saved?: {
      readonly id: string;
      readonly progress: number;
      readonly position: Position;
      readonly statusEffects: readonly Record<string, unknown>[];
      readonly bossPhase: number;
    },
  ): EnemyEntity {
    const definition = enemyCatalog[type];
    if (!definition) throw new Error(`Unknown enemy type: ${type}`);
    const maxHealth = Math.round(definition.health * difficulty.enemyHealth);
    const enemy = new Enemy(type, {
      id: saved?.id,
      health: maxHealth,
      currentHealth: currentHealth ?? maxHealth,
      speed: definition.speed * difficulty.enemySpeed,
      reward: Math.max(1, Math.round(definition.reward * difficulty.enemyReward)),
      progress: saved?.progress ?? 0,
      position: saved?.position ?? this.path.getPointAt(saved?.progress ?? 0),
      statusEffects: saved?.statusEffects ?? [],
      bossPhase: saved?.bossPhase ?? 1,
    }) as unknown as EnemyEntity;
    if (enemy.bossPhase === 2) enemy.abilitySpeedMultiplier = 1.18;
    if (enemy.bossPhase === 3) enemy.abilitySpeedMultiplier = 1.42;
    return enemy;
  }

  #createRuntimeTower(tower: Tower): RuntimeTower {
    const definition = this.#tower(tower.type);
    const position = this.converter.gridToWorld(tower.position, { center: true });
    return createRuntimeTower(
      tower,
      definition as unknown as RuntimeTowerDefinition,
      position,
    );
  }

  #replaceRuntimeTower(tower: Tower): void {
    const index = this.#state.runtimeTowers.findIndex((item) => item.id === tower.id);
    const replacement = this.#createRuntimeTower(tower);
    if (index >= 0) this.#state.runtimeTowers.splice(index, 1, replacement);
    else this.#state.runtimeTowers.push(replacement);
  }

  #refreshPlacementPreview(point: Position): void {
    const type = this.#state.selectedBuildType;
    if (!type) {
      this.#state.placementPreview = null;
      return;
    }
    const definition = this.#tower(type);
    const cell = this.converter.worldToGrid(point);
    const level = definition.levels[0]!;
    this.#state.placementPreview = {
      position: this.converter.gridToWorld(cell, { center: true }),
      cellBounds: this.converter.gridRect(cell),
      range: level.range,
      radius: 18,
      color: definition.color ?? runtimeTowerColor(type),
      valid: this.placementError(type, cell) === null,
    };
  }

  #enemyAt(point: Position): EnemyEntity | null {
    let nearest: EnemyEntity | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.#state.enemies) {
      const distance = Math.hypot(enemy.position.x - point.x, enemy.position.y - point.y);
      if (distance <= enemy.radius + 8 && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  #completeWave(): void {
    const waveNumber = this.#waveSystem.waveIndex + 1;
    const flawless = this.#state.lives === this.#waveLivesAtStart;
    const bonus = waveCompletionReward(waveNumber, flawless);
    this.#state.players.get(PLAYER_ID)!.balance += bonus;
    this.#state.score += this.#scoreValue(bonus);
    if (waveNumber >= this.waves.length) {
      this.#finish("victory");
      return;
    }
    this.flow.beginPreparation(this.#difficulty(this.flow.difficulty).preparationSeconds);
    this.#showMessage(
      `Wave ${waveNumber} cleared: +${bonus} Gold${flawless ? " (flawless)" : ""}.`,
      "success",
    );
    this.#saveGame();
  }

  #finish(outcome: "victory" | "defeat"): void {
    if (outcome === "victory") {
      this.#state.score += this.#scoreValue(rewards.victoryBonus);
      this.#showMessage("The River Outpost is secure.", "success");
    } else {
      this.#showMessage("The outpost has fallen.", "error");
    }
    this.flow.finish(outcome);
    const bestScore = Math.max(this.#settings.bestScore, this.#state.score);
    this.#settings = { ...this.#settings, bestScore };
    this.#saveSettings();
    this.#storage.clearGame();
    this.#savedGameAvailable = false;
    this.#publish({ type: outcome });
  }

  #recordBattleEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      this.#effectPool.emit(event);
      this.#publish({
        type: event.type,
        damage: event.damage,
        damageType: event.damageType,
        areaRadius: event.areaRadius,
      });
      if (event.type === "boss-phase") {
        this.#showMessage(`Boss entered phase ${event.phase ?? 2}.`, "info");
      }
    }
    this.#state.screenShake = this.#effectPool.shakeIntensity;
  }

  #scoreValue(value: number): number {
    return Math.round(value * this.#difficulty(this.flow.difficulty).scoreMultiplier * 10);
  }

  #tickAutosave(deltaSeconds: number): void {
    this.#autosaveElapsed += deltaSeconds;
    if (this.#autosaveElapsed < AUTOSAVE_SECONDS) return;
    this.#autosaveElapsed = 0;
    this.#saveGame();
  }

  #saveGame(): void {
    if (this.flow.phase === "menu"
      || this.flow.phase === "difficulty"
      || this.flow.phase === "victory"
      || this.flow.phase === "defeat") return;
    this.#storage.saveGame({
      flow: this.flow.snapshot(),
      lives: this.#state.lives,
      gold: this.#state.players.get(PLAYER_ID)!.balance,
      score: this.#state.score,
      elapsedSeconds: this.#state.elapsedSeconds,
      nextTower: this.#nextTower,
      waveLivesAtStart: this.#waveLivesAtStart,
      towers: [...this.#state.towers.values()].map((tower) => ({
        id: tower.id,
        type: tower.type,
        level: tower.level,
        targeting: tower.targeting,
        position: { ...tower.position },
      })),
      enemies: this.#state.enemies.map((enemy) => ({
        id: enemy.id,
        type: enemy.type,
        health: enemy.health,
        progress: enemy.progress,
        position: { ...enemy.position },
        statusEffects: enemy.statusEffects.map((effect) => ({ ...effect })),
        bossPhase: enemy.bossPhase,
      })),
      wave: this.#waveSystem.snapshot(),
    });
    this.#savedGameAvailable = true;
  }

  #restore(save: ActiveGameSave): void {
    if (!Number.isInteger(save.nextTower) || save.nextTower < 1
      || !Number.isFinite(save.waveLivesAtStart) || save.waveLivesAtStart < 0) {
      throw new Error("Save contains invalid session counters");
    }
    const difficulty = this.#difficulty(save.flow.difficulty);
    const restoredState = this.#createState(difficulty.id);
    restoredState.lives = Math.max(0, Math.floor(save.lives));
    restoredState.players.get(PLAYER_ID)!.balance = Math.max(0, Math.floor(save.gold));
    restoredState.score = Math.max(0, Math.floor(save.score));
    restoredState.elapsedSeconds = Math.max(0, save.elapsedSeconds);
    this.#state = restoredState;
    this.flow.restore(save.flow);
    this.#resetSystems();
    this.#waveSystem.restore(save.wave);
    this.#nextTower = save.nextTower;
    this.#waveLivesAtStart = save.waveLivesAtStart;

    for (const savedTower of save.towers) {
      const definition = this.#tower(savedTower.type);
      if (typeof savedTower.id !== "string"
        || savedTower.id.length === 0
        || this.#state.towers.has(savedTower.id)
        || !isFinitePosition(savedTower.position)
        || !Number.isInteger(savedTower.level)
        || savedTower.level < 0
        || savedTower.level >= definition.levels.length) {
        throw new Error("Save contains an invalid tower");
      }
      this.#placement.validateCell(this.#state, savedTower.position);
      const targeting = this.#targetingMode(savedTower.targeting);
      const tower: Tower = {
        id: savedTower.id,
        ownerId: PLAYER_ID,
        type: savedTower.type,
        level: savedTower.level,
        targeting,
        position: { ...savedTower.position },
      };
      this.#state.towers.set(tower.id, tower);
      this.#state.occupiedCells.set(cellKey(tower.position), tower.id);
      this.#state.runtimeTowers.push(this.#createRuntimeTower(tower));
    }

    for (const savedEnemy of save.enemies) {
      if (typeof savedEnemy.id !== "string"
        || savedEnemy.id.length === 0
        || !enemyCatalog[savedEnemy.type]
        || !Number.isFinite(savedEnemy.health)
        || savedEnemy.health < 0
        || !Number.isFinite(savedEnemy.progress)
        || savedEnemy.progress < 0
        || savedEnemy.progress > 1
        || !isFinitePosition(savedEnemy.position)
        || !Number.isInteger(savedEnemy.bossPhase)
        || savedEnemy.bossPhase < 1
        || savedEnemy.bossPhase > 3
        || savedEnemy.statusEffects.some((effect) =>
          !isRecord(effect)
          || typeof effect.type !== "string"
          || !Number.isFinite(effect.remaining)
          || Number(effect.remaining) < 0)) {
        throw new Error("Save contains an invalid enemy");
      }
      const enemy = this.#createEnemy(
        savedEnemy.type,
        difficulty,
        savedEnemy.health,
        savedEnemy,
      );
      this.#state.enemies.push(enemy);
    }
    this.#settings = {
      ...this.#settings,
      difficulty: difficulty.id,
      speed: this.flow.speed,
    };
    this.#saveSettings();
  }

  #saveSettings(): void {
    this.#storage.saveSettings({
      tutorialSeen: this.#settings.tutorialSeen,
      difficulty: this.#settings.difficulty,
      speed: this.#settings.speed,
      bestScore: this.#settings.bestScore,
      soundEnabled: this.#settings.soundEnabled,
      musicVolume: this.#settings.musicVolume,
      sfxVolume: this.#settings.sfxVolume,
    });
  }

  #showMessage(text: string, kind: UiMessage["kind"]): void {
    this.#state.message = { text, kind };
  }

  #tower(type: string): TowerContent {
    const tower = towerCatalog[type];
    if (!tower) throw new CommandValidationError(`Unknown tower type: ${type}`);
    return tower;
  }

  #difficulty(id: DifficultyId): DifficultyContent {
    return getDifficulty(id) as unknown as DifficultyContent;
  }

  #targetingMode(value: string): TargetingMode {
    if (value === "first" || value === "nearest" || value === "strongest") return value;
    throw new Error("Save contains an invalid targeting mode");
  }

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }

  #publish(cue: PresentationCue): void {
    for (const listener of this.#presentationListeners) listener(cue);
  }
}

export default CampaignSession;
