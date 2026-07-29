import {
  cellKey,
  CommandValidationError,
  type CellPosition,
  GameState,
  type Tower,
  type TowerDefinition,
} from "./model.js";

export type PlacementRule = (position: CellPosition, state: Readonly<GameState>) => string | undefined;

export class PlacementSystem {
  public constructor(
    private readonly state: GameState,
    private readonly definitions: ReadonlyMap<string, TowerDefinition>,
    private readonly placementRule: PlacementRule = () => undefined,
  ) {}

  public place(towerId: string, towerType: string, position: CellPosition): Tower {
    const definition = this.definitions.get(towerType);
    if (!definition) throw new CommandValidationError(`Unknown tower type: ${towerType}`);
    if (!towerId.trim()) throw new CommandValidationError("Tower id must not be empty");
    if (this.state.towers.has(towerId)) throw new CommandValidationError(`Tower already exists: ${towerId}`);
    if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) {
      throw new CommandValidationError("Cell coordinates must be safe integers");
    }
    const key = cellKey(position);
    if (this.state.occupiedCells.has(key)) throw new CommandValidationError(`Cell is occupied: ${key}`);
    const ruleError = this.placementRule(position, this.state);
    if (ruleError) throw new CommandValidationError(ruleError);
    if (this.state.balance < definition.placementCost) {
      throw new CommandValidationError("Insufficient funds");
    }
    if (!Number.isSafeInteger(definition.placementCost) || definition.placementCost < 0) {
      throw new CommandValidationError("Placement cost must be a non-negative safe integer");
    }
    if (definition.levels.length === 0) throw new CommandValidationError("Tower has no levels");

    // Work on a private snapshot: no externally visible mutation can be partial.
    const draft = this.state.clone();
    const tower: Tower = { id: towerId, type: towerType, position: { ...position }, level: 0 };
    draft.balance -= definition.placementCost;
    draft.towers.set(towerId, tower);
    draft.occupiedCells.set(key, towerId);
    this.state.replaceWith(draft);
    return tower;
  }
}

export class EconomySystem {
  public constructor(
    private readonly state: GameState,
    private readonly definitions: ReadonlyMap<string, TowerDefinition>,
  ) {}

  public upgrade(towerId: string): Tower {
    const tower = this.requireTower(towerId);
    const definition = this.requireDefinition(tower.type);
    const level = definition.levels[tower.level];
    if (!level || level.upgradeCost === undefined || tower.level + 1 >= definition.levels.length) {
      throw new CommandValidationError(`Tower is already at maximum level: ${towerId}`);
    }
    if (!Number.isSafeInteger(level.upgradeCost) || level.upgradeCost < 0) {
      throw new CommandValidationError("Upgrade cost must be a non-negative safe integer");
    }
    if (this.state.balance < level.upgradeCost) throw new CommandValidationError("Insufficient funds");

    const draft = this.state.clone();
    const upgraded = draft.towers.get(towerId)!;
    draft.balance -= level.upgradeCost;
    upgraded.level += 1;
    this.state.replaceWith(draft);
    return upgraded;
  }

  public sell(towerId: string): number {
    const tower = this.requireTower(towerId);
    const definition = this.requireDefinition(tower.type);
    const level = definition.levels[tower.level];
    if (!level) throw new CommandValidationError(`Invalid tower level: ${tower.level}`);
    if (!Number.isSafeInteger(level.sellValue) || level.sellValue < 0) {
      throw new CommandValidationError("Sell value must be a non-negative safe integer");
    }
    if (this.state.occupiedCells.get(cellKey(tower.position)) !== towerId) {
      throw new CommandValidationError(`Tower cell is not occupied: ${towerId}`);
    }

    const draft = this.state.clone();
    draft.balance += level.sellValue;
    if (!Number.isSafeInteger(draft.balance)) throw new CommandValidationError("Balance overflow");
    draft.towers.delete(towerId);
    draft.occupiedCells.delete(cellKey(tower.position));
    this.state.replaceWith(draft);
    return level.sellValue;
  }

  private requireTower(id: string): Tower {
    const tower = this.state.towers.get(id);
    if (!tower) throw new CommandValidationError(`Tower does not exist: ${id}`);
    return tower;
  }

  private requireDefinition(type: string): TowerDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new CommandValidationError(`Unknown tower type: ${type}`);
    return definition;
  }
}
