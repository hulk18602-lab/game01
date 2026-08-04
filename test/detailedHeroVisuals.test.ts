import assert from "node:assert/strict";
import test from "node:test";
import { eldrinVisual, visualTierForHeroLevel } from "../src/content/visuals/heroVisuals.js";
import { HeroEntity } from "../src/entities/HeroEntity.js";
import HeroAnimationController from "../src/rendering/hero/HeroAnimationController.js";
import { HeroAssetLoader, type HeroImagePort } from "../src/rendering/hero/HeroAssetLoader.js";
import HeroEffectRenderer from "../src/rendering/hero/HeroEffectRenderer.js";

const definition = {
  id: "hero-eldrin", name: "Eldrin, Warden of the Greenwood", speed: 180,
  range: 210, damage: 28, fireRate: 1.25, projectileSpeed: 600, xpToNextLevel: 80,
};
const hero = () => new HeroEntity(definition, { position: { x: 100, y: 100 } });

test("Eldrin resolves stable eight-way facing from velocity and a combat target", () => {
  const archer = hero();
  archer.beginFrame();
  archer.position.x += 18;
  archer.position.y -= 18;
  archer.updateFacingFromVelocity();
  assert.equal(archer.facingDirection, "north-east");
  archer.beginFrame();
  archer.position.x += 0.1;
  archer.updateFacingFromVelocity();
  assert.equal(archer.facingDirection, "north-east");
  archer.updateFacingToward({ x: 30, y: 100 });
  assert.equal(archer.facingDirection, "west");
  assert.equal(archer.directionToward({ x: 100, y: 250 }), "south");
});

test("Eldrin transitions idle, walking and running without presentation state driving movement", () => {
  const archer = hero();
  assert.equal(archer.movementState, "idle");
  archer.setMovementState("walking");
  assert.equal(archer.moving, true);
  archer.setMovementState("running");
  assert.equal(archer.movementState, "running");
  archer.setMovementState("idle");
  assert.equal(archer.moving, false);
});

test("shoot visual crosses release frame while logical combat remains independent", () => {
  const archer = hero();
  const controller = new HeroAnimationController();
  archer.combatState = "shooting";
  controller.update(archer, null, "playing", 0);
  const release = controller.update(archer, null, "playing", 0.34);
  assert.equal(release.animation, "shoot");
  assert.equal(release.releasedThisFrame, true);
  assert.equal(release.frame, eldrinVisual.animations.shoot.south.frames[5]);
});

test("animation frames, visual tiers and bounded aura rendering are deterministic", () => {
  const archer = hero();
  const controller = new HeroAnimationController();
  archer.setMovementState("walking");
  const first = controller.update(archer, null, "playing", 0);
  const firstFrame = first.frame;
  const next = controller.update(archer, null, "playing", 0.12);
  assert.equal(first.animation, "walk");
  assert.notEqual(firstFrame, next.frame);
  assert.equal(visualTierForHeroLevel(1), "scout");
  assert.equal(visualTierForHeroLevel(4), "warden");
  assert.equal(visualTierForHeroLevel(7), "elite");
  assert.equal(visualTierForHeroLevel(10), "legendary");
  archer.skills.rallyAura = 1;
  const effects = new HeroEffectRenderer();
  let arcs = 0;
  const context = {
    save() {}, restore() {}, beginPath() {}, fill() {}, stroke() {}, setLineDash() {}, moveTo() {}, lineTo() {},
    arc() { arcs += 1; }, fillStyle: "", strokeStyle: "", lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
  const projectiles: never[] = [];
  for (let index = 0; index < 100; index += 1) {
    effects.render(context, archer, controller.state, { selected: false, visualTime: index / 60, reducedMotion: false, projectiles });
  }
  assert.equal(projectiles.length, 0);
  assert.equal(arcs, 100);
});

test("hero atlas loader caches one request and recovers from a missing atlas via placeholder", async () => {
  const created: HeroImagePort[] = [];
  const loader = new HeroAssetLoader(() => {
    const image: HeroImagePort = { src: "", complete: false, naturalWidth: 0, naturalHeight: 0, onload: null, onerror: null };
    created.push(image);
    return image;
  });
  const first = loader.load(eldrinVisual);
  const duplicate = loader.load(eldrinVisual);
  assert.equal(first, duplicate);
  assert.equal(created.length, 1);
  created[0]!.onerror?.(new Event("error"));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  assert.equal(created.length, 2);
  created[1]!.onload?.(new Event("load"));
  const asset = await first;
  assert.equal(asset.usingPlaceholder, true);
  assert.equal(loader.peek(eldrinVisual), asset);
  assert.equal(created.length, 2);
});
