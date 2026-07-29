import type { EconomySystem } from "../systems.js";

export class SellCommand {
  public constructor(private readonly economy: EconomySystem, public readonly towerId: string) {}

  public execute(): number {
    return this.economy.sell(this.towerId);
  }
}
