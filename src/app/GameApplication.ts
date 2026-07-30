import { AudioManager } from "../audio/AudioManager.js";
import levelDefinitions, {
  getLevelDefinition,
  type LevelDefinition,
  type LevelId,
} from "../content/levels/levelDefinitions.js";
import { GameLoop } from "../core/GameLoop.js";
import type { EnemyEntity, ProjectileEntity } from "../game/CampaignSession.js";
import type { GameSpeed } from "../game/GameFlow.js";
import { GameStorage } from "../game/persistence/GameStorage.js";
import type { RuntimeTower } from "../game/index.js";
import { KeyboardInputAdapter } from "../input/index.js";
import type { UiCommand } from "../ui/index.js";
import { isGameplayPhase } from "./createUiSelectors.js";
import { LevelRuntime } from "./LevelRuntime.js";

interface GameLoopPort {
  start(): boolean;
  stop(): boolean;
}

type GameLoopConstructor = new (options: {
  readonly schedule: (callback: FrameRequestCallback) => number;
  readonly cancel: (handle: number) => void;
  readonly update: (delta: number) => void;
  readonly render: () => void;
}) => GameLoopPort;

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
  readonly levelId: LevelId;
  readonly mapId: string;
  readonly pathLength: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly reducedMotion: boolean;
  readonly activeEffects: number;
}

declare global {
  interface Window {
    __GAME_DEBUG__?: GameDebugApi;
  }
}

/** Application shell. Per-level browser dependencies live and die inside LevelRuntime. */
export class GameApplication {
  readonly #root: HTMLElement;
  readonly #storage: GameStorage;
  readonly #audio: AudioManager;
  readonly #loop: GameLoopPort;
  readonly #keyboard: KeyboardInputAdapter;
  readonly #motionQuery: MediaQueryList | null;
  readonly #shortScenario: boolean;
  #runtime: LevelRuntime;
  #started = false;

