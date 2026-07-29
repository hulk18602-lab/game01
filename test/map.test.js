import test from "node:test";
import assert from "node:assert/strict";
import map01 from "../src/content/maps/map01.js";
import { Grid, Path, CoordinateConverter } from "../src/game/map/index.js";

test("map01 is a valid grid", () => {
  const grid = new Grid(map01);
  assert.equal(grid.tileAt(0, 0).id, "rock");
  assert.equal(grid.isWalkable(map01.spawnPoints.player), true);
  assert.equal(grid.isBuildable({ x: 1, y: 1 }), true);
  assert.equal(grid.isBuildable({ x: 5, y: 1 }), false);
});

test("map01 declares a visible, walkable and non-buildable enemy route", () => {
  const grid = new Grid(map01);
  assert.deepEqual(map01.enemyRoute[0], map01.spawnPoints.enemies[0]);
  assert.deepEqual(map01.enemyRoute.at(-1), map01.spawnPoints.player);
  assert.ok(map01.enemyRoute.every((point) => grid.tileAt(point).id === "road"));
  assert.ok(map01.enemyRoute.every((point) => grid.isWalkable(point)));
  assert.ok(map01.enemyRoute.every((point) => !grid.isBuildable(point)));
  assert.ok(map01.enemyRoute.slice(1).every((point, index) => {
    const previous = map01.enemyRoute[index];
    return Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) === 1;
  }));
});

test("Path finds a walkable route without mutating the grid", () => {
  const grid = new Grid(map01);
  const path = Path.find(grid, { x: 2, y: 2 }, { x: 16, y: 3 });
  assert.deepEqual(path.start, { x: 2, y: 2 });
  assert.deepEqual(path.end, { x: 16, y: 3 });
  assert.ok([...path].every((point) => grid.isWalkable(point)));
});

test("coordinate conversion round trips", () => {
  const converter = new CoordinateConverter(48, { x: 10, y: 20 });
  assert.deepEqual(converter.gridToWorld({ x: 2, y: 3 }), { x: 106, y: 164 });
  assert.deepEqual(converter.worldToGrid({ x: 120, y: 180 }), { x: 2, y: 3 });
});
