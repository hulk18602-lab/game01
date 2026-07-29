import test from "node:test";
import assert from "node:assert/strict";
import { Camera, EntityLayer, Renderer } from "../src/rendering/index.js";

test("camera converts both directions", () => {
  const camera = new Camera({ x: 10, y: 20, zoom: 2, viewportWidth: 100, viewportHeight: 80 });
  assert.deepEqual(camera.worldToScreen({ x: 15, y: 24 }), { x: 10, y: 8 });
  assert.deepEqual(camera.screenToWorld({ x: 10, y: 8 }), { x: 15, y: 24 });
  assert.deepEqual(camera.visibleBounds(), { x: 10, y: 20, width: 50, height: 40 });
});

test("renderer only passes state to layers", () => {
  const calls = [];
  const context = {
    canvas: { width: 100, height: 80 },
    save() {}, restore() {}, setTransform() {}, fillRect() {}, scale() {}, translate() {},
  };
  const camera = new Camera({ viewportWidth: 100, viewportHeight: 80 });
  const state = Object.freeze({ entities: Object.freeze([]) });
  const renderer = new Renderer({ context, camera, layers: [{ render(_context, value) { calls.push(value); } }] });
  renderer.render(state);
  assert.deepEqual(calls, [state]);
});

test("entity layer renders a tower from its world position", () => {
  const arcs = [];
  const context = {
    beginPath() {},
    arc(...args) { arcs.push(args); },
    fill() {},
    fillText() {},
  };
  new EntityLayer().render(context, {
    entities: [{ id: "tower-1", position: { x: 72, y: 120 }, radius: 18 }],
  });
  assert.deepEqual(arcs, [[72, 120, 18, 0, Math.PI * 2]]);
});

test("entity layer renders a health bar from current and max health", () => {
  const rectangles = [];
  const context = {
    beginPath() {},
    arc() {},
    fill() {},
    fillRect(...args) { rectangles.push({ color: this.fillStyle, args }); },
    fillText() {},
  };
  new EntityLayer().render(context, {
    entities: [{
      id: "enemy-1",
      kind: "enemy",
      position: { x: 100, y: 80 },
      radius: 12,
      health: 50,
      maxHealth: 100,
    }],
  });
  assert.deepEqual(rectangles.at(-1), {
    color: "#eab308",
    args: [85.6, 56, 14.399999999999999, 5],
  });
});
