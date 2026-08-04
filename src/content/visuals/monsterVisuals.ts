export type MonsterDirection = "up" | "down" | "left" | "right";
export type MonsterAnimationState = "idle" | "walk" | "attack" | "hit" | "death";

export interface AnimationClip {
  readonly frames: readonly number[];
  readonly fps: number;
  readonly loop: boolean;
}

export interface MonsterAtlasMetadata {
  readonly schemaVersion: number;
  readonly id: string;
  readonly atlas: {
    readonly file: string;
    readonly width: number;
    readonly height: number;
    readonly columns: number;
    readonly rows: number;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly contentWidth: number;
    readonly contentHeight: number;
    readonly padding: number;
  };
  readonly animations: Readonly<Record<MonsterAnimationState, readonly number[]>>;
  readonly anchor: {
    readonly x: number;
    readonly y: number;
  };
}

interface AnimationTiming {
  readonly fps: number;
  readonly loop: boolean;
}

export interface MonsterVisualDefinition {
  readonly id: string;
  readonly atlasUrl: string;
  readonly metadataUrl: string;
  readonly portraitUrl: string;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly shadowScale: number;
  readonly placeholder: boolean;
  readonly animationTiming: Readonly<Record<MonsterAnimationState, AnimationTiming>>;
}

const animationTiming = (walkFps: number) => Object.freeze({
  idle: Object.freeze({ fps: 4, loop: true }),
  walk: Object.freeze({ fps: walkFps, loop: true }),
  attack: Object.freeze({ fps: 9, loop: false }),
  hit: Object.freeze({ fps: 12, loop: false }),
  death: Object.freeze({ fps: 7, loop: false }),
});

type VisualOptions = {
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
  displayWidth: options.displayWidth,
  displayHeight: options.displayHeight,
  shadowScale: options.shadowScale ?? 1,
  placeholder: true,
  animationTiming: animationTiming(options.walkFps),
});

export const monsterVisuals = Object.freeze({
  grunt: visual("grunt", { displayWidth: 52, displayHeight: 68, walkFps: 8 }),
  runner: visual("runner", { displayWidth: 50, displayHeight: 64, walkFps: 13, shadowScale: 0.85 }),
  tank: visual("tank", { displayWidth: 78, displayHeight: 76, walkFps: 5, shadowScale: 1.25 }),
  armored: visual("armored", { displayWidth: 66, displayHeight: 72, walkFps: 7, shadowScale: 1.08 }),
  regenerator: visual("regenerator", { displayWidth: 60, displayHeight: 72, walkFps: 7 }),
  boss: visual("boss", { displayWidth: 104, displayHeight: 110, walkFps: 5, shadowScale: 1.45 }),
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
