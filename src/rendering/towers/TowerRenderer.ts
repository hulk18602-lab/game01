import {
  getTowerVisual,
  towerVisualSignature,
  type TowerVisualDefinition,
} from "../../content/visuals/towerVisuals.js";
import TowerEffectRenderer, { type TowerEffectState } from "./TowerEffectRenderer.js";

const RAPID_BARREL_OFFSETS = Object.freeze([-5, 5]);

export interface TowerRenderEntity {
  readonly id: string;
  readonly type: string;
  readonly level: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly targetId?: string | null;
  readonly cooldown?: number;
  readonly auraBuffed?: boolean;
}

export interface TowerTargetEntity {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
}

export interface TowerPreviewEntity {
  readonly type?: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly valid: boolean;
}

interface TowerAnimationState extends TowerEffectState {
  readonly id: string;
  type: string;
  level: number;
  position: { x: number; y: number };
  angle: number;
  recoil: number;
  fireFlash: number;
  upgradeFlash: number;
  selected: boolean;
  auraBuffed: boolean;
  previousCooldown: number;
  createdAt: number;
  removedAt: number | null;
  opacity: number;
  tracking: boolean;
}

export interface TowerRenderOptions {
  readonly time: number;
  readonly reducedMotion?: boolean;
  readonly selectedTowerId?: string | null;
}

export interface TowerRendererDiagnostics {
  readonly mode: "detailed";
  renderedTowerCount: number;
  readonly renderedTowerTypes: string[];
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function trackedTowerAngle(
  current: number,
  towerPosition: { readonly x: number; readonly y: number },
  targetPosition: { readonly x: number; readonly y: number },
  deltaSeconds: number,
): number {
  const desired = Math.atan2(
    targetPosition.y - towerPosition.y,
    targetPosition.x - towerPosition.x,
  );
  return current + shortestAngleDelta(current, desired) * Math.min(1, deltaSeconds * 14);
}

export class TowerRenderer {
  readonly #states = new Map<string, TowerAnimationState>();
  readonly #targets = new Map<string, TowerTargetEntity>();
  readonly #activeIds = new Set<string>();
  readonly effects: TowerEffectRenderer;
  readonly diagnostics: TowerRendererDiagnostics = {
    mode: "detailed",
    renderedTowerCount: 0,
    renderedTowerTypes: [],
  };
  readonly #renderedTypes = new Set<string>();
  readonly #previewState: TowerAnimationState = {
    id: "preview", type: "basic", level: 0, position: { x: 0, y: 0 }, angle: -Math.PI / 2,
    recoil: 0, fireFlash: 0, upgradeFlash: 0, selected: false, auraBuffed: false,
    previousCooldown: 0, createdAt: -1, removedAt: null, opacity: 1, tracking: false,
  };
  #lastTime = 0;

  constructor(effects = new TowerEffectRenderer()) {
    this.effects = effects;
  }

