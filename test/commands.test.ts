import assert from "node:assert/strict";
import test from "node:test";
import {
  createRenderEntities,
  createRuntimeTower,
  PlaceTowerCommand,
  SellTowerCommand,
  UpgradeTowerCommand,
  type CellDefinition,
  type GameState,
} from "../src/game/index.js";

function state(balance = 100): GameState {
  const cells = new Map<string, CellDefinition>();
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      cells.set(`${x},${y}`, { terrain: "grass", walkable: true, buildable: true });
    }
  }
  return {
    width: 3, height: 3,
    players: new Map([["p1", { id: "p1", balance }], ["p2", { id: "p2", balance: 100 }]]),
    towers: new Map(), occupiedCells: new Map(),
    towerDefinitions: new Map([["basic", { type: "basic", levels: [
      { cost: 50, sellValue: 25 }, { cost: 30, sellValue: 55 },
    ] }]]),
    cells,
  };
}

test("placement commits payment, tower and cell together", () => {
  const game = state();
  const tower = new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 2 }).execute(game);
  assert.equal(game.players.get("p1")!.balance, 50);
  assert.equal(game.towers.get("t1"), tower);
  assert.equal(game.occupiedCells.get("1,2"), "t1");
});

test("a placed tower is included in render state with one world position", () => {
  const game = state();
  const tower = new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 2 }).execute(game);
  const runtimeTower = createRuntimeTower(tower, {
    name: "Basic tower",
    range: 160,
    damage: 20,
    fireRate: 1,
    projectileSpeed: 360,
    targeting: "first",
  }, { x: 72, y: 120 });
  const renderState = { entities: createRenderEntities([runtimeTower], [], []) };

  assert.equal(renderState.entities[0], runtimeTower);
  assert.deepEqual(runtimeTower.position, { x: 72, y: 120 });
  assert.equal("x" in runtimeTower, false);
  assert.equal("y" in runtimeTower, false);
});

test("placement is rejected on the enemy route without charging money", () => {
  const game = state();
  (game.cells as Map<string, CellDefinition>).set(
    "1,1",
    { terrain: "road", walkable: true, buildable: false },
  );

  assert.throws(
    () => new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 1 }).execute(game),
    /enemy route/,
  );
  assert.equal(game.players.get("p1")!.balance, 100);
  assert.equal(game.towers.size, 0);
  assert.equal(game.occupiedCells.size, 0);
});

test("placement is rejected on an occupied cell without a second charge", () => {
  const game = state();
  new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 1 }).execute(game);

  assert.throws(
    () => new PlaceTowerCommand("p1", "t2", "basic", { x: 1, y: 1 }).execute(game),
    /occupied/,
  );
  assert.equal(game.players.get("p1")!.balance, 50);
  assert.deepEqual([...game.towers.keys()], ["t1"]);
  assert.deepEqual([...game.occupiedCells], [["1,1", "t1"]]);
});

test("failed placement leaves all state unchanged", () => {
  const game = state(10);
  assert.throws(
    () => new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 2 }).execute(game),
    /Not enough money/,
  );
  assert.equal(game.players.get("p1")!.balance, 10);
  assert.equal(game.towers.size, 0);
  assert.equal(game.occupiedCells.size, 0);
});

test("upgrade validates ownership and funds before mutation", () => {
  const game = state();
  new PlaceTowerCommand("p1", "t1", "basic", { x: 0, y: 0 }).execute(game);
  assert.throws(() => new UpgradeTowerCommand("p2", "t1").execute(game));
  assert.equal(game.towers.get("t1")!.level, 0);
  new UpgradeTowerCommand("p1", "t1").execute(game);
  assert.equal(game.towers.get("t1")!.level, 1);
  assert.equal(game.players.get("p1")!.balance, 20);
});

test("selling removes tower and occupancy and credits refund", () => {
  const game = state();
  new PlaceTowerCommand("p1", "t1", "basic", { x: 2, y: 2 }).execute(game);
  assert.equal(new SellTowerCommand("p1", "t1").execute(game), 25);
  assert.equal(game.players.get("p1")!.balance, 75);
  assert.equal(game.towers.size, 0);
  assert.equal(game.occupiedCells.size, 0);
});
