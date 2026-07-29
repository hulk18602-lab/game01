import { CommandValidationError } from "./errors.js";
import { cellKey, type GameState, type Position, type Tower } from "./types.js";

export class PlacementSystem {
  validateCell(state: GameState, position: Position): string {
    if (!Number.isInteger(position.x) || !Number.isInteger(position.y)) {
      throw new CommandValidationError("Position must contain integer coordinates");
    }
    if (position.x < 0 || position.y < 0 || position.x >= state.width || position.y >= state.height) {
      throw new CommandValidationError("Position is outside the board");
    }
    const key = cellKey(position);
    if (state.occupiedCells.has(key)) throw new CommandValidationError("Cell is occupied");
    return key;
  }

  occupy(state: GameState, tower: Tower, validatedCellKey: string): void {
    state.towers.set(tower.id, tower);
    state.occupiedCells.set(validatedCellKey, tower.id);
  }

  remove(state: GameState, tower: Tower): void {
    state.towers.delete(tower.id);
    state.occupiedCells.delete(cellKey(tower.position));
  }
}
