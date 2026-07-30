import { CommandValidationError } from "../errors.js";
import type { GameState, TargetingMode, Tower } from "../types.js";
import type { Command } from "./Command.js";

const modes: readonly TargetingMode[] = ["first", "nearest", "strongest"];

export class SetTargetingCommand implements Command<Tower> {
  constructor(
    private readonly playerId: string,
    private readonly towerId: string,
    private readonly mode: TargetingMode,
  ) {}

  execute(state: GameState): Tower {
    const tower = state.towers.get(this.towerId);
    if (!tower) throw new CommandValidationError(`Unknown tower: ${this.towerId}`);
    if (tower.ownerId !== this.playerId) throw new CommandValidationError("Tower belongs to another player");
    if (!modes.includes(this.mode)) throw new CommandValidationError("Unknown targeting mode");
    tower.targeting = this.mode;
    return tower;
  }
}
