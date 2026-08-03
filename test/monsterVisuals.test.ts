import assert from "node:assert/strict";
import test from "node:test";
import { monsterVisuals } from "../src/content/visuals/monsterVisuals.js";
import { MonsterAssetLoader } from "../src/rendering/monsters/MonsterAssetLoader.js";
import { MonsterSpriteRenderer } from "../src/rendering/monsters/MonsterSpriteRenderer.js";
import { directionFromDelta, frameAtTime, selectAnimationState } from "../src/rendering/monsters/monsterAnimation.js";

test("animation state gives one-shot reactions priority and returns to walk", () => {
  assert.equal(selectAnimationState({ now: 1, hitUntil: 1.2, moving: true }), "hit");
  assert.equal(selectAnimationState({ now: 1.3, hitUntil: 1.2, moving: true }), "walk");
  assert.equal(selectAnimationState({ now: 1, attackUntil: 1.2, moving: true }), "attack");
  assert.equal(selectAnimationState({ now: 1, dead: true, hitUntil: 2, moving: true }), "death");
  assert.equal(selectAnimationState({ now: 1, moving: false }), "idle");
});

test("direction uses the dominant movement axis and keeps a stable idle facing", () => {
  assert.equal(directionFromDelta(8, 2), "right");
  assert.equal(directionFromDelta(-8, 2), "left");
  assert.equal(directionFromDelta(2, -8), "up");
  assert.equal(directionFromDelta(2, 8), "down");
  assert.equal(directionFromDelta(0, 0, "left"), "left");
});

test("frame selection advances by fps", () => {
  const clip = { frames: [4, 5, 6, 7] as const, fps: 8, loop: true };
  assert.equal(frameAtTime(clip, 0), 4);
  assert.equal(frameAtTime(clip, 0.13), 5);
  assert.equal(frameAtTime(clip, 0.51), 4);
});

test("death animation clamps to its final frame and never loops", () => {
  const clip = monsterVisuals.grunt.animations.death.right;
  assert.equal(clip.loop, false);
  assert.equal(frameAtTime(clip, 99), 19);
});

test("asset loader caches an atlas and resolves failures to its placeholder", async () => {
  const created: Array<{
    src: string;
    decoding: string;
    onload: null | (() => void);
    onerror: null | (() => void);
  }> = [];
  const placeholder = {} as CanvasImageSource;
  const loader = new MonsterAssetLoader({
    placeholder,
    imageFactory: () => {
      const image = { src: "", decoding: "", onload: null, onerror: null };
      created.push(image);
      return image as unknown as HTMLImageElement;
    },
  });
  const first = loader.load("/atlas.png");
  const second = loader.load("/atlas.png");
  assert.equal(first, second);
  assert.equal(created.length, 1);
  created[0]!.onload!();
  assert.equal((await first).loaded, true);

  const missing = loader.load("/missing.png");
  created[1]!.onerror!();
  assert.equal((await missing).image, placeholder);
  assert.equal(loader.progress, 1);
});

test("sprite renderer reuses loaded atlases for one hundred visible enemies", () => {
  let drawCalls = 0;
  const loader = {
    loadedCount: 6,
    totalCount: 6,
    progress: 1,
    placeholder: {},
    get: () => ({ image: {}, loaded: true }),
    preload: async () => undefined,
  } as unknown as MonsterAssetLoader;
  const context = {
    canvas: {}, save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() {},
    translate() {}, scale() {}, fillRect() {}, arc() {}, drawImage() { drawCalls += 1; },
    filter: "none", fillStyle: "", strokeStyle: "", lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
  const enemies = Array.from({ length: 100 }, (_, index) => ({
    id: `enemy-${index}`,
    type: ["grunt", "runner", "tank", "armored", "regenerator", "boss"][index % 6]!,
    position: { x: index * 2, y: 100 },
    health: 100,
    maxHealth: 100,
    progress: 0.2,
  }));
  new MonsterSpriteRenderer(loader).render(context, enemies, 1, false);
  assert.equal(drawCalls, 100);
});
