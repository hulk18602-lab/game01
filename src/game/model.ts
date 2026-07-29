export interface CellPosition {
  readonly x: number;
  readonly y: number;
}

export interface TowerLevel {
  readonly upgradeCost?: number;
  readonly sellValue: number;
}

export interface TowerDefinition {
  readonly type: string;
  readonly placementCost: number;
  readonly levels: readonly TowerLevel[];
}

export interface Tower {
  readonly id: string;
  readonly type: string;
  readonly position: CellPosition;
  level: number;
}

export const cellKey = ({ x, y }: CellPosition): string => `${x}:${y}`;

/** Mutable aggregate root. Systems only publish fully prepared snapshots to it. */
export class GameState {
  public balance: number;
  public towers: Map<string, Tower>;
  public occupiedCells: Map<string, string>;

  public constructor(balance: number) {
    if (!Number.isSafeInteger(balance) || balance < 0) {
      throw new Error("Initial balance must be a non-negative safe integer");
    }
    this.balance = balance;
    this.towers = new Map();
    this.occupiedCells = new Map();
  }

  public clone(): GameState {
    const result = new GameState(this.balance);
    result.towers = new Map(
      [...this.towers].map(([id, tower]) => [id, { ...tower, position: { ...tower.position } }]),
    );
    result.occupiedCells = new Map(this.occupiedCells);
    return result;
  }

  public replaceWith(snapshot: GameState): void {
    this.balance = snapshot.balance;
    this.towers = snapshot.towers;
    this.occupiedCells = snapshot.occupiedCells;
  }
}

export class CommandValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommandValidationError";
  }
}
