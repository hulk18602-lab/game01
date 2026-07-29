import assert from "node:assert/strict";
import test from "node:test";
import { PlaceTowerCommand, SellTowerCommand, UpgradeTowerCommand, type GameState } from "../src/game/index.js";

function state(balance = 100): GameState {
  return {
    width: 3, height: 3,
    players: new Map([["p1", { id: "p1", balance }], ["p2", { id: "p2", balance: 100 }]]),
    towers: new Map(), occupiedCells: new Map(),
    towerDefinitions: new Map([["basic", { type: "basic", levels: [
      { cost: 50, sellValue: 25 }, { cost: 30, sellValue: 55 },
    ] }]]),
  };
}

test("placement commits payment, tower and cell together", () => {
  const game = state();
  const tower = new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 2 }).execute(game);
  assert.equal(game.players.get("p1")!.balance, 50);
  assert.equal(game.towers.get("t1"), tower);
  assert.equal(game.occupiedCells.get("1,2"), "t1");
});

test("failed placement leaves all state unchanged", () => {
  const game = state(10);
  assert.throws(() => new PlaceTowerCommand("p1", "t1", "basic", { x: 1, y: 2 }).execute(game));
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