  render(
    context: CanvasRenderingContext2D,
    towers: readonly TowerRenderEntity[],
    enemies: readonly TowerTargetEntity[],
    options: TowerRenderOptions,
  ): void {
    const now = options.time;
    const delta = Math.max(0, Math.min(.05, now - this.#lastTime));
    this.#lastTime = now;
    this.#targets.clear();
    for (const enemy of enemies) this.#targets.set(enemy.id, enemy);
    this.#activeIds.clear();
    this.#renderedTypes.clear();
    const debugEnabled = typeof window !== "undefined"
      && (window as Window & { readonly __GAME_DEBUG__?: unknown }).__GAME_DEBUG__ !== undefined;
    const debug: string[] | null = debugEnabled ? [] : null;

    for (const tower of towers) {
      this.#activeIds.add(tower.id);
      this.#renderedTypes.add(tower.type);
      const state = this.#stateFor(tower, now, delta, options.selectedTowerId ?? null);
      this.#drawTower(context, state, getTowerVisual(tower.type), now, options.reducedMotion === true, false);
      const mode = state.fireFlash > 0 ? "firing" : state.tracking ? "tracking" : "idle";
      debug?.push(`${tower.id}:${tower.type}:L${tower.level + 1}:${mode}:${state.angle.toFixed(2)}`);
    }

    this.diagnostics.renderedTowerCount = towers.length;
    this.diagnostics.renderedTowerTypes.length = 0;
    this.diagnostics.renderedTowerTypes.push(...this.#renderedTypes);

    for (const [id, state] of this.#states) {
      if (this.#activeIds.has(id)) continue;
      state.removedAt ??= now;
      const elapsed = now - state.removedAt;
      if (elapsed >= .28) {
        this.#states.delete(id);
        continue;
      }
      state.opacity = 1 - elapsed / .28;
      this.#drawTower(context, state, getTowerVisual(state.type), now, options.reducedMotion === true, false);
      debug?.push(`${id}:${state.type}:sold:${state.opacity.toFixed(2)}`);
    }

    const canvas = context.canvas;
    if (debug && typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
      canvas.dataset.towerVisualStates = debug.join(",");
      canvas.dataset.towerVisualArchitecture = "procedural-medieval-v1";
    }
  }

  drawPreview(
    context: CanvasRenderingContext2D,
    preview: TowerPreviewEntity,
    time: number,
    reducedMotion = false,
  ): void {
    const state = this.#previewState;
    state.type = preview.type ?? "basic";
    state.level = 0;
    state.position.x = preview.position.x;
    state.position.y = preview.position.y;
    state.opacity = preview.valid ? .68 : .5;
    state.angle = -Math.PI / 2;
    state.createdAt = -1;
    context.save();
    context.filter = preview.valid
      ? "saturate(.9) drop-shadow(0 0 5px rgba(34,197,94,.8))"
      : "grayscale(.65) sepia(.5) hue-rotate(320deg) drop-shadow(0 0 5px rgba(239,68,68,.85))";
    this.#drawTower(context, state, getTowerVisual(state.type), time, reducedMotion, true);
    context.restore();
    const canvas = context.canvas;
    if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
      canvas.dataset.towerPreview = `${state.type}:${preview.valid ? "valid" : "invalid"}`;
    }
  }

  drawProjectile(context: CanvasRenderingContext2D, projectile: Parameters<TowerEffectRenderer["drawProjectile"]>[1], time: number): void {
    this.effects.drawProjectile(context, projectile, time);
  }

  #stateFor(
    tower: TowerRenderEntity,
    now: number,
    delta: number,
    selectedId: string | null,
  ): TowerAnimationState {
    let state = this.#states.get(tower.id);
    if (!state) {
      state = {
        id: tower.id, type: tower.type, level: tower.level, position: { ...tower.position },
        angle: -Math.PI / 2, recoil: 0, fireFlash: 0, upgradeFlash: 0,
        selected: tower.id === selectedId, auraBuffed: tower.auraBuffed === true,
        previousCooldown: tower.cooldown ?? 0, createdAt: now, removedAt: null, opacity: 1, tracking: false,
      };
      this.#states.set(tower.id, state);
    }
    const cooldown = tower.cooldown ?? 0;
    if (cooldown > state.previousCooldown + .015) {
      state.fireFlash = 1;
      state.recoil = 1;
    }
    if (tower.level > state.level) state.upgradeFlash = 1;
    state.type = tower.type;
    state.level = tower.level;
    state.position.x = tower.position.x;
    state.position.y = tower.position.y;
    state.selected = tower.id === selectedId;
    state.auraBuffed = tower.auraBuffed === true;
    state.previousCooldown = cooldown;
    state.removedAt = null;
    state.opacity = 1;
    state.fireFlash = Math.max(0, state.fireFlash - delta * 8.5);
    state.recoil = Math.max(0, state.recoil - delta * (tower.type === "cannon" ? 4.8 : 10));
    state.upgradeFlash = Math.max(0, state.upgradeFlash - delta * 1.8);

    const target = tower.targetId ? this.#targets.get(tower.targetId) : undefined;
    state.tracking = Boolean(target);
    if (target) {
      state.angle = trackedTowerAngle(state.angle, tower.position, target.position, delta);
    }
    return state;
  }

  #drawTower(
    context: CanvasRenderingContext2D,
    state: TowerAnimationState,
    visual: TowerVisualDefinition,
    time: number,
    reducedMotion: boolean,
    preview: boolean,
  ): void {
    const tier = Math.max(0, Math.min(2, state.level));
    const build = state.createdAt < 0 || reducedMotion ? 1 : Math.min(1, (time - state.createdAt) / .34);
    const eased = 1 - Math.pow(1 - Math.max(0, build), 3);
    context.save();
    context.globalAlpha *= state.opacity * (preview ? 1 : Math.max(.25, eased));
    context.translate(state.position.x, state.position.y);
    if (!preview) {
      context.fillStyle = "rgba(8, 15, 22, .42)";
      context.beginPath(); context.ellipse(3, 10, 25 + tier * 2, 13 + tier, -.08, 0, Math.PI * 2); context.fill();
    }
    context.scale(.78 + eased * .22, .78 + eased * .22);
    this.#foundation(context, visual, tier);
    this.#structure(context, visual, tier);
    this.#weapon(context, state, visual, tier, time, reducedMotion);
    context.restore();
    if (!preview) this.effects.drawAmbient(context, state, time, reducedMotion);
  }

  #foundation(context: CanvasRenderingContext2D, visual: TowerVisualDefinition, tier: number): void {
    const radius = 20 + tier * 2;
    context.fillStyle = visual.stoneDark;
    context.beginPath(); context.ellipse(0, 5, radius + 3, radius * .7, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = visual.baseColor;
    context.beginPath(); context.ellipse(0, 2, radius + 1, radius * .69, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = visual.stoneLight;
    context.globalAlpha *= .8;
    context.lineWidth = 1.5;
    context.beginPath(); context.ellipse(0, 0, radius, radius * .64, 0, Math.PI, Math.PI * 2); context.stroke();
    context.globalAlpha /= .8;

    context.strokeStyle = visual.stoneDark;
    context.lineWidth = 2;
    for (let block = 0; block < 8 + tier * 2; block += 1) {
      const angle = block * Math.PI * 2 / (8 + tier * 2);
      context.beginPath();
      context.moveTo(Math.cos(angle) * (radius - 3), Math.sin(angle) * (radius * .53));
      context.lineTo(Math.cos(angle) * (radius + 1), Math.sin(angle) * (radius * .67));
      context.stroke();
    }
    for (let brace = 0; brace < tier * 2; brace += 1) {
      const angle = brace * Math.PI / Math.max(1, tier);
      context.save(); context.rotate(angle); context.fillStyle = visual.metal; context.fillRect(-2, -radius - 1, 4, 8); context.restore();
    }
  }

  #structure(context: CanvasRenderingContext2D, visual: TowerVisualDefinition, tier: number): void {
    if (visual.silhouette === "bastion") {
      context.fillStyle = visual.stoneDark; context.fillRect(-16 - tier, -13 - tier, 32 + tier * 2, 25 + tier * 2);
      context.fillStyle = visual.stoneLight; context.fillRect(-13 - tier, -12 - tier, 26 + tier * 2, 20 + tier * 2);
      context.strokeStyle = visual.metal; context.lineWidth = 3;
      context.strokeRect(-14 - tier, -13 - tier, 28 + tier * 2, 23 + tier * 2);
    } else if (visual.silhouette === "spire") {
      context.fillStyle = visual.stoneDark; this.#diamond(context, 16 + tier * 2, 13 + tier); context.fill();
      context.fillStyle = visual.stoneLight; this.#diamond(context, 13 + tier * 2, 10 + tier); context.fill();
    } else if (visual.silhouette === "workshop") {
      context.fillStyle = visual.stoneDark; this.#polygon(context, 8, 16 + tier, Math.PI / 8); context.fill();
      context.fillStyle = "#6b4b35"; this.#polygon(context, 8, 13 + tier, Math.PI / 8); context.fill();
      context.strokeStyle = visual.metal; context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, 8 + tier, 0, Math.PI * 2); context.stroke();
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = spoke * Math.PI / 3; context.beginPath(); context.moveTo(0, 0); context.lineTo(Math.cos(angle) * 8, Math.sin(angle) * 8); context.stroke();
      }
    } else {
      context.fillStyle = visual.stoneDark; this.#polygon(context, 10, 16 + tier, Math.PI / 10); context.fill();
      context.fillStyle = visual.stoneLight; this.#polygon(context, 10, 13 + tier, Math.PI / 10); context.fill();
      context.strokeStyle = visual.baseColor; context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, 9 + tier, 0, Math.PI * 2); context.stroke();
    }

    if (tier >= 1) {
      context.strokeStyle = visual.accent; context.lineWidth = 1.5; context.setLineDash([3, 3]);
      context.beginPath(); context.ellipse(0, 0, 17 + tier * 2, 12 + tier, 0, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
    }
    if (tier >= 2) {
      context.fillStyle = visual.accent;
      for (let rune = 0; rune < 4; rune += 1) {
        const angle = rune * Math.PI / 2 + Math.PI / 4;
        context.save(); context.translate(Math.cos(angle) * 18, Math.sin(angle) * 12); context.rotate(angle); this.#diamond(context, 3.5, 2); context.fill(); context.restore();
      }
    }
  }

  #weapon(
    context: CanvasRenderingContext2D,
    state: TowerAnimationState,
    visual: TowerVisualDefinition,
    tier: number,
    time: number,
    reducedMotion: boolean,
  ): void {
    const recoil = state.recoil * (state.type === "cannon" ? 7 : 2.5);
    if (state.type === "frost") {
      context.save(); if (!reducedMotion) context.rotate(time * (.55 + tier * .12));
      context.fillStyle = visual.glow; context.shadowColor = visual.accent; context.shadowBlur = 12;
      this.#diamond(context, 16 + tier * 2, 8 + tier); context.fill();
      context.fillStyle = visual.accent; this.#diamond(context, 10 + tier, 4 + tier * .5); context.fill();
      context.restore();
      return;
    }
    if (state.type === "tesla") {
      context.strokeStyle = visual.metal; context.lineWidth = 3;
      for (let rod = 0; rod < 3; rod += 1) {
        const angle = rod * Math.PI * 2 / 3; context.beginPath(); context.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 4); context.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 10 - 6); context.stroke();
      }
      context.fillStyle = visual.glow; context.shadowColor = visual.accent; context.shadowBlur = 14;
      context.beginPath(); context.arc(0, -7, 6 + tier, 0, Math.PI * 2); context.fill();
      context.strokeStyle = visual.accent; context.lineWidth = 2; context.beginPath(); context.arc(0, -7, 10 + tier * 2, 0, Math.PI * 2); context.stroke();
      return;
    }
    if (state.type === "poison") {
      context.fillStyle = "#244b31"; context.strokeStyle = visual.metal; context.lineWidth = 2;
      context.beginPath(); context.ellipse(0, -2, 10 + tier, 12 + tier, 0, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = visual.accent; context.globalAlpha *= .85;
      context.beginPath(); context.ellipse(0, -6, 7 + tier, 5, 0, 0, Math.PI * 2); context.fill(); context.globalAlpha /= .85;
      context.strokeStyle = visual.metal; context.beginPath(); context.arc(11, -5, 7, -Math.PI / 2, Math.PI / 2); context.stroke();
      return;
    }

    context.save(); context.rotate(state.angle); context.translate(-recoil, 0);
    if (state.type === "cannon") {
      context.fillStyle = visual.metal; context.strokeStyle = "#33251c"; context.lineWidth = 2;
      context.fillRect(3, -7, 25 + tier * 3, 14); context.strokeRect(3, -7, 25 + tier * 3, 14);
      context.fillStyle = "#4a3428"; context.beginPath(); context.arc(4, 0, 8, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#c78b51"; context.fillRect(18, -8, 5, 16);
    } else if (state.type === "rapid") {
      context.strokeStyle = "#dbc18c"; context.lineWidth = 3;
      for (const offset of RAPID_BARREL_OFFSETS) {
        context.beginPath(); context.moveTo(0, offset); context.lineTo(27 + tier * 2, offset); context.stroke();
        context.strokeStyle = visual.accent; context.lineWidth = 1; context.beginPath(); context.moveTo(10, offset - 5); context.lineTo(18, offset); context.lineTo(10, offset + 5); context.stroke(); context.strokeStyle = "#dbc18c"; context.lineWidth = 3;
      }
      context.fillStyle = visual.metal; context.fillRect(-5, -8, 14, 16);
    } else if (state.type === "sniper") {
      context.strokeStyle = visual.metal; context.lineWidth = 3; context.beginPath(); context.moveTo(-7, 0); context.lineTo(36 + tier * 4, 0); context.stroke();
      context.strokeStyle = visual.accent; context.lineWidth = 2; context.beginPath(); context.arc(8, 0, 13 + tier, -1.2, 1.2); context.stroke();
      context.fillStyle = visual.glow; context.shadowColor = visual.accent; context.shadowBlur = 10; context.beginPath(); context.arc(4, 0, 3 + tier * .5, 0, Math.PI * 2); context.fill();
    } else {
      context.strokeStyle = "#8a5d38"; context.lineWidth = 4; context.beginPath(); context.moveTo(-6, 0); context.lineTo(28 + tier * 2, 0); context.stroke();
      context.strokeStyle = visual.metal; context.lineWidth = 2; context.beginPath(); context.arc(8, 0, 14 + tier, -1.1, 1.1); context.stroke();
      context.strokeStyle = "#d8c49b"; context.lineWidth = 1; context.beginPath(); context.moveTo(14, -12); context.lineTo(23, 0); context.lineTo(14, 12); context.stroke();
    }
    context.restore();
  }

  #polygon(context: CanvasRenderingContext2D, sides: number, radius: number, rotation: number): void {
    context.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + index * Math.PI * 2 / sides;
      const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
  }

  #diamond(context: CanvasRenderingContext2D, height: number, width: number): void {
    context.beginPath(); context.moveTo(0, -height); context.lineTo(width, 0); context.lineTo(0, height); context.lineTo(-width, 0); context.closePath();
  }
}

export { towerVisualSignature };
export default TowerRenderer;
