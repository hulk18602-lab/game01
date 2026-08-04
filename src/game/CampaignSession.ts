import difficulties, { getDifficulty } from "../content/balance/difficulties.js";
import {
  earlyStartReward,
  rewards,
  waveCompletionReward,
} from "../content/balance/rewards.js";
import enemyTypes from "../content/enemies/enemyTypes.js";
import {
  heroSkillDefinitions,
  isActiveHeroSkillId,
  type ActiveHeroSkillId,
  type HeroSkillId,
  type HeroSkillLevels,
} from "../content/heroes/heroSkills.js";
import levelDefinitions, {
  getLevelDefinition,
  type LevelDefinition,
  type LevelId,
} from "../content/levels/levelDefinitions.js";
import map01 from "../content/maps/map01.js";
import towerTypes from "../content/towers/towerTypes.js";
import waveDefinitions from "../content/waves/waveDefinitions.js";
import Enemy from "../entities/Enemy.js";
import { HeroEntity } from "../entities/HeroEntity.js";
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
import { HeroExperienceSystem } from "./systems/HeroExperienceSystem.js";
import { HeroMovementSystem, type HeroMovementInput } from "./systems/HeroMovementSystem.js";
import { TowerAuraSystem } from "./systems/TowerAuraSystem.js";
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
  readonly chainCount?: number;
  readonly chainFalloff?: number;
  readonly chainRange?: number;
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
  readonly shield?: number;
  readonly splitInto?: string;
  readonly splitCount?: number;
  readonly boss?: boolean;
  readonly elite?: boolean;
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
  readonly sourceId?: string;
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
  readonly maxShield: number;
  shield: number;
  readonly splitInto: string | null;
  readonly splitCount: number;
  splitGeneration: number;
  splitProcessed: boolean;
  readonly speed: number;
  readonly reward: number;
  readonly baseDamage: number;
  readonly armor: number;
  readonly regeneration: number;
  readonly boss: boolean;
  readonly elite: boolean;
  bossPhase: number;
  progress: number;
  position: { x: number; y: number };
  speedMultiplier: number;
  abilitySpeedMultiplier: number;
  supportSpeedMultiplier: number;
  readonly coldResistance: number;
  readonly enrageThreshold: number;
  readonly enrageSpeed: number;
  enraged: boolean;
  readonly speedAura: number;
  readonly auraRadius: number;
  readonly healAmount: number;
  readonly healCooldown: number;
  readonly healRadius: number;
  abilityCooldown: number;
  readonly phaseInterval: number;
  readonly phaseDuration: number;
  phaseCooldown: number;
  phaseRemaining: number;
  targetable: boolean;
  readonly summonInto: string | null;
  readonly summonCount: number;
  readonly summonDelay: number;
  readonly summonThreshold: number;
  summonProcessed: boolean;
  readonly minion: boolean;
  readonly towerDebuff: number;
  readonly debuffDuration: number;
  readonly debuffCooldown: number;
  readonly debuffRadius: number;
  debuffTimer: number;
  huntersMarked: boolean;
  huntersMarkTowerBonus: number;
  statusEffects: StatusEffect[];
  damageContributors: Map<string, number>;
  lastDamageSourceId?: string;
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
  readonly projectileType?: string;
  readonly rotation?: number;
  position: { x: number; y: number };
}

export type { VisualEffect } from "../rendering/CombatEffectPool.js";

export interface PlacementPreview {
  readonly type: string;
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
  hero: HeroEntity | null;
  selectedHeroId: string | null;
  selectedHeroAbility: ActiveHeroSkillId | null;
  heroAbilityPreview: { readonly type: ActiveHeroSkillId; readonly position: Position; readonly radius: number; readonly valid: boolean } | null;
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
    | "enemy-heal"
    | "enemy-enrage"
    | "enemy-summon"
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
  update(
    deltaSeconds: number,
    towers: RuntimeTower[],
    enemies: EnemyEntity[],
    hero?: HeroEntity | null,
  ): BattleResult;
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
  readonly levelId?: LevelId;
  readonly map?: MapDefinition;
  readonly waves?: readonly WaveDefinition[];
  readonly availableTowerTypes?: readonly string[];
  readonly availableEnemyTypes?: readonly string[];
  readonly contentVersion?: number;
  readonly levels?: readonly LevelDefinition[];
  readonly storage?: GameStorage;
}

