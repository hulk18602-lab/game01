import type {
  AnimationClip,
  MonsterAnimationState,
  MonsterDirection,
} from "../../content/visuals/monsterVisuals.js";

export interface PositionLike { readonly x: number; readonly y: number }

export function directionFromDelta(
  dx: number,
  dy: number,
  fallback: MonsterDirection = "right",
): MonsterDirection {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

export function selectAnimationState(options: {
  readonly dead?: boolean;
  readonly hitUntil?: number;
  readonly attackUntil?: number;
  readonly moving?: boolean;
  readonly now: number;
}): MonsterAnimationState {
  if (options.dead) return "death";
  if ((options.hitUntil ?? 0) > options.now) return "hit";
  if ((options.attackUntil ?? 0) > options.now) return "attack";
  return options.moving ? "walk" : "idle";
}

export function frameAtTime(clip: AnimationClip, elapsedSeconds: number): number {
  if (clip.frames.length === 0) return 0;
  const index = Math.max(0, Math.floor(elapsedSeconds * clip.fps));
  const frameIndex = clip.loop
    ? index % clip.frames.length
    : Math.min(index, clip.frames.length - 1);
  return clip.frames[frameIndex] ?? clip.frames[0] ?? 0;
}

export function clipDuration(clip: AnimationClip): number {
  return clip.frames.length / Math.max(1, clip.fps);
}
