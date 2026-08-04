import {
  allMonsterVisuals,
  getMonsterVisual,
  type MonsterAnimationState,
  type MonsterDirection,
  type MonsterVisualDefinition,
} from "../../content/visuals/monsterVisuals.js";
import { MonsterAssetLoader } from "./MonsterAssetLoader.js";
import { clipDuration, directionFromDelta, frameAtTime, selectAnimationState } from "./monsterAnimation.js";

interface RenderEnemy {
  readonly id: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly health: number;
  readonly maxHealth: number;
  readonly radius?: number;
  readonly progress?: number;
  readonly boss?: boolean;
  readonly bossPhase?: number;
  readonly shield?: number;
  readonly maxShield?: number;
  readonly armor?: number;
  readonly regeneration?: number;
  readonly statusEffects?: readonly { readonly type: string }[];
  readonly enraged?: boolean;
  readonly speedAura?: number;
  readonly coldResistance?: number;
  readonly healAmount?: number;
  readonly phaseRemaining?: number;
  readonly summonInto?: string | null;
  readonly towerDebuff?: number;
  readonly huntersMarked?: boolean;
}

interface PresentationState {
  readonly id: string;
  type: string;
  position: { x: number; y: number };
  previousPosition: { x: number; y: number };
  health: number;
  maxHealth: number;
  radius: number;
  progress: number;
  boss: boolean;
  bossPhase: number;
  shield: number;
  maxShield: number;
  armor: number;
  regeneration: number;
  poisoned: boolean;
  slowed: boolean;
  enraged: boolean;
  supportAura: boolean;
  frostbound: boolean;
  healer: boolean;
  phased: boolean;
  summoner: boolean;
  towerDebuffer: boolean;
  huntersMarked: boolean;
  direction: MonsterDirection;
  animation: MonsterAnimationState;
  stateSince: number;
  hitUntil: number;
  attackUntil: number;
  deathStartedAt: number | null;
  frame: number;
}

export class MonsterSpriteRenderer {
  readonly #states = new Map<string, PresentationState>();
  readonly assets: MonsterAssetLoader;
  #loadingStarted = false;

  constructor(loader = new MonsterAssetLoader()) {
    this.assets = loader;
  }

  preload(onProgress?: (progress: number) => void): Promise<void> {
    this.#loadingStarted = true;
    return this.assets.preload(allMonsterVisuals, onProgress);
  }

  render(
    context: CanvasRenderingContext2D,
    enemies: readonly RenderEnemy[],
    now: number,
    reducedMotion = false,
  ): void {
    if (!this.#loadingStarted) void this.preload();
    const activeIds = new Set<string>();
    const debugStates: string[] = [];

    for (const enemy of enemies) {
      if (!enemy.position) continue;
      activeIds.add(enemy.id);
      const state = this.#updateState(enemy, now);
      this.#draw(context, state, getMonsterVisual(enemy.type), now, reducedMotion);
      debugStates.push(`${enemy.id}:${state.animation}:${state.direction}:${state.frame}`);
    }

    for (const [id, state] of this.#states) {
      if (activeIds.has(id)) continue;
      if (state.deathStartedAt === null) {
        if (state.progress >= 0.995) {
          this.#states.delete(id);
          continue;
        }
        state.deathStartedAt = now;
        state.animation = "death";
        state.stateSince = now;
      }
      const definition = getMonsterVisual(state.type);
      const clip = definition.animations.death[state.direction];
      if (now - state.deathStartedAt >= clipDuration(clip)) {
        this.#states.delete(id);
        continue;
      }
      this.#draw(context, state, definition, now, reducedMotion);
      debugStates.push(`${id}:death:${state.direction}:${state.frame}`);
    }

    const canvas = context.canvas;
    if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
      canvas.dataset.monsterLoadingProgress = this.assets.progress.toFixed(2);
      canvas.dataset.monsterVisualStates = debugStates.join(",");
      canvas.dataset.monsterSprites = this.assets.loadedCount > 0 ? "active" : "loading";
    }
  }

