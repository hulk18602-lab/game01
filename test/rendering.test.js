import test from "node:test";
import assert from "node:assert/strict";
import { Camera, Renderer } from "../src/rendering/index.js";

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
