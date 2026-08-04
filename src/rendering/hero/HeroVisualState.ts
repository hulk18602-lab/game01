import type {
  HeroAnimationName,
  HeroDirection,
  HeroVisualTier,
} from "../../content/visuals/heroVisuals.js";

/** Presentation-only state, intentionally separate from HeroEntity gameplay state. */
export interface HeroVisualState {
  readonly animation: HeroAnimationName;
  readonly direction: HeroDirection;
  readonly frame: number;
  readonly frameIndex: number;
  readonly visualTier: HeroVisualTier;
  readonly releasedThisFrame: boolean;
}
