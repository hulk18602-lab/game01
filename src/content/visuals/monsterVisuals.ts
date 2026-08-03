export type MonsterDirection = "up" | "down" | "left" | "right";
export type MonsterAnimationState = "idle" | "walk" | "attack" | "hit" | "death";

export interface AnimationClip {
  readonly frames: readonly number[];
  readonly fps: number;
  readonly loop: boolean;
}

export type DirectionalAnimation = Readonly<Record<MonsterDirection, AnimationClip>>;

export interface MonsterVisualDefinition {
  readonly id: string;
  readonly atlasUrl: string;
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
  readonly animations: Readonly<Record<MonsterAnimationState, DirectionalAnimation>>;
}

const directions = (frames: readonly number[], fps: number, loop: boolean): DirectionalAnimation => {
  const clip = Object.freeze({ frames: Object.freeze([...frames]), fps, loop });
  return Object.freeze({ up: clip, down: clip, left: clip, right: clip });
};

const animations = (walkFps: number) => Object.freeze({
  idle: directions([0, 1, 2, 3], 4, true),
  walk: directions([4, 5, 6, 7], walkFps, true),
  attack: directions([8, 9, 10, 11], 9, false),
  hit: directions([12, 13, 14, 15], 12, false),
  death: directions([16, 17, 18, 19], 7, false),
});

type VisualOptions = {
  readonly width: number;
  readonly height: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly walkFps: number;
  readonly shadowScale?: number;
};

const visual = (id: string, options: VisualOptions): MonsterVisualDefinition => Object.freeze({
  id,
  atlasUrl: `/assets/monsters/${id}/atlas-placeholder.png`,
  metadataUrl: `/assets/monsters/${id}/atlas.json`,
  portraitUrl: `/assets/monsters/${id}/portrait-placeholder.png`,
  frameWidth: options.width / 4,
  frameHeight: options.height / 5,
  atlasColumns: 4,
  displayWidth: options.displayWidth,
  displayHeight: options.displayHeight,
  anchorX: 0.5,
  anchorY: 0.9,
  shadowScale: options.shadowScale ?? 1,
  placeholder: true,
  animations: animations(options.walkFps),
});

export const monsterVisuals = Object.freeze({
  grunt: visual("grunt", { width: 1122, height: 1402, displayWidth: 52, displayHeight: 68, walkFps: 8 }),
  runner: visual("runner", { width: 1122, height: 1402, displayWidth: 50, displayHeight: 64, walkFps: 13, shadowScale: 0.85 }),
  tank: visual("tank", { width: 1402, height: 1122, displayWidth: 78, displayHeight: 76, walkFps: 5, shadowScale: 1.25 }),
  armored: visual("armored", { width: 1122, height: 1402, displayWidth: 66, displayHeight: 72, walkFps: 7, shadowScale: 1.08 }),
  regenerator: visual("regenerator", { width: 1122, height: 1402, displayWidth: 60, displayHeight: 72, walkFps: 7 }),
  boss: visual("boss", { width: 1402, height: 1122, displayWidth: 104, displayHeight: 110, walkFps: 5, shadowScale: 1.45 }),
} satisfies Record<string, MonsterVisualDefinition>);

const aliases: Readonly<Record<string, keyof typeof monsterVisuals>> = Object.freeze({
  eliteRunner: "runner",
  shielded: "armored",
  arcaneSentinel: "armored",
  stormLancer: "runner",
  archonBoss: "boss",
  swarm: "runner",
  splitter: "grunt",
});

export function getMonsterVisual(type: string): MonsterVisualDefinition {
  const key = type in monsterVisuals
    ? type as keyof typeof monsterVisuals
    : aliases[type] ?? "grunt";
  return monsterVisuals[key];
}

export const allMonsterVisuals = Object.freeze(Object.values(monsterVisuals));
