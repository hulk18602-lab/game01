export type DifficultyId = "easy" | "normal" | "hard";
export type GameSpeed = 1 | 2 | 3;
export type GamePhase =
  | "menu"
  | "difficulty"
  | "tutorial"
  | "preparing"
  | "wave"
  | "paused"
  | "victory"
  | "defeat";

export interface FlowSnapshot {
  readonly phase: GamePhase;
  readonly resumePhase: "preparing" | "wave";
  readonly difficulty: DifficultyId;
  readonly countdown: number;
  readonly speed: GameSpeed;
}

const gameplayPhases: readonly GamePhase[] = ["preparing", "wave"];
const difficultyIds: readonly DifficultyId[] = ["easy", "normal", "hard"];

/** Owns session navigation, pause and preparation timing without touching game entities. */
export class GameFlow {
  phase: GamePhase = "menu";
  resumePhase: "preparing" | "wave" = "preparing";
  difficulty: DifficultyId = "normal";
  countdown = 0;
  speed: GameSpeed = 1;

  openDifficulty(): void {
    this.phase = "difficulty";
  }

  startNewGame(difficulty: DifficultyId, tutorialRequired: boolean, preparationSeconds: number): void {
    this.difficulty = difficulty;
    this.countdown = preparationSeconds;
    this.resumePhase = "preparing";
    this.phase = tutorialRequired ? "tutorial" : "preparing";
  }

  completeTutorial(): void {
    if (this.phase === "tutorial") this.phase = "preparing";
  }

  beginPreparation(seconds: number): void {
    this.countdown = Math.max(0, seconds);
    this.resumePhase = "preparing";
    this.phase = "preparing";
  }

  beginWave(): void {
    this.countdown = 0;
    this.resumePhase = "wave";
    this.phase = "wave";
  }

  update(deltaSeconds: number): boolean {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("Flow delta must be a non-negative finite number");
    }
    if (this.phase !== "preparing") return false;
    this.countdown = Math.max(0, this.countdown - deltaSeconds);
    return this.countdown === 0;
  }

  togglePause(): boolean {
    if (this.phase === "paused") {
      this.phase = this.resumePhase;
      return true;
    }
    if (this.phase !== "preparing" && this.phase !== "wave") return false;
    this.resumePhase = this.phase;
    this.phase = "paused";
    return true;
  }

  setSpeed(speed: GameSpeed): void {
    if (![1, 2, 3].includes(speed)) throw new RangeError("Game speed must be 1, 2 or 3");
    this.speed = speed;
  }

  finish(outcome: "victory" | "defeat"): void {
    this.phase = outcome;
  }

  returnToMenu(): void {
    this.phase = "menu";
  }

  snapshot(): FlowSnapshot {
    return {
      phase: this.phase,
      resumePhase: this.resumePhase,
      difficulty: this.difficulty,
      countdown: this.countdown,
      speed: this.speed,
    };
  }

  restore(snapshot: FlowSnapshot): void {
    if (!difficultyIds.includes(snapshot.difficulty)) throw new Error("Save has an invalid difficulty");
    if (![1, 2, 3].includes(snapshot.speed)) throw new Error("Save has an invalid game speed");
    if (!Number.isFinite(snapshot.countdown) || snapshot.countdown < 0) {
      throw new Error("Save has an invalid countdown");
    }
    this.difficulty = snapshot.difficulty;
    this.speed = snapshot.speed;
    this.countdown = snapshot.countdown;
    this.resumePhase = snapshot.resumePhase === "wave" ? "wave" : "preparing";
    this.phase = snapshot.phase === "tutorial"
      ? "tutorial"
      : gameplayPhases.includes(snapshot.phase)
        ? snapshot.phase
        : snapshot.phase === "paused"
          ? "paused"
          : this.resumePhase;
  }
}

export default GameFlow;