  #updateState(enemy: RenderEnemy, now: number): PresentationState {
    let state = this.#states.get(enemy.id);
    if (!state) {
      state = {
        id: enemy.id,
        type: enemy.type,
        position: { ...enemy.position },
        previousPosition: { ...enemy.position },
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        radius: enemy.radius ?? 12,
        progress: enemy.progress ?? 0,
        boss: enemy.boss === true,
        bossPhase: enemy.bossPhase ?? 1,
        shield: enemy.shield ?? 0,
        maxShield: enemy.maxShield ?? 0,
        armor: enemy.armor ?? 0,
        regeneration: enemy.regeneration ?? 0,
        poisoned: false,
        slowed: false,
        enraged: false,
        supportAura: false,
        frostbound: false,
        healer: false,
        phased: false,
        summoner: false,
        towerDebuffer: false,
        huntersMarked: false,
        direction: "right",
        animation: "idle",
        stateSince: now,
        hitUntil: 0,
        attackUntil: 0,
        deathStartedAt: null,
        frame: 0,
      };
      this.#states.set(enemy.id, state);
    }

    const dx = enemy.position.x - state.position.x;
    const dy = enemy.position.y - state.position.y;
    state.previousPosition = state.position;
    state.position = { ...enemy.position };
    state.direction = directionFromDelta(dx, dy, state.direction);
    if (enemy.health < state.health) state.hitUntil = now + 0.24;
    if ((enemy.bossPhase ?? 1) !== state.bossPhase) state.attackUntil = now + 0.55;
    state.type = enemy.type;
    state.health = enemy.health;
    state.maxHealth = enemy.maxHealth;
    state.radius = enemy.radius ?? state.radius;
    state.progress = enemy.progress ?? state.progress;
    state.boss = enemy.boss === true;
    state.bossPhase = enemy.bossPhase ?? 1;
    state.shield = enemy.shield ?? 0;
    state.maxShield = enemy.maxShield ?? 0;
    state.armor = enemy.armor ?? 0;
    state.regeneration = enemy.regeneration ?? 0;
    state.slowed = (enemy.statusEffects ?? []).some((effect) => effect.type === "slow");
    state.poisoned = (enemy.statusEffects ?? []).some((effect) =>
      effect.type === "poison" || effect.type === "damageOverTime",
    );
    state.enraged = enemy.enraged === true;
    state.supportAura = (enemy.speedAura ?? 1) > 1;
    state.frostbound = (enemy.coldResistance ?? 0) > 0;
    state.healer = (enemy.healAmount ?? 0) > 0;
    state.phased = (enemy.phaseRemaining ?? 0) > 0;
    state.summoner = Boolean(enemy.summonInto);
    state.towerDebuffer = (enemy.towerDebuff ?? 1) < 1;
    state.huntersMarked = enemy.huntersMarked === true;

