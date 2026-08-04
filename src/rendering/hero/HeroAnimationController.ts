import {
  eldrinVisual,
  type HeroAnimationName,
  type HeroDirection,
  type HeroVisualDefinition,
  visualTierForHeroLevel,
} from "../../content/visuals/heroVisuals.js";
import type { HeroEntity } from "../../entities/HeroEntity.js";
import type { Position } from "../../game/types.js";
import type { HeroVisualState } from "./HeroVisualState.js";

export type HeroPresentationPhase = "playing" | "victory" | "defeat";

/** Selects visual frames only. It never starts projectiles or mutates combat data. */
export class HeroAnimationController {
  readonly #definition: HeroVisualDefinition;
  readonly #state: {
    animation: HeroAnimationName;
    direction: HeroDirection;
    frame: number;
    frameIndex: number;
    visualTier: HeroVisualState["visualTier"];
    releasedThisFrame: boolean;
  };
  #startedAt = 0;
  #previousFrameIndex = 0;
  #lastHeroLevel = 1;
  #lastSkillFeedback = 0;

  constructor(definition: HeroVisualDefinition = eldrinVisual) {
    this.#definition = definition;
    this.#state = {
      animation: "idle",
      direction: "south",
      frame: 0,
      frameIndex: 0,
      visualTier: "scout",
      releasedThisFrame: false,
    };
  }

  update(
    hero: HeroEntity,
    target: Position | null,
    phase: HeroPresentationPhase,
    timeSeconds: number,
  ): HeroVisualState {
    const direction = target && (hero.combatState === "aiming" || hero.combatState === "shooting")
      ? hero.directionToward(target)
      : hero.facingDirection;
    const animation = this.#animationFor(hero, phase);
    if (animation !== this.#state.animation || direction !== this.#state.direction) {
      this.#state.animation = animation;
      this.#state.direction = direction;
      this.#startedAt = timeSeconds;
      this.#previousFrameIndex = 0;
    }
    const clip = this.#definition.animations[animation][direction];
    const elapsed = Math.max(0, timeSeconds - this.#startedAt);
    const rawIndex = Math.floor(elapsed * clip.fps);
    const frameIndex = clip.loop
      ? rawIndex % clip.frames.length
      : Math.min(clip.frames.length - 1, rawIndex);
    this.#state.releasedThisFrame = animation === "shoot"
      && clip.releaseFrame !== undefined
      && this.#previousFrameIndex < clip.releaseFrame
      && frameIndex >= clip.releaseFrame;
    this.#state.frameIndex = frameIndex;
    this.#state.frame = clip.frames[frameIndex] ?? clip.frames[0] ?? 0;
    this.#state.visualTier = visualTierForHeroLevel(hero.level);
    this.#previousFrameIndex = frameIndex;
    this.#lastHeroLevel = hero.level;
    this.#lastSkillFeedback = hero.skillFeedback;
    return this.#state;
  }

  get state(): HeroVisualState {
    return this.#state;
  }

  #animationFor(hero: HeroEntity, phase: HeroPresentationPhase): HeroAnimationName {
    if (phase === "victory") return "victory";
    if (phase === "defeat") return "defeat";
    if (hero.level > this.#lastHeroLevel) return "level-up";
    if (hero.skillFeedback > this.#lastSkillFeedback && hero.skillFeedback > 0) return "cast";
    if (hero.combatState === "shooting") return "shoot";
    if (hero.combatState === "aiming") return "aim";
    if (hero.movementState === "running") return "run";
    if (hero.movementState === "walking") return "walk";
    return "idle";
  }
}

export default HeroAnimationController;
