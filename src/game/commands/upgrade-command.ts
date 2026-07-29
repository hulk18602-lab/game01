import type { Tower } from "../model.js";
import type { EconomySystem } from "../systems.js";

export class UpgradeCommand {
  public constructor(private readonly economy: EconomySystem, public readonly towerId: string) {}

  public execute(): Tower {
    return this.economy.upgrade(this.towerId);
  }
}
