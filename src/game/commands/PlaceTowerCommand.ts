import { CommandValidationError } from "../errors.js";
import { EconomySystem } from "../EconomySystem.js";
import { PlacementSystem } from "../PlacementSystem.js";
import type { GameState, Position, Tower } from "../types.js";
import type { Command } from "./Command.js";

export class PlaceTowerCommand implements Command<Tower> {
  constructor(
    private readonly playerId: string,
    private readonly towerId: string,
    private readonly towerType: string,
    private readonly position: Position,
    private readonly economy = new EconomySystem(),
    private readonly placement = new PlacementSystem(),
  ) {}

  execute(state: GameState): Tower {
    // Validation phase: no state is modified before every precondition passes.
    const player = this.economy.getPlayer(state, this.playerId);
    const definition = this.economy.getDefinition(state, this.towerType);
    if (!this.towerId || state.towers.has(this.towerId)) {
      throw new CommandValidationError("Tower id is empty or already in use");
    }
    const key = this.placement.validateCell(state, this.position);
    const cost = definition.levels[0]!.cost;
    this.economy.requireFunds(player, cost);

    const tower: Tower = {
      id: this.towerId,
      ownerId: this.playerId,
      type: this.towerType,
      level: 0,
      position: { ...this.position },
    };

    // Commit phase. These operations cannot fail after the validation above.
    this.economy.debit(player, cost);
    this.placement.occupy(state, tower, key);
    return tower;
  }
}
