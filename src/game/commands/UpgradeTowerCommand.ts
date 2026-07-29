import { CommandValidationError } from "../errors.js";
import { EconomySystem } from "../EconomySystem.js";
import type { GameState, Tower } from "../types.js";
import type { Command } from "./Command.js";

export class UpgradeTowerCommand implements Command<Tower> {
  constructor(
    private readonly playerId: string,
    private readonly towerId: string,
    private readonly economy = new EconomySystem(),
  ) {}

  execute(state: GameState): Tower {
    const player = this.economy.getPlayer(state, this.playerId);
    const tower = state.towers.get(this.towerId);
    if (!tower) throw new CommandValidationError(`Unknown tower: ${this.towerId}`);
    if (tower.ownerId !== this.playerId) throw new CommandValidationError("Tower belongs to another player");
    const definition = this.economy.getDefinition(state, tower.type);
    const nextLevel = definition.levels[tower.level + 1];
    if (!nextLevel) throw new CommandValidationError("Tower is already at maximum level");
    this.economy.requireFunds(player, nextLevel.cost);

    this.economy.debit(player, nextLevel.cost);
    tower.level += 1;
    return tower;
  }
}
