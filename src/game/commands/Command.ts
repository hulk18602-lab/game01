import type { GameState } from "../types.js";

export interface Command<T = void> {
  execute(state: GameState): T;
}
