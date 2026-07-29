export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface TowerLevel {
  readonly cost: number;
  readonly sellValue: number;
}

export interface TowerDefinition {
  readonly type: string;
  readonly levels: readonly TowerLevel[];
}

export interface Tower {
  readonly id: string;
  readonly ownerId: string;
  readonly type: string;
  level: number;
  readonly position: Position;
}

export interface Player {
  readonly id: string;
  balance: number;
}

export interface GameState {
  readonly width: number;
  readonly height: number;
  readonly players: Map<string, Player>;
  readonly towers: Map<string, Tower>;
  /** A position key mapped to its occupying tower id. */
  readonly occupiedCells: Map<string, string>;
  readonly towerDefinitions: Map<string, TowerDefinition>;
}

export function cellKey(position: Position): string {
  return `${position.x},${position.y}`;
}