  readonly #handleResize = (): void => this.#runtime.resize();
  readonly #handleMotionChange = (event: MediaQueryListEvent): void => {
    this.#runtime.setReducedMotion(event.matches);
    this.#runtime.render();
  };

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#storage = new GameStorage(typeof localStorage === "undefined" ? null : localStorage);
    const settings = this.#storage.loadSettings();
    this.#audio = new AudioManager({
      enabled: settings.soundEnabled,
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
    });
    this.#shortScenario = import.meta.env.DEV
      && new URLSearchParams(window.location.search).get("scenario") === "short";
    this.#motionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const selectedLevel = getLevelDefinition(settings.selectedLevelId);
    const initialLevelId = selectedLevel.number <= 2
      && settings.unlockedLevelIds.includes(settings.selectedLevelId)
      ? settings.selectedLevelId
      : "level-1";
    this.#runtime = this.#createRuntime(getLevelDefinition(initialLevelId));

    const GameLoopAdapter = GameLoop as unknown as GameLoopConstructor;
    this.#loop = new GameLoopAdapter({
      schedule: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
      cancel: (handle: number) => cancelAnimationFrame(handle),
      update: (delta: number) => this.#runtime.update(delta),
      render: () => {
        this.#runtime.render();
        this.#audio.update();
      },
    });
    this.#keyboard = new KeyboardInputAdapter(window, (event) => {
      if (event.phase === "down" && !event.repeat) this.#onKey(event.code);
    });
    this.#motionQuery?.addEventListener("change", this.#handleMotionChange);
    window.addEventListener("resize", this.#handleResize, { passive: true });
    this.#installDebugApi();
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#runtime.mount();
    this.#loop.start();
  }

  destroy(): void {
    this.#loop.stop();
    this.#keyboard.destroy();
    window.removeEventListener("resize", this.#handleResize);
    this.#motionQuery?.removeEventListener("change", this.#handleMotionChange);
    this.#runtime.destroy();
    this.#audio.destroy();
    if (import.meta.env.DEV) delete window.__GAME_DEBUG__;
    this.#started = false;
  }

  #createRuntime(level: LevelDefinition): LevelRuntime {
    return new LevelRuntime({
      root: this.#root,
      level,
      levels: levelDefinitions,
      storage: this.#storage,
      audio: this.#audio,
      shortScenario: this.#shortScenario,
      reducedMotion: this.#motionQuery?.matches ?? false,
      dispatch: (command) => this.#dispatch(command),
      run: (action) => this.#run(action),
    });
  }

  #replaceRuntime(level: LevelDefinition): void {
    const replacement = this.#createRuntime(level);
    this.#runtime.destroy();
    this.#runtime = replacement;
    if (this.#started) this.#runtime.mount();
  }

  #selectLevel(levelId: LevelId): void {
    if (!this.#runtime.session.isLevelUnlocked(levelId)) {
      throw new Error("Complete the previous level to unlock this campaign chapter.");
    }
    this.#replaceRuntime(getLevelDefinition(levelId));
    this.#runtime.session.openDifficulty();
  }

  #continueGame(): void {
    const save = this.#storage.loadGame();
    if (!save) {
      this.#runtime.session.continueGame();
      return;
    }
    const settings = this.#storage.loadSettings();
    if (!settings.unlockedLevelIds.includes(save.levelId)
      || getLevelDefinition(save.levelId).number > 2) {
      this.#storage.clearGame();
      throw new Error("The saved level is no longer unlocked.");
    }
    if (this.#runtime.session.levelId !== save.levelId) {
      this.#replaceRuntime(getLevelDefinition(save.levelId));
    }
    this.#runtime.session.continueGame();
  }

  #dispatch(command: UiCommand): void {
    this.#run(() => {
      const session = this.#runtime.session;
      switch (command.type) {
        case "open-level-select":
          session.openLevelSelect();
          break;
        case "select-level":
        case "next-level":
          this.#selectLevel(command.levelId);
          break;
        case "open-difficulty":
          session.openDifficulty();
          break;
        case "new-game":
          session.newGame(command.difficulty);
          break;
        case "continue-game":
          this.#continueGame();
          break;
        case "complete-tutorial":
          session.completeTutorial();
          break;
        case "start-wave":
          session.startWave(true);
          break;
        case "select-build":
          session.selectBuild(command.towerType);
          break;
        case "cancel-build":
          session.cancelAction();
          break;
        case "upgrade-tower":
          session.upgradeTower(command.towerId);
          break;
        case "sell-tower":
          session.sellTower(command.towerId);
          break;
        case "set-targeting":
          session.setTargeting(command.towerId, command.mode);
          break;
        case "toggle-pause":
          session.togglePause();
          break;
        case "set-speed":
          session.setSpeed(command.speed);
          break;
        case "set-audio":
          session.setAudioSettings(command);
          break;
        case "restart-game":
          session.restart();
          break;
        case "return-level-select":
          session.returnToLevelSelect();
          break;
        case "return-menu":
          session.returnToMenu();
          break;
      }
    });
  }

  #onKey(code: string): void {
    const session = this.#runtime.session;
    const state = session.getState();
    if (code === "Escape") {
      if (state.selectedBuildType || state.selectedTowerId) {
        this.#run(() => session.cancelAction());
      } else if (isGameplayPhase(session.phase)) {
        this.#run(() => session.togglePause());
      } else if (
        session.phase === "level-select"
        || session.phase === "difficulty"
        || session.phase === "tutorial"
      ) {
        this.#run(() => session.returnToMenu());
      }
      return;
    }
    if (code === "KeyP") {
      this.#run(() => session.togglePause());
      return;
    }
    if (code === "Space") {
      if (session.canStartWave) this.#run(() => session.startWave(true));
      return;
    }
    const tower = session.towerOptions.find((option) => `Digit${option.hotkey}` === code);
    if (tower) {
      this.#run(() => session.selectBuild(tower.id));
      return;
    }
    if (code === "KeyU" && state.selectedTowerId) {
      this.#run(() => session.upgradeTower(state.selectedTowerId!));
    } else if ((code === "Delete" || code === "KeyS") && state.selectedTowerId) {
      this.#run(() => session.sellTower(state.selectedTowerId!));
    } else if (code === "KeyT" && state.selectedTowerId) {
      this.#run(() => session.cycleSelectedTargeting());
    } else if (code === "Digit0") {
      const next = (session.speed % 3 + 1) as GameSpeed;
      this.#run(() => session.setSpeed(next));
    }
  }

  #run(action: () => void): void {
    void this.#audio.unlock();
    try {
      action();
    } catch (error) {
      this.#runtime.session.reportError(error);
    }
    this.#audio.applySettings(this.#runtime.session.audioSettings);
    void this.#audio.unlock();
    this.#runtime.render();
  }

  #installDebugApi(): void {
    if (!import.meta.env.DEV) return;
    const application = this;
    window.__GAME_DEBUG__ = {
      get towers() { return application.#runtime.session.getState().runtimeTowers; },
      get enemies() { return application.#runtime.session.getState().enemies; },
      get projectiles() { return application.#runtime.session.projectiles; },
      get lives() { return application.#runtime.session.getState().lives; },
      get gold() {
        return application.#runtime.session.getState().players.get("player")!.balance;
      },
      get score() { return application.#runtime.session.getState().score; },
      get currentWave() { return application.#runtime.session.currentWaveNumber; },
      get phase() { return application.#runtime.session.phase; },
      get speed() { return application.#runtime.session.speed; },
      get levelId() { return application.#runtime.session.levelId; },
      get mapId() { return application.#runtime.session.map.id; },
      get pathLength() { return application.#runtime.session.path.length; },
      get worldWidth() { return application.#runtime.worldWidth; },
      get worldHeight() { return application.#runtime.worldHeight; },
      get canvasWidth() { return application.#runtime.canvas.width; },
      get canvasHeight() { return application.#runtime.canvas.height; },
      get reducedMotion() { return application.#runtime.session.getState().reducedMotion; },
      get activeEffects() { return application.#runtime.session.getState().effects.length; },
    };
  }
}

export default GameApplication;
