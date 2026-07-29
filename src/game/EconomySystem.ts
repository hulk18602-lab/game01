import { CommandValidationError } from "./errors.js";
import type { GameState, Player, TowerDefinition } from "./types.js";

export class EconomySystem {
  getPlayer(state: GameState, playerId: string): Player {
    const player = state.players.get(playerId);
    if (!player) throw new CommandValidationError(`Unknown player: ${playerId}`);
    return player;
  }

  getDefinition(state: GameState, towerType: string): TowerDefinition {
    const definition = state.towerDefinitions.get(towerType);
    if (!definition || definition.levels.length === 0) {
      throw new CommandValidationError(`Unknown tower type: ${towerType}`);
    }
    return definition;
  }

  requireFunds(player: Player, amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new CommandValidationError("Invalid transaction amount");
    }
    if (player.balance < amount) {
      throw new CommandValidationError("Insufficient funds");
    }
  }

  debit(player: Player, amount: number): void {
    this.requireFunds(player, amount);
    player.balance -= amount;
  }

  credit(player: Player, amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new CommandValidationError("Invalid transaction amount");
    }
    player.balance += amount;
  }
}
