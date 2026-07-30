import { Path } from "../map/index.js";
import type { Position } from "../types.js";
import { cellKey } from "../types.js";
import type { HeroEntity } from "../../entities/HeroEntity.js";

interface GridPort {
  contains(position: Position): boolean;
  isWalkable(position: Position): boolean;
  movementCost(position: Position): number;
}

interface ConverterPort {
  worldToGrid(position: Position): Position;
  gridToWorld(position: Position, options?: { readonly center?: boolean }): Position;
}

interface NavigationGrid {
  isWalkable(position: Position): boolean;
  movementCost(position: Position): number;
  neighbors(position: Position): readonly Position[];
}

export interface HeroMovementInput {
  readonly x: number;
  readonly y: number;
}

/** Routes hero movement through the existing grid A* while honoring live tower occupancy. */
export class HeroMovementSystem {
  readonly #grid: GridPort;
  readonly #converter: ConverterPort;
  #waypoints: Position[] = [];
  #waypointIndex = 0;
  #mode: "idle" | "pointer" | "keyboard" = "idle";
  #keyboardDirection = "";

  constructor(grid: GridPort, converter: ConverterPort) {
    this.#grid = grid;
    this.#converter = converter;
  }

  setDestination(
    hero: HeroEntity,
    destination: Position,
    occupiedCells: ReadonlyMap<string, string>,
  ): string | null {
    const error = this.#plan(hero, destination, occupiedCells);
    if (error) return error;
    this.#mode = "pointer";
    this.#keyboardDirection = "";
    return null;
  }

  update(
    deltaSeconds: number,
    hero: HeroEntity,
    occupiedCells: ReadonlyMap<string, string>,
    input: HeroMovementInput,
  ): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("Hero movement delta must be non-negative");
    }
    const horizontal = Math.sign(input.x);
    const vertical = Math.sign(input.y);
    const direction = `${horizontal},${vertical}`;
    if (horizontal !== 0 || vertical !== 0) {
      if (this.#mode !== "keyboard"
        || this.#keyboardDirection !== direction
        || this.#waypointIndex >= this.#waypoints.length) {
        const current = this.#converter.worldToGrid(hero.position);
        const destinationCell = { x: current.x + horizontal, y: current.y + vertical };
        const destination = this.#converter.gridToWorld(destinationCell, { center: true });
        if (!this.#plan(hero, destination, occupiedCells)) {
          this.#mode = "keyboard";
          this.#keyboardDirection = direction;
        } else {
          this.#clear(hero);
        }
      }
    } else if (this.#mode === "keyboard") {
      this.#clear(hero);
    }

    hero.moving = false;
    let remainingDistance = hero.speed * deltaSeconds;
    while (remainingDistance > 0 && this.#waypointIndex < this.#waypoints.length) {
      const waypoint = this.#waypoints[this.#waypointIndex]!;
      const waypointCell = this.#converter.worldToGrid(waypoint);
      const currentCell = this.#converter.worldToGrid(hero.position);
      if (cellKey(waypointCell) !== cellKey(currentCell)
        && occupiedCells.has(cellKey(waypointCell))) {
        if (this.#mode === "pointer" && hero.moveTarget) {
          const target = { ...hero.moveTarget };
          if (!this.#plan(hero, target, occupiedCells)) this.#mode = "pointer";
          else this.#clear(hero);
        } else {
          this.#clear(hero);
        }
        break;
      }
      const dx = waypoint.x - hero.position.x;
      const dy = waypoint.y - hero.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0.001) {
        hero.position = { ...waypoint };
        this.#waypointIndex += 1;
        continue;
      }
      hero.heading = Math.atan2(dy, dx);
      hero.moving = true;
      if (distance <= remainingDistance) {
        hero.position = { ...waypoint };
        remainingDistance -= distance;
        this.#waypointIndex += 1;
      } else {
        hero.position = {
          x: hero.position.x + (dx / distance) * remainingDistance,
          y: hero.position.y + (dy / distance) * remainingDistance,
        };
        remainingDistance = 0;
      }
    }
    if (this.#waypointIndex >= this.#waypoints.length && this.#mode === "pointer") {
      this.#clear(hero);
    }
  }

  restoreDestination(
    hero: HeroEntity,
    destination: Position | null,
    occupiedCells: ReadonlyMap<string, string>,
  ): void {
    if (!destination || this.setDestination(hero, destination, occupiedCells)) {
      this.#clear(hero);
    }
  }

  #plan(
    hero: HeroEntity,
    destination: Position,
    occupiedCells: ReadonlyMap<string, string>,
  ): string | null {
    if (!Number.isFinite(destination.x) || !Number.isFinite(destination.y)) {
      return "Choose a valid destination for the hero.";
    }
    const start = this.#converter.worldToGrid(hero.position);
    const goal = this.#converter.worldToGrid(destination);
    if (!this.#grid.contains(goal)) return "The hero cannot leave the battlefield.";
    if (!this.#grid.isWalkable(goal)) return "The hero cannot move through water or rocks.";
    if (occupiedCells.has(cellKey(goal)) && cellKey(goal) !== cellKey(start)) {
      return "A tower blocks that destination.";
    }
    const navigation = this.#navigationGrid(start, occupiedCells);
    const path = Path.find(navigation, start, goal);
    if (!path) return "The hero cannot reach that destination.";
    this.#waypoints = [];
    for (let index = 1; index < path.points.length; index += 1) {
      this.#waypoints.push(this.#converter.gridToWorld(path.points[index]!, { center: true }));
    }
    const goalCenter = this.#converter.gridToWorld(goal, { center: true });
    if (Math.hypot(destination.x - goalCenter.x, destination.y - goalCenter.y) > 0.5) {
      this.#waypoints.push({ ...destination });
    } else if (this.#waypoints.length === 0) {
      this.#waypoints.push(goalCenter);
    }
    this.#waypointIndex = 0;
    hero.moveTarget = { ...destination };
    return null;
  }

  #navigationGrid(
    start: Position,
    occupiedCells: ReadonlyMap<string, string>,
  ): NavigationGrid {
    const startKey = cellKey(start);
    const walkable = (position: Position): boolean =>
      this.#grid.isWalkable(position)
      && (cellKey(position) === startKey || !occupiedCells.has(cellKey(position)));
    return {
      isWalkable: walkable,
      movementCost: (position) =>
        walkable(position) ? this.#grid.movementCost(position) : Number.POSITIVE_INFINITY,
      neighbors: (position) => {
        const neighbors: Position[] = [];
        const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
        for (const [dx, dy] of offsets) {
          const neighbor = { x: position.x + dx, y: position.y + dy };
          if (walkable(neighbor)) neighbors.push(neighbor);
        }
        return neighbors;
      },
    };
  }

  #clear(hero: HeroEntity): void {
    this.#waypoints = [];
    this.#waypointIndex = 0;
    this.#mode = "idle";
    this.#keyboardDirection = "";
    hero.moveTarget = null;
    hero.moving = false;
  }
}

export default HeroMovementSystem;
