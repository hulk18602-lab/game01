import assert from "node:assert/strict";
import test from "node:test";
import { EconomySystem, GameState, PlaceCommand, PlacementSystem, SellCommand, UpgradeCommand } from "../dist/src/game/index.js";

const cannon = {
  type: "cannon",
  placementCost: 40,
  levels: [{ upgradeCost: 25, sellValue: 20 }, { sellValue: 35 }],
};

const setup = (balance = 100) => {
  const state = new GameState(balance);
  const definitions = new Map([[cannon.type, cannon]]);
  return { state, placement: new PlacementSystem(state, definitions), economy: new EconomySystem(state, definitions) };
};

test("placement atomically charges, creates a tower, and occupies its cell", () => {
  const { state, placement } = setup();
  new PlaceCommand(placement, "one", "cannon", { x: 2, y: 3 }).execute();
  assert.equal(state.balance, 60);
  assert.equal(state.towers.get("one")?.type, "cannon");
  assert.equal(state.occupiedCells.get("2:3"), "one");
});

test("invalid placement leaves all state unchanged", () => {
  const { state, placement } = setup(30);
  const before = state.clone();
  assert.throws(() => new PlaceCommand(placement, "one", "cannon", { x: 2, y: 3 }).execute(), /Insufficient/);
  assert.deepEqual(state, before);
});

test("occupied cell validation happens before charging or creating", () => {
  const { state, placement } = setup();
  new PlaceCommand(placement, "one", "cannon", { x: 2, y: 3 }).execute();
  const before = state.clone();
  assert.throws(() => new PlaceCommand(placement, "two", "cannon", { x: 2, y: 3 }).execute(), /occupied/);
  assert.deepEqual(state, before);
});

test("upgrade validates funds before changing level", () => {
  const { state, placement, economy } = setup(50);
  new PlaceCommand(placement, "one", "cannon", { x: 0, y: 0 }).execute();
  assert.throws(() => new UpgradeCommand(economy, "one").execute(), /Insufficient/);
  assert.equal(state.balance, 10);
  assert.equal(state.towers.get("one")?.level, 0);
});

test("upgrade and sale update the complete aggregate", () => {
  const { state, placement, economy } = setup();
  new PlaceCommand(placement, "one", "cannon", { x: 0, y: 0 }).execute();
  new UpgradeCommand(economy, "one").execute();
  assert.equal(state.balance, 35);
  assert.equal(state.towers.get("one")?.level, 1);
  assert.equal(new SellCommand(economy, "one").execute(), 35);
  assert.equal(state.balance, 70);
  assert.equal(state.towers.has("one"), false);
  assert.equal(state.occupiedCells.has("0:0"), false);
});
