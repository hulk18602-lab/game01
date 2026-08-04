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
  readonly anchor: { readonly x: number; readonly y: number };
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
  readonly procedural: boolean;
  readonly clothColor: string;
  readonly accentColor: string;
  readonly weapon: "sword" | "axe" | "banner" | "staff" | "daggers" | "mace";
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
  readonly procedural?: boolean;
  readonly clothColor?: string;
  readonly accentColor?: string;
  readonly weapon?: MonsterVisualDefinition["weapon"];
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
  procedural: options.procedural ?? false,
  clothColor: options.clothColor ?? "#475569",
  accentColor: options.accentColor ?? "#cbd5e1",
  weapon: options.weapon ?? "sword",
  animationTiming: animationTiming(options.walkFps),
});

export const monsterVisuals = Object.freeze({
  grunt: visual("grunt", { displayWidth: 52, displayHeight: 68, walkFps: 8 }),
  runner: visual("runner", { displayWidth: 50, displayHeight: 64, walkFps: 13, shadowScale: 0.85 }),
  tank: visual("tank", { displayWidth: 78, displayHeight: 76, walkFps: 5, shadowScale: 1.25 }),
  armored: visual("armored", { displayWidth: 66, displayHeight: 72, walkFps: 7, shadowScale: 1.08 }),
  regenerator: visual("regenerator", { displayWidth: 60, displayHeight: 72, walkFps: 7 }),
  boss: visual("boss", { displayWidth: 104, displayHeight: 110, walkFps: 5, shadowScale: 1.45 }),
  berserker: visual("berserker", {
    displayWidth: 68, displayHeight: 76, walkFps: 10, procedural: true,
    clothColor: "#7f1d1d", accentColor: "#f97316", weapon: "axe", shadowScale: 1.08,
  }),
  warBannerCaptain: visual("warBannerCaptain", {
    displayWidth: 76, displayHeight: 84, walkFps: 6, procedural: true,
    clothColor: "#78350f", accentColor: "#facc15", weapon: "banner", shadowScale: 1.2,
  }),
  frostboundKnight: visual("frostboundKnight", {
    displayWidth: 80, displayHeight: 86, walkFps: 5, procedural: true,
    clothColor: "#334155", accentColor: "#7dd3fc", weapon: "mace", shadowScale: 1.28,
  }),
  iceShaman: visual("iceShaman", {
    displayWidth: 66, displayHeight: 80, walkFps: 7, procedural: true,
    clothColor: "#164e63", accentColor: "#a5f3fc", weapon: "staff",
  }),
  shadowAssassin: visual("shadowAssassin", {
    displayWidth: 58, displayHeight: 72, walkFps: 13, procedural: true,
    clothColor: "#312e81", accentColor: "#c4b5fd", weapon: "daggers", shadowScale: 0.9,
  }),
  shadowMinion: visual("shadowMinion", {
    displayWidth: 48, displayHeight: 62, walkFps: 10, procedural: true,
    clothColor: "#334155", accentColor: "#94a3b8", weapon: "daggers", shadowScale: 0.78,
  }),
  necromancer: visual("necromancer", {
    displayWidth: 72, displayHeight: 84, walkFps: 6, procedural: true,
    clothColor: "#3b0764", accentColor: "#d8b4fe", weapon: "staff",
  }),
  dreadPaladin: visual("dreadPaladin", {
    displayWidth: 88, displayHeight: 92, walkFps: 4, procedural: true,
    clothColor: "#27272a", accentColor: "#a855f7", weapon: "mace", shadowScale: 1.35,
  }),
  voidWarlock: visual("voidWarlock", {
    displayWidth: 70, displayHeight: 84, walkFps: 6, procedural: true,
    clothColor: "#581c87", accentColor: "#f0abfc", weapon: "staff",
  }),
  eclipseKing: visual("eclipseKing", {
    displayWidth: 128, displayHeight: 126, walkFps: 4, procedural: true,
    clothColor: "#18181b", accentColor: "#e879f9", weapon: "sword", shadowScale: 1.65,
  }),
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

/** Only definitions backed by real atlas/metadata pairs participate in preload validation. */
export const allMonsterVisuals = Object.freeze(
  Object.values(monsterVisuals).filter((definition) => !definition.procedural),
);