    const nextAnimation = selectAnimationState({
      now,
      hitUntil: state.hitUntil,
      attackUntil: state.attackUntil,
      moving: Math.hypot(dx, dy) > 0.01,
    });
    if (nextAnimation !== state.animation) {
      state.animation = nextAnimation;
      state.stateSince = now;
    }
    return state;
  }

  #draw(
    context: CanvasRenderingContext2D,
    state: PresentationState,
    definition: MonsterVisualDefinition,
    now: number,
    reducedMotion: boolean,
  ): void {
    const asset = this.assets.get(definition.atlasUrl);
    const image = asset?.image ?? this.assets.placeholder;
    const clip = definition.animations[state.animation][state.direction];
    const frame = reducedMotion && clip.loop ? clip.frames[0] ?? 0 : frameAtTime(clip, now - state.stateSince);
    state.frame = frame;
    const column = frame % definition.atlasColumns;
    const row = Math.floor(frame / definition.atlasColumns);
    const left = state.position.x - definition.displayWidth * definition.anchorX;
    const top = state.position.y - definition.displayHeight * definition.anchorY;

    context.save();
    context.fillStyle = "rgba(15, 23, 42, .34)";
    context.beginPath();
    context.ellipse(
      state.position.x + 2,
      state.position.y + 2,
      definition.displayWidth * 0.34 * definition.shadowScale,
      definition.displayWidth * 0.12 * definition.shadowScale,
      0, 0, Math.PI * 2,
    );
    context.fill();

    if (state.boss) this.#drawBossAura(context, state, definition, now, reducedMotion);
    context.filter = this.#filter(state, now);
    if (state.direction === "left") {
      context.translate(state.position.x * 2, 0);
      context.scale(-1, 1);
    }
    if (asset?.loaded) {
      context.drawImage(
        image,
        column * definition.frameWidth,
        row * definition.frameHeight,
        definition.frameWidth,
        definition.frameHeight,
        left,
        top,
        definition.displayWidth,
        definition.displayHeight,
      );
    } else {
      this.#drawHumanoidPlaceholder(context, state, definition, now, reducedMotion);
    }
    context.restore();

    this.#drawOverlays(context, state, definition, now, reducedMotion);
    if (state.animation !== "death") this.#drawHealthBar(context, state, definition);
  }

  #filter(state: PresentationState, now: number): string {
    const filters: string[] = [];
    if (state.hitUntil > now) filters.push("brightness(2.1)", "sepia(.45)", "saturate(2.2)");
    if (state.slowed) filters.push("hue-rotate(145deg)", "saturate(.7)");
    if (state.poisoned) filters.push("hue-rotate(55deg)", "saturate(1.35)");
    if (state.phased) filters.push("opacity(.42)", "hue-rotate(235deg)");
    return filters.join(" ") || "none";
  }

  #drawOverlays(
    context: CanvasRenderingContext2D,
    state: PresentationState,
    definition: MonsterVisualDefinition,
    now: number,
    reducedMotion: boolean,
  ): void {
    const x = state.position.x;
    const y = state.position.y - definition.displayHeight * 0.42;
    context.save();
    if (state.shield > 0) {
      context.strokeStyle = "rgba(125, 211, 252, .8)";
      context.lineWidth = 2.5;
      context.beginPath();
      context.ellipse(x, y, definition.displayWidth * 0.48, definition.displayHeight * 0.48, 0, 0, Math.PI * 2);
      context.stroke();
    }
    if (state.enraged) {
      context.strokeStyle = "rgba(239, 68, 68, .8)";
      context.lineWidth = 3;
      context.beginPath(); context.ellipse(x, state.position.y, definition.displayWidth * .48, 13, 0, 0, Math.PI * 2); context.stroke();
    }
    if (state.supportAura) {
      context.strokeStyle = "rgba(250, 204, 21, .62)";
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath(); context.arc(x, state.position.y, 28, 0, Math.PI * 2); context.stroke();
      context.setLineDash([]);
    }
    if (state.frostbound) {
      context.strokeStyle = "rgba(165, 243, 252, .72)";
      context.lineWidth = 2;
      context.beginPath(); context.arc(x, y, definition.displayWidth * .42, 0, Math.PI * 2); context.stroke();
    }
    if (state.phased) {
      context.strokeStyle = "rgba(196, 181, 253, .72)";
      context.lineWidth = 2;
      context.beginPath(); context.ellipse(x, y, definition.displayWidth * .55, definition.displayHeight * .45, 0, 0, Math.PI * 2); context.stroke();
    }
    if (state.huntersMarked) {
      context.strokeStyle = "#facc15";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x - 8, y - 20); context.lineTo(x, y - 12); context.lineTo(x + 8, y - 20);
      context.stroke();
      context.beginPath(); context.arc(x, y - 12, 12, 0, Math.PI * 2); context.stroke();
    }
    if (state.hitUntil > now && state.armor > 0) {
      context.fillStyle = "#fef08a";
      for (let index = 0; index < 4; index += 1) {
        const angle = index * 1.7 + now * 19;
        context.fillRect(x + Math.cos(angle) * 22, y + Math.sin(angle) * 20, 3, 3);
      }
    }
    const particleCount = state.poisoned ? 4 : state.regeneration > 0 ? 5 : 0;
    context.fillStyle = state.poisoned ? "rgba(190, 242, 100, .82)" : "rgba(74, 222, 128, .82)";
    for (let index = 0; index < particleCount; index += 1) {
      const phase = reducedMotion ? index : now * (1.3 + index * 0.08) + index * 2.1;
      const px = x + Math.sin(phase * 2.2) * (10 + index * 3);
      const py = state.position.y - ((phase * 15 + index * 12) % Math.max(24, definition.displayHeight));
      context.beginPath();
      context.arc(px, py, 1.5 + index % 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  #drawBossAura(
    context: CanvasRenderingContext2D,
    state: PresentationState,
    definition: MonsterVisualDefinition,
    now: number,
    reducedMotion: boolean,
  ): void {
    const pulse = reducedMotion ? 0 : Math.sin(now * 3.2) * 4;
    context.strokeStyle = state.bossPhase >= 3 ? "rgba(239, 68, 68, .72)" : "rgba(192, 132, 252, .62)";
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(state.position.x, state.position.y, definition.displayWidth * 0.48 + pulse, 13 + pulse * .25, 0, 0, Math.PI * 2);
    context.stroke();
  }

  #drawHumanoidPlaceholder(
    context: CanvasRenderingContext2D,
    state: PresentationState,
    definition: MonsterVisualDefinition,
    now: number,
    reducedMotion: boolean,
  ): void {
    const stride = reducedMotion ? 0 : Math.sin((now - state.stateSince) * 10) * 4;
    const hitLean = state.animation === "hit" ? -4 : 0;
    context.save();
    context.translate(state.position.x, state.position.y - definition.displayHeight * .45);
    context.rotate(hitLean * Math.PI / 180);
    context.strokeStyle = "#172033";
    context.lineCap = "round";
    context.lineWidth = 6;
    context.beginPath(); context.moveTo(-5, 18); context.lineTo(-8 + stride, 34); context.moveTo(5, 18); context.lineTo(8 - stride, 34); context.stroke();
    context.fillStyle = definition.clothColor;
    context.strokeStyle = "#1e293b";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-13, -8); context.lineTo(11, -8); context.lineTo(14, 19); context.lineTo(-14, 19); context.closePath();
    context.fill(); context.stroke();
    context.fillStyle = definition.accentColor;
    context.fillRect(-13, 4, 27, 5);
    context.fillStyle = "#d7b58d";
    context.beginPath(); context.arc(0, -17, 9, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = definition.accentColor;
    context.beginPath(); context.moveTo(-10, -19); context.lineTo(0, -30); context.lineTo(10, -19); context.closePath(); context.fill();
    this.#drawPlaceholderWeapon(context, definition);
    context.restore();
  }

  #drawPlaceholderWeapon(context: CanvasRenderingContext2D, definition: MonsterVisualDefinition): void {
    context.strokeStyle = definition.weapon === "staff" || definition.weapon === "banner" ? "#8b5e34" : "#cbd5e1";
    context.lineWidth = definition.weapon === "axe" || definition.weapon === "mace" ? 5 : 3;
    context.beginPath(); context.moveTo(12, 12); context.lineTo(24, -20); context.stroke();
    context.fillStyle = definition.accentColor;
    if (definition.weapon === "banner") context.fillRect(23, -24, 18, 14);
    else if (definition.weapon === "staff") { context.beginPath(); context.arc(25, -23, 6, 0, Math.PI * 2); context.fill(); }
    else if (definition.weapon === "axe") { context.beginPath(); context.moveTo(20, -24); context.lineTo(34, -20); context.lineTo(25, -11); context.closePath(); context.fill(); }
    else { context.beginPath(); context.arc(25, -22, 5, 0, Math.PI * 2); context.fill(); }
  }

  #drawHealthBar(context: CanvasRenderingContext2D, state: PresentationState, definition: MonsterVisualDefinition): void {
    const ratio = Math.max(0, Math.min(1, state.health / Math.max(1, state.maxHealth)));
    const width = Math.max(30, definition.displayWidth * 0.72);
    const height = state.boss ? 7 : 5;
    const x = state.position.x - width / 2;
    const y = state.position.y - definition.displayHeight * definition.anchorY - 9;
    context.fillStyle = "rgba(15, 23, 42, .9)";
    context.fillRect(x - 1, y - 1, width + 2, height + 2);
    context.fillStyle = ratio > .6 ? "#22c55e" : ratio > .3 ? "#eab308" : "#ef4444";
    context.fillRect(x, y, width * ratio, height);
    if (state.maxShield > 0 && state.shield > 0) {
      context.fillStyle = "#38bdf8";
      context.fillRect(x, y - 5, width * Math.min(1, state.shield / state.maxShield), 2);
    }
  }
}

export default MonsterSpriteRenderer;
