export type HeroDirection =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

export type HeroAnimationName =
  | "idle"
  | "walk"
  | "run"
  | "aim"
  | "shoot"
  | "hit"
  | "level-up"
  | "cast"
  | "aura"
  | "victory"
  | "defeat";

export interface HeroAnimationClip {
  readonly frames: readonly number[];
  readonly fps: number;
  readonly loop: boolean;
  /** Logical release within a shoot clip. Gameplay uses matching windup time, never this frame. */
  readonly releaseFrame?: number;
}

export type DirectionalAnimation = Readonly<Record<HeroDirection, HeroAnimationClip>>;

export interface HeroVisualDefinition {
  readonly id: string;
  readonly atlasUrl: string;
  readonly fallbackAtlasUrl: string;
  readonly metadataUrl: string;
  readonly portraitUrl: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly atlasColumns: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly shadowScale: number;
  readonly placeholder: boolean;
  readonly animations: Readonly<Record<HeroAnimationName, DirectionalAnimation>>;
}

export type HeroVisualTier = "scout" | "warden" | "elite" | "legendary";

const directions: readonly HeroDirection[] = [
  "north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west",
];

const frames = (start: number, count: number): readonly number[] =>
  Object.freeze(Array.from({ length: count }, (_, index) => start + index));

const directional = (
  frameStart: number,
  count: number,
  fps: number,
  loop: boolean,
  releaseFrame?: number,
): DirectionalAnimation => {
  const clips = {} as Record<HeroDirection, HeroAnimationClip>;
  for (const [directionIndex, direction] of directions.entries()) {
    clips[direction] = Object.freeze({
      frames: frames(frameStart + directionIndex * count, count),
      fps,
      loop,
      releaseFrame,
    });
  }
  return Object.freeze(clips);
};

/**
 * Eldrin's complete 8-direction atlas contract. The committed image is an
 * original one-pose placeholder; an artist can replace it and this metadata
 * without touching hero movement, combat, or presentation orchestration.
 */
export const eldrinVisual: HeroVisualDefinition = Object.freeze({
  id: "eldrin-warden",
  atlasUrl: "/assets/hero/archer/archer-atlas.webp",
  fallbackAtlasUrl: "/assets/hero/archer/placeholder-atlas.webp",
  metadataUrl: "/assets/hero/archer/archer-atlas.json",
  portraitUrl: "/assets/hero/archer/portrait.webp",
  frameWidth: 384,
  frameHeight: 384,
  atlasColumns: 8,
  displayWidth: 88,
  displayHeight: 88,
  anchorX: 0.5,
  anchorY: 0.9,
  shadowScale: 1.1,
  placeholder: true,
  animations: Object.freeze({
    idle: directional(0, 8, 7, true),
    walk: directional(64, 10, 10, true),
    run: directional(144, 10, 14, true),
    aim: directional(224, 6, 12, false),
    shoot: directional(272, 8, 15, false, 4),
    hit: directional(336, 5, 12, false),
    "level-up": directional(376, 12, 12, false),
    cast: directional(472, 10, 12, false),
    aura: directional(552, 8, 8, true),
    victory: directional(616, 8, 8, false),
    defeat: directional(680, 6, 7, false),
  }),
});

export const heroVisuals = Object.freeze({ eldrin: eldrinVisual });

export function visualTierForHeroLevel(level: number): HeroVisualTier {
  if (level >= 10) return "legendary";
  if (level >= 7) return "elite";
  if (level >= 4) return "warden";
  return "scout";
}

export const heroDirections = directions;