export interface LevelOption {
  readonly id: LevelId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly bestScore: number;
  readonly bestDifficulty: DifficultyId | null;
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
  readonly levelId: LevelId;
  readonly levelName: string;
  readonly contentVersion: number;
  readonly map: MapDefinition;
  readonly grid: InstanceType<typeof Grid>;
  readonly converter: InstanceType<typeof CoordinateConverter>;
  readonly path: InstanceType<typeof Path>;
  readonly flow = new GameFlow();
  readonly waves: readonly WaveDefinition[];
  readonly levels: readonly LevelDefinition[];

  readonly #storage: GameStorage;
  readonly #level: LevelDefinition;
  readonly #availableTowerTypes: ReadonlySet<string>;
  readonly #availableEnemyTypes: ReadonlySet<string>;
  readonly #placement = new PlacementSystem();
  readonly #effectPool = new CombatEffectPool();
  readonly #heroExperience = new HeroExperienceSystem();
  readonly #towerAura = new TowerAuraSystem();
  readonly #listeners = new Set<() => void>();
  readonly #presentationListeners = new Set<(cue: PresentationCue) => void>();
  #settings: GameSettings;
  #state: CampaignRuntime;
  #waveSystem!: WaveSystemPort;
  #battle!: BattleSimulationPort;
  #heroMovement!: HeroMovementSystem;
  #heroMovementInput: HeroMovementInput = { x: 0, y: 0 };
  #nextTower = 1;
  #waveLivesAtStart = 0;
  #autosaveElapsed = 0;
  #savedGameAvailable = false;
  #reducedMotion = false;

