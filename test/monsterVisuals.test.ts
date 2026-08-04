import assert from "node:assert/strict";
import test from "node:test";
import { getMonsterVisual, monsterVisuals, type MonsterAtlasMetadata } from "../src/content/visuals/monsterVisuals.js";
import { MonsterAssetLoader } from "../src/rendering/monsters/MonsterAssetLoader.js";
import { monsterSourceRectangle, MonsterSpriteRenderer } from "../src/rendering/monsters/MonsterSpriteRenderer.js";
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
  const clip = { frames: [16, 17, 18, 19], ...monsterVisuals.grunt.animationTiming.death };
  assert.equal(clip.loop, false);
  assert.equal(frameAtTime(clip, 99), 19);
});

test("metadata produces bounded integer rectangles for first, middle and last frames", () => {
  const metadata: MonsterAtlasMetadata = {
    schemaVersion: 2, id: "test",
    atlas: {
      file: "atlas.png", width: 1140, height: 1425, columns: 4, rows: 5,
      frameWidth: 285, frameHeight: 285, contentWidth: 281, contentHeight: 281, padding: 2,
    },
    animations: {
      idle: [0, 1, 2, 3], walk: [4, 5, 6, 7], attack: [8, 9, 10, 11],
      hit: [12, 13, 14, 15], death: [16, 17, 18, 19],
    },
    anchor: { x: 0.5, y: 0.9 },
  };
  assert.deepEqual(monsterSourceRectangle(metadata, 0), { x: 2, y: 2, width: 281, height: 281 });
  assert.deepEqual(monsterSourceRectangle(metadata, 10), { x: 572, y: 572, width: 281, height: 281 });
  assert.deepEqual(monsterSourceRectangle(metadata, 19), { x: 857, y: 1142, width: 281, height: 281 });
  assert.throws(() => monsterSourceRectangle(metadata, 20), /outside atlas/);
});

test("monster aliases reuse their validated base atlas definitions", () => {
  assert.equal(getMonsterVisual("swarm"), monsterVisuals.runner);
  assert.equal(getMonsterVisual("splitter"), monsterVisuals.grunt);
  assert.equal(getMonsterVisual("shielded"), monsterVisuals.armored);
  assert.equal(getMonsterVisual("eliteRunner"), monsterVisuals.runner);
  assert.equal(getMonsterVisual("arcaneSentinel"), monsterVisuals.armored);
  assert.equal(getMonsterVisual("stormLancer"), monsterVisuals.runner);
  assert.equal(getMonsterVisual("archonBoss"), monsterVisuals.boss);
});

test("asset loader caches an atlas and resolves failures to its placeholder", async () => {
  const created: Array<{
    src: string;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    decoding: string;
    onload: null | (() => void);
    onerror: null | (() => void);
  }> = [];
  const placeholder = {} as CanvasImageSource;
  const metadata: MonsterAtlasMetadata = {
    schemaVersion: 2, id: "grunt",
    atlas: {
      file: "atlas-placeholder.png", width: 1140, height: 1425, columns: 4, rows: 5,
      frameWidth: 285, frameHeight: 285, contentWidth: 281, contentHeight: 281, padding: 2,
    },
    animations: {
      idle: [0, 1, 2, 3], walk: [4, 5, 6, 7], attack: [8, 9, 10, 11],
      hit: [12, 13, 14, 15], death: [16, 17, 18, 19],
    },
    anchor: { x: 0.5, y: 0.9 },
  };
  const loader = new MonsterAssetLoader({
    placeholder,
    metadataLoader: async () => metadata,
    imageFactory: () => {
      const image = {
        src: "", decoding: "", width: 1140, height: 1425,
        naturalWidth: 1140, naturalHeight: 1425, onload: null, onerror: null,
      };
      created.push(image);
      return image as unknown as HTMLImageElement;
    },
  });
  const first = loader.load(monsterVisuals.grunt);
  const second = loader.load(monsterVisuals.grunt);
  assert.equal(first, second);
  assert.equal(created.length, 1);
  created[0]!.onload!();
  assert.equal((await first).loaded, true);

  const missingDefinition = {
    ...monsterVisuals.grunt,
    id: "missing",
    atlasUrl: "/missing.png",
    metadataUrl: "/missing.json",
  };
  const missing = loader.load(missingDefinition);
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
    allValid: true,
    get: (url: string) => ({
      image: {}, loaded: true, valid: true, fallbackUsed: false, url,
      metadata: {
        schemaVersion: 2, id: "test",
        atlas: {
          file: "atlas.png", width: 1140, height: 1425, columns: 4, rows: 5,
          frameWidth: 285, frameHeight: 285, contentWidth: 281, contentHeight: 281, padding: 2,
        },
        animations: {
          idle: [0, 1, 2, 3], walk: [4, 5, 6, 7], attack: [8, 9, 10, 11],
          hit: [12, 13, 14, 15], death: [16, 17, 18, 19],
        },
        anchor: { x: 0.5, y: 0.9 },
      },
    }),
    preload: async () => undefined,
  } as unknown as MonsterAssetLoader;
  const context = {
    canvas: {}, save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() {},
    translate() {}, scale() {}, fillRect() {}, arc() {}, drawImage() { drawCalls += 1; },
    filter: "none", fillStyle: "", strokeStyle: "", lineWidth: 1,
    imageSmoothingEnabled: true, imageSmoothingQuality: "high",
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
