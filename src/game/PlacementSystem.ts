import { CommandValidationError } from "./errors.js";
import { cellKey, type GameState, type Position, type Tower } from "./types.js";

export class PlacementSystem {
  validateCell(state: GameState, position: Position): string {
    if (!Number.isInteger(position.x) || !Number.isInteger(position.y)) {
      throw new CommandValidationError("Choose a cell inside the map.");
    }
    if (position.x < 0 || position.y < 0 || position.x >= state.width || position.y >= state.height) {
      throw new CommandValidationError("Click inside the map.");
    }
    const key = cellKey(position);
    if (state.occupiedCells.has(key)) {
      throw new CommandValidationError("This cell is already occupied.");
    }
    const cell = state.cells.get(key);
    if (!cell) throw new CommandValidationError("This cell has no map definition.");
    if (!cell.buildable) {
      if (cell.terrain === "road") {
        throw new CommandValidationError("Towers cannot be built on the enemy route.");
      }
      if (cell.terrain === "water" || cell.terrain === "rock") {
        throw new CommandValidationError("Towers cannot be built on water or rocks.");
      }
      throw new CommandValidationError("This cell is not available for building.");
    }
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
