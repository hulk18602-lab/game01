import type { CellPosition, Tower } from "../model.js";
import type { PlacementSystem } from "../systems.js";

export class PlaceCommand {
  public constructor(
    private readonly placement: PlacementSystem,
    public readonly towerId: string,
    public readonly towerType: string,
    public readonly position: CellPosition,
  ) {}

  public execute(): Tower {
    return this.placement.place(this.towerId, this.towerType, this.position);
  }
}
