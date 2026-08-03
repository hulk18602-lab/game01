import assert from "node:assert/strict";
import test from "node:test";
import { towerVisualCatalog, towerVisualSignature } from "../src/content/visuals/towerVisuals.js";
import { TowerRenderer, shortestAngleDelta, trackedTowerAngle } from "../src/rendering/towers/TowerRenderer.js";

function mockContext(): CanvasRenderingContext2D & { operations: number } {
  const context = {
    operations: 0,
    canvas: {},
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: "",
    filter: "none",
    lineCap: "butt",
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setLineDash() {},
    beginPath() { this.operations += 1; },
    closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {},
  };
  return context as unknown as CanvasRenderingContext2D & { operations: number };
}

test("tower visual catalog covers every existing tower with medieval fantasy identity", () => {
  assert.deepEqual(Object.keys(towerVisualCatalog), [
    "basic", "rapid", "frost", "cannon", "sniper", "tesla", "poison",
  ]);
  for (const visual of Object.values(towerVisualCatalog)) {
    assert.ok(visual.name.length > 5);
    assert.ok(visual.description.length > 40);
    assert.ok(visual.material.length > 10);
  }
});

test("all three upgrade levels have stable, visibly distinct signatures", () => {
  for (const type of Object.keys(towerVisualCatalog)) {
    const signatures = new Set([0, 1, 2].map((level) => towerVisualSignature(type, level)));
    assert.equal(signatures.size, 3);
  }
});

test("tower tracking rotates through the shortest arc toward its target", () => {
  assert.ok(Math.abs(shortestAngleDelta(Math.PI * .9, -Math.PI * .9)) < Math.PI / 2);
  const angle = trackedTowerAngle(-Math.PI / 2, { x: 0, y: 0 }, { x: 10, y: 0 }, .05);
  assert.ok(angle > -Math.PI / 2);
  assert.ok(angle < 0);
});

test("renderer survives build, upgrade, preview and sell presentation states", () => {
  const renderer = new TowerRenderer();
  const context = mockContext();
  const tower = {
    id: "tower-1", type: "cannon", level: 0, position: { x: 72, y: 72 },
    targetId: "enemy-1", cooldown: 0, auraBuffed: false,
  };
  const enemies = [{ id: "enemy-1", position: { x: 160, y: 72 } }];
  renderer.render(context, [tower], enemies, { time: 0 });
  renderer.render(context, [{ ...tower, level: 1, cooldown: 1 }], enemies, { time: .1, selectedTowerId: tower.id });
  renderer.drawPreview(context, { type: "frost", position: { x: 120, y: 120 }, valid: true }, .15);
  renderer.drawPreview(context, { type: "poison", position: { x: 120, y: 120 }, valid: false }, .16);
  renderer.render(context, [], enemies, { time: .2 });
  renderer.render(context, [], enemies, { time: .6 });
  assert.ok(context.operations > 30);
});

test("procedural renderer handles one hundred towers without per-tower asset loading", () => {
  const renderer = new TowerRenderer();
  const context = mockContext();
  const types = Object.keys(towerVisualCatalog);
  const towers = Array.from({ length: 100 }, (_, index) => ({
    id: `tower-${index}`,
    type: types[index % types.length]!,
    level: index % 3,
    position: { x: (index % 20) * 48, y: Math.floor(index / 20) * 48 },
    cooldown: 0,
  }));
  const started = performance.now();
  renderer.render(context, towers, [], { time: 1, reducedMotion: true });
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 100, `100 tower render dispatch took ${elapsed.toFixed(2)}ms`);
  assert.ok(context.operations > 1000);
});
