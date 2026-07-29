import { CommandValidationError } from "../errors.js";
import { EconomySystem } from "../EconomySystem.js";
import { PlacementSystem } from "../PlacementSystem.js";
import type { GameState } from "../types.js";
import type { Command } from "./Command.js";

export class SellTowerCommand implements Command<number> {
  constructor(
    private readonly playerId: string,
    private readonly towerId: string,
    private readonly economy = new EconomySystem(),
    private readonly placement = new PlacementSystem(),
  ) {}

  execute(state: GameState): number {
    const player = this.economy.getPlayer(state, this.playerId);
    const tower = state.towers.get(this.towerId);
    if (!tower) throw new CommandValidationError(`Unknown tower: ${this.towerId}`);
    if (tower.ownerId !== this.playerId) throw new CommandValidationError("Tower belongs to another player");
    const definition = this.economy.getDefinition(state, tower.type);
    const level = definition.levels[tower.level];
    if (!level) throw new CommandValidationError("Tower has an invalid level");
    const occupiedBy = state.occupiedCells.get(`${tower.position.x},${tower.position.y}`);
    if (occupiedBy !== tower.id) throw new CommandValidationError("Tower placement is inconsistent");
    const refund = level.sellValue;
    if (!Number.isFinite(refund) || refund < 0) throw new CommandValidationError("Invalid sell value");

    this.placement.remove(state, tower);
    this.economy.credit(player, refund);
    return refund;
  }
}