  constructor(options: CampaignSessionOptions = {}) {
    this.#storage = options.storage ?? new GameStorage(
      typeof localStorage === "undefined" ? null : localStorage,
    );
    this.#settings = this.#storage.loadSettings();
    this.levelId = options.levelId ?? "level-1";
    this.#level = getLevelDefinition(this.levelId);
    this.levelName = this.#level.name;
    this.contentVersion = options.contentVersion ?? this.#level.contentVersion;
    this.levels = options.levels ?? levelDefinitions;
    this.map = options.map ?? (
      this.levelId === "level-1"
        ? map01 as unknown as MapDefinition
        : this.#level.map
    );
    this.waves = options.waves ?? (
      this.levelId === "level-1"
        ? waveDefinitions as unknown as readonly WaveDefinition[]
        : this.#level.waves
    );
    this.#availableTowerTypes = new Set(
      options.availableTowerTypes ?? this.#level.availableTowerTypes,
    );
    this.#availableEnemyTypes = new Set(
      options.availableEnemyTypes ?? this.#level.availableEnemyTypes,
    );
    for (const type of this.#availableTowerTypes) {
      if (!towerCatalog[type]) throw new Error(`Level contains an unknown tower type: ${type}`);
    }
    for (const wave of this.waves) {
      for (const group of wave.groups) {
        if (!this.#availableEnemyTypes.has(group.type) || !enemyCatalog[group.type]) {
          throw new Error(`Level wave contains unavailable enemy type: ${group.type}`);
        }
      }
    }
    this.#settings = { ...this.#settings, selectedLevelId: this.levelId };
    this.#saveSettings();
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
    return this.#settings.bestScoreByLevel[this.levelId] ?? 0;
  }

  get levelOptions(): readonly LevelOption[] {
    return this.levels.map((level) => ({
      id: level.id,
      number: level.number,
      name: level.name,
      description: level.description,
      unlocked: level.playable && this.#settings.unlockedLevelIds.includes(level.id),
      completed: this.#settings.completedLevelIds.includes(level.id),
      bestScore: this.#settings.bestScoreByLevel[level.id] ?? 0,
      bestDifficulty: this.#settings.bestDifficultyByLevel[level.id] ?? null,
    }));
  }

  get nextLevelId(): LevelId | null {
    const next = this.#level.unlocksLevelId;
    return next && this.#settings.unlockedLevelIds.includes(next) ? next : null;
  }

  isLevelUnlocked(levelId: LevelId): boolean {
    const level = this.levels.find((candidate) => candidate.id === levelId);
    return level !== undefined
      && level.playable
      && this.#settings.unlockedLevelIds.includes(levelId);
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

  get hero(): HeroEntity | null {
    return this.#state.hero;
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
    const towers: TowerContent[] = [];
    for (const type of this.#availableTowerTypes) {
      const tower = towerCatalog[type];
      if (tower) towers.push(tower);
    }
    return towers;
  }

  openLevelSelect(): void {
    this.flow.openLevelSelect();
    this.#emit();
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
    this.#heroMovementInput = { x: 0, y: 0 };
    this.#settings = {
      ...this.#settings,
      difficulty,
      selectedLevelId: this.levelId,
    };
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
    this.#state.selectedHeroId = null;
    this.#state.placementPreview = null;
    this.#emit();
  }

  returnToLevelSelect(): void {
    if (this.flow.phase === "preparing"
      || this.flow.phase === "wave"
      || this.flow.phase === "paused"
      || this.flow.phase === "tutorial") {
      this.#saveGame();
      this.#savedGameAvailable = true;
    }
    this.flow.openLevelSelect();
    this.#state.selectedBuildType = null;
    this.#state.selectedTowerId = null;
    this.#state.selectedHeroId = null;
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
    this.#state.selectedHeroId = null;
    this.#state.hoveredEnemyId = null;
    this.#showMessage(`Building ${tower.name}. Choose a buildable cell.`, "info");
    this.#emit();
  }

  cancelAction(): void {
    if (this.#state.selectedHeroAbility) {
      this.#state.selectedHeroAbility = null;
      this.#state.heroAbilityPreview = null;
      this.#showMessage("Ability targeting cancelled.", "info");
    } else if (this.#state.selectedBuildType) {
      this.#state.selectedBuildType = null;
      this.#state.placementPreview = null;
      this.#showMessage("Building cancelled.", "info");
    } else {
      this.#state.selectedTowerId = null;
      this.#state.selectedHeroId = null;
    }
    this.#emit();
  }

  updatePointer(point: Position | null): void {
    if (!point) {
      this.#state.placementPreview = null;
      this.#state.hoveredEnemyId = null;
      this.#state.heroAbilityPreview = null;
      this.#emit();
      return;
    }
    this.#refreshPlacementPreview(point);
    this.#refreshHeroAbilityPreview(point);
    if (!this.#state.selectedBuildType) {
      this.#state.hoveredEnemyId = this.#enemyAt(point)?.id ?? null;
    }
    this.#emit();
  }

  handleBattlefieldClick(point: Position): void {
    if (this.flow.phase !== "preparing" && this.flow.phase !== "wave") return;
    if (this.#state.selectedHeroAbility) {
      this.#confirmHeroAbility(point);
      return;
    }
    if (this.#state.selectedBuildType) {
      this.placeSelectedTower(point);
      return;
    }
    const hero = this.#state.hero;
    if (hero && Math.hypot(hero.position.x - point.x, hero.position.y - point.y) <= hero.radius + 8) {
      this.#state.selectedHeroId = hero.id;
      this.#state.selectedTowerId = null;
      this.#state.hoveredEnemyId = null;
      this.#emit();
      return;
    }
    const selected = this.#state.runtimeTowers.find(
      (tower) => Math.hypot(tower.position.x - point.x, tower.position.y - point.y) <= tower.radius + 7,
    );
    this.#state.selectedTowerId = selected?.id ?? null;
    this.#state.selectedHeroId = null;
    this.#state.hoveredEnemyId = selected ? null : (this.#enemyAt(point)?.id ?? null);
    this.#emit();
  }

  moveHero(point: Position): void {
    if (this.flow.phase !== "preparing" && this.flow.phase !== "wave") return;
    const hero = this.#state.hero;
    if (!hero) throw new CommandValidationError("This level has no controllable hero.");
    const error = this.#heroMovement.setDestination(hero, point, this.#state.occupiedCells);
    if (error) throw new CommandValidationError(error);
    this.#state.selectedHeroId = hero.id;
    this.#state.selectedTowerId = null;
    this.#showMessage(`${hero.name} is moving to the marked position.`, "info");
    this.#saveGame();
    this.#emit();
  }

  upgradeHeroSkill(skillId: HeroSkillId): void {
    if (!(skillId in heroSkillDefinitions)) {
      throw new CommandValidationError("Unknown hero skill.");
    }
    const hero = this.#state.hero;
    if (!hero) throw new CommandValidationError("This level has no controllable hero.");
    const error = hero.skillUpgradeError(skillId);
    if (error) throw new CommandValidationError(error);
    hero.upgradeSkill(skillId);
    this.#towerAura.update(hero, this.#state.runtimeTowers);
    this.#showMessage(
      `${heroSkillDefinitions[skillId].name} upgraded to level ${hero.skills[skillId]}.`,
      "success",
    );
    this.#saveGame();
    this.#emit();
  }

  selectHeroAbility(skillId: ActiveHeroSkillId): void {
    if (!isActiveHeroSkillId(skillId)) throw new CommandValidationError("Unknown active hero ability.");
    const hero = this.#state.hero;
    if (!hero) throw new CommandValidationError("This level has no controllable hero.");
    if (hero.skills[skillId] <= 0) throw new CommandValidationError(`${heroSkillDefinitions[skillId].name} is not learned.`);
    if (hero.abilityCooldowns[skillId] > 0) throw new CommandValidationError(`${heroSkillDefinitions[skillId].name} is cooling down.`);
    if ((skillId === "rainOfArrows" || skillId === "huntersMark") && this.flow.phase !== "wave") {
      throw new CommandValidationError("That ability requires an active wave.");
    }
    this.#state.selectedBuildType = null;
    this.#state.placementPreview = null;
    this.#state.selectedHeroAbility = skillId;
    this.#showMessage(`${heroSkillDefinitions[skillId].name}: choose a target with left click.`, "info");
    this.#emit();
  }

  setHeroMovementInput(input: HeroMovementInput): void {
    const x = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0;
    const y = Number.isFinite(input.y) ? Math.max(-1, Math.min(1, input.y)) : 0;
    this.#heroMovementInput = { x, y };
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
    this.#towerAura.update(this.#state.hero, this.#state.runtimeTowers);
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
    this.#towerAura.update(this.#state.hero, this.#state.runtimeTowers);
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
    if (this.#state.hero) {
      this.#heroMovement.update(
        scaledDelta,
        this.#state.hero,
        this.#state.occupiedCells,
        this.#heroMovementInput,
      );
      this.#state.hero.tickAnimation(scaledDelta);
    }
    for (const enemy of this.#state.enemies) {
      enemy.huntersMarked = false;
      enemy.huntersMarkTowerBonus = 0;
    }
    const marked = this.#state.hero?.markedTargetId
      ? this.#state.enemies.find((enemy) => enemy.id === this.#state.hero?.markedTargetId && enemy.isAlive)
      : null;
    if (marked && this.#state.hero) {
      marked.huntersMarked = true;
      marked.huntersMarkTowerBonus = this.#state.hero.markTowerDamageBonus;
    }
    this.#towerAura.update(this.#state.hero, this.#state.runtimeTowers);

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
      this.#state.hero,
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
    for (const tower of this.towerOptions) {
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
      hero: this.#createHero({
        level: this.#settings.heroLevel,
        xp: this.#settings.heroXp,
        skillPoints: this.#settings.heroSkillPoints,
        skills: this.#settings.heroSkills,
        abilityCooldowns: this.#settings.heroAbilityCooldowns,
      }),
      selectedHeroId: null,
      selectedHeroAbility: null,
      heroAbilityPreview: null,
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
    this.#battle = new BattleSimulation(this.path, {
      createEnemy: (
        type: string,
        overrides?: {
          readonly progress?: number;
          readonly position?: Position;
          readonly splitGeneration?: number;
        },
      ) => this.#createEnemy(type, difficulty, undefined, overrides),
    }) as unknown as BattleSimulationPort;
    this.#heroMovement = new HeroMovementSystem(this.grid, this.converter);
    const reducedMotion = this.#state.reducedMotion;
    this.#effectPool.clear();
    this.#effectPool.setReducedMotion(reducedMotion);
    this.#state.effects = this.#effectPool.effects;
    this.#state.screenShake = 0;
    this.#towerAura.update(this.#state.hero, this.#state.runtimeTowers);
  }

  #createHero(options: {
    readonly level: number;
    readonly xp?: number;
    readonly skillPoints?: number;
    readonly skills?: Readonly<Partial<HeroSkillLevels>>;
    readonly position?: Position;
    readonly moveTarget?: Position | null;
    readonly abilityCooldowns?: Readonly<Partial<Record<ActiveHeroSkillId, number>>>;
  }): HeroEntity | null {
    const definition = this.#level.heroConfig;
    if (!definition) return null;
    const spawn = options.position
      ?? this.converter.gridToWorld(definition.spawnCell, { center: true });
    return new HeroEntity(definition, {
      position: spawn,
      moveTarget: options.moveTarget,
      level: options.level,
      xp: options.xp,
      skillPoints: options.skillPoints,
      skills: options.skills,
      abilityCooldowns: options.abilityCooldowns,
    });
  }

  #createEnemy(
    type: string,
    difficulty = this.#difficulty(this.flow.difficulty),
    currentHealth?: number,
    saved?: {
      readonly id?: string;
      readonly progress?: number;
      readonly position?: Position;
      readonly statusEffects?: readonly Record<string, unknown>[];
      readonly bossPhase?: number;
      readonly shield?: number;
      readonly splitGeneration?: number;
      readonly damageContributors?: readonly (readonly [string, number])[];
    },
  ): EnemyEntity {
    const definition = enemyCatalog[type];
    if (!definition || !this.#availableEnemyTypes.has(type)) {
      throw new Error(`Enemy type is unavailable in ${this.levelName}: ${type}`);
    }
    const maxHealth = Math.round(definition.health * difficulty.enemyHealth);
    const maxShield = Math.round((definition.shield ?? 0) * difficulty.enemyHealth);
    const enemy = new Enemy(type, {
      id: saved?.id,
      health: maxHealth,
      currentHealth: currentHealth ?? maxHealth,
      maxShield,
      shield: saved?.shield ?? maxShield,
      speed: definition.speed * difficulty.enemySpeed,
      reward: Math.max(1, Math.round(definition.reward * difficulty.enemyReward)),
      progress: saved?.progress ?? 0,
      position: saved?.position ?? this.path.getPointAt(saved?.progress ?? 0),
      statusEffects: saved?.statusEffects ?? [],
      bossPhase: saved?.bossPhase ?? 1,
      splitGeneration: saved?.splitGeneration ?? 0,
      damageContributors: saved?.damageContributors ?? [],
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
      type,
      position: this.converter.gridToWorld(cell, { center: true }),
      cellBounds: this.converter.gridRect(cell),
      range: level.range,
      radius: 18,
      color: definition.color ?? runtimeTowerColor(type),
      valid: this.placementError(type, cell) === null,
    };
  }

  #refreshHeroAbilityPreview(point: Position): void {
    const type = this.#state.selectedHeroAbility;
    const hero = this.#state.hero;
    if (!type || !hero) {
      this.#state.heroAbilityPreview = null;
      return;
    }
    const effect = hero.skillEffect(type);
    let valid = true;
    let radius = 20;
    if (type === "rainOfArrows") radius = 105;
    if (type === "windStep") {
      const cell = this.converter.worldToGrid(point);
      valid = this.grid.contains(cell)
        && this.grid.isWalkable(cell)
        && Math.hypot(point.x - hero.position.x, point.y - hero.position.y) <= (effect?.windStepDistance ?? 0);
      radius = 24;
    }
    if (type === "huntersMark") {
      valid = this.#enemyAt(point)?.isAlive === true;
      radius = 22;
    }
    this.#state.heroAbilityPreview = { type, position: { ...point }, radius, valid };
  }

  #confirmHeroAbility(point: Position): void {
    const type = this.#state.selectedHeroAbility;
    const hero = this.#state.hero;
    if (!type || !hero) return;
    if (type === "rainOfArrows") {
      hero.startRainOfArrows(point);
    } else if (type === "windStep") {
      const distance = hero.skillEffect("windStep")?.windStepDistance ?? 0;
      const error = this.#heroMovement.startWindStep(hero, point, distance, this.#state.occupiedCells);
      if (error) throw new CommandValidationError(error);
      hero.beginWindStepCooldown();
    } else {
      const enemy = this.#enemyAt(point);
      if (!enemy?.isAlive) throw new CommandValidationError("Hunter's Mark requires a living enemy.");
      hero.applyHuntersMark(enemy.id);
      enemy.huntersMarked = true;
      enemy.huntersMarkTowerBonus = hero.markTowerDamageBonus;
    }
    this.#state.selectedHeroAbility = null;
    this.#state.heroAbilityPreview = null;
    this.#showMessage(`${heroSkillDefinitions[type].name} activated.`, "success");
    this.#saveGame();
    this.#emit();
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
      this.#showMessage(`${this.levelName} is secure.`, "success");
    } else {
      this.#showMessage("The outpost has fallen.", "error");
    }
    this.flow.finish(outcome);
    const bestScoreByLevel = {
      ...this.#settings.bestScoreByLevel,
      [this.levelId]: Math.max(this.bestScore, this.#state.score),
    };
    let completedLevelIds = [...this.#settings.completedLevelIds];
    let unlockedLevelIds = [...this.#settings.unlockedLevelIds];
    let bestDifficultyByLevel = { ...this.#settings.bestDifficultyByLevel };
    if (outcome === "victory") {
      if (!completedLevelIds.includes(this.levelId)) completedLevelIds.push(this.levelId);
      const next = this.#level.unlocksLevelId;
      if (next && !unlockedLevelIds.includes(next)) unlockedLevelIds.push(next);
      const rank: Readonly<Record<DifficultyId, number>> = { easy: 1, normal: 2, hard: 3 };
      const previous = bestDifficultyByLevel[this.levelId];
      if (!previous || rank[this.flow.difficulty] > rank[previous]) {
        bestDifficultyByLevel = {
          ...bestDifficultyByLevel,
          [this.levelId]: this.flow.difficulty,
        };
      }
    }
    this.#settings = {
      ...this.#settings,
      selectedLevelId: this.levelId,
      unlockedLevelIds,
      completedLevelIds,
      bestScoreByLevel,
      bestDifficultyByLevel,
      heroLevel: outcome === "victory" && this.#state.hero
        ? this.#state.hero.level
        : this.#settings.heroLevel,
      heroXp: outcome === "victory" && this.#state.hero
        ? this.#state.hero.xp
        : this.#settings.heroXp,
      heroSkillPoints: outcome === "victory" && this.#state.hero
        ? this.#state.hero.skillPoints
        : this.#settings.heroSkillPoints,
      heroSkills: outcome === "victory" && this.#state.hero
        ? { ...this.#state.hero.skills }
        : this.#settings.heroSkills,
      heroAbilityCooldowns: outcome === "victory" && this.#state.hero
        ? { ...this.#state.hero.abilityCooldowns }
        : this.#settings.heroAbilityCooldowns,
    };
    this.#saveSettings();
    this.#storage.clearGame();
    this.#savedGameAvailable = false;
    this.#publish({ type: outcome });
  }

  #recordBattleEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      const hero = this.#state.hero;
      if (hero) {
        if (event.type === "shot" && event.sourceId === hero.id) hero.shotAnimation = 1;
        if (event.type === "enemy-death") {
          const experience = this.#heroExperience.award(event, hero);
          if (experience.levelsGained > 0) {
            this.#showMessage(
              `${hero.name} reached level ${hero.level} and gained ${experience.levelsGained} skill point${experience.levelsGained === 1 ? "" : "s"}.`,
              "success",
            );
          }
        }
      }
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
      || this.flow.phase === "level-select"
      || this.flow.phase === "difficulty"
      || this.flow.phase === "victory"
      || this.flow.phase === "defeat") return;
    this.#storage.saveGame({
      levelId: this.levelId,
      mapId: this.map.id,
      contentVersion: this.contentVersion,
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
        shield: enemy.shield,
        splitGeneration: enemy.splitGeneration,
        progress: enemy.progress,
        position: { ...enemy.position },
        statusEffects: enemy.statusEffects.map((effect) => ({ ...effect })),
        damageContributors: [...enemy.damageContributors.entries()],
        bossPhase: enemy.bossPhase,
      })),
      hero: this.#state.hero ? {
        id: this.#state.hero.id,
        position: { ...this.#state.hero.position },
        moveTarget: this.#state.hero.moveTarget ? { ...this.#state.hero.moveTarget } : null,
        level: this.#state.hero.level,
        xp: this.#state.hero.xp,
        skillPoints: this.#state.hero.skillPoints,
        skills: { ...this.#state.hero.skills },
        abilityCooldowns: { ...this.#state.hero.abilityCooldowns },
      } : null,
      wave: this.#waveSystem.snapshot(),
    });
    this.#savedGameAvailable = true;
  }

  #restore(save: ActiveGameSave): void {
    if (save.levelId !== this.levelId
      || save.mapId !== this.map.id
      || save.contentVersion !== this.contentVersion) {
      throw new Error("Save is incompatible with the selected level content");
    }
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
    if (this.#level.heroConfig) {
      if (!save.hero
        || save.hero.id !== this.#level.heroConfig.id
        || !isFinitePosition(save.hero.position)
        || !this.grid.isWalkable(this.converter.worldToGrid(save.hero.position))
        || (save.hero.moveTarget !== null
          && (!isFinitePosition(save.hero.moveTarget)
            || !this.grid.isWalkable(this.converter.worldToGrid(save.hero.moveTarget))))) {
        throw new Error("Save contains an invalid hero");
      }
      const restoredHero = this.#createHero({
        level: save.hero.level,
        xp: save.hero.xp,
        skillPoints: save.hero.skillPoints,
        skills: save.hero.skills,
        position: save.hero.position,
        moveTarget: save.hero.moveTarget,
        abilityCooldowns: save.hero.abilityCooldowns,
      });
      if (!restoredHero
        || (restoredHero.level < restoredHero.maximumLevel
          && save.hero.xp >= restoredHero.xpToNextLevel)
        || Object.values(restoredHero.skills).reduce((total, level) => total + level, 0)
          + restoredHero.skillPoints > restoredHero.level - 1) {
        throw new Error("Save contains invalid hero progression");
      }
      restoredState.hero = restoredHero;
    } else if (save.hero) {
      throw new Error("Save contains a hero unavailable in this level");
    }
    this.#state = restoredState;
    this.flow.restore(save.flow);
    this.#resetSystems();
    if (save.wave.queue.some((entry) => !this.#availableEnemyTypes.has(entry.type))) {
      throw new Error("Save contains an unavailable queued enemy");
    }
    this.#waveSystem.restore(save.wave);
    this.#nextTower = save.nextTower;
    this.#waveLivesAtStart = save.waveLivesAtStart;
    this.#heroMovementInput = { x: 0, y: 0 };

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
    this.#towerAura.update(this.#state.hero, this.#state.runtimeTowers);
    if (this.#state.hero) {
      this.#heroMovement.restoreDestination(
        this.#state.hero,
        this.#state.hero.moveTarget,
        this.#state.occupiedCells,
      );
    }

    for (const savedEnemy of save.enemies) {
      if (typeof savedEnemy.id !== "string"
        || savedEnemy.id.length === 0
        || !enemyCatalog[savedEnemy.type]
        || !this.#availableEnemyTypes.has(savedEnemy.type)
        || !Number.isFinite(savedEnemy.health)
        || savedEnemy.health < 0
        || (savedEnemy.shield !== undefined
          && (!Number.isFinite(savedEnemy.shield) || savedEnemy.shield < 0))
        || (savedEnemy.splitGeneration !== undefined
          && (!Number.isInteger(savedEnemy.splitGeneration)
            || savedEnemy.splitGeneration < 0
            || savedEnemy.splitGeneration > 1))
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
      selectedLevelId: this.levelId,
    };
    this.#saveSettings();
  }

  #saveSettings(): void {
    this.#storage.saveSettings({
      tutorialSeen: this.#settings.tutorialSeen,
      difficulty: this.#settings.difficulty,
      speed: this.#settings.speed,
      soundEnabled: this.#settings.soundEnabled,
      musicVolume: this.#settings.musicVolume,
      sfxVolume: this.#settings.sfxVolume,
      selectedLevelId: this.#settings.selectedLevelId,
      unlockedLevelIds: this.#settings.unlockedLevelIds,
      completedLevelIds: this.#settings.completedLevelIds,
      bestScoreByLevel: this.#settings.bestScoreByLevel,
      bestDifficultyByLevel: this.#settings.bestDifficultyByLevel,
      heroLevel: this.#settings.heroLevel,
      heroXp: this.#settings.heroXp,
      heroSkillPoints: this.#settings.heroSkillPoints,
      heroSkills: this.#settings.heroSkills,
      heroAbilityCooldowns: this.#settings.heroAbilityCooldowns,
    });
  }

  #showMessage(text: string, kind: UiMessage["kind"]): void {
    this.#state.message = { text, kind };
  }

  #tower(type: string): TowerContent {
    const tower = towerCatalog[type];
    if (!tower || !this.#availableTowerTypes.has(type)) {
      throw new CommandValidationError(`Tower type is unavailable in ${this.levelName}: ${type}`);
    }
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
