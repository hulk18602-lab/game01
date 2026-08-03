import { getTowerVisual } from "../../content/visuals/towerVisuals.js";

export interface TowerEffectState {
  readonly type: string;
  readonly level: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly angle: number;
  readonly recoil: number;
  readonly fireFlash: number;
  readonly upgradeFlash: number;
  readonly selected: boolean;
  readonly auraBuffed: boolean;
}

export class TowerEffectRenderer {
  drawAmbient(
    context: CanvasRenderingContext2D,
    state: TowerEffectState,
    time: number,
    reducedMotion: boolean,
  ): void {
    const visual = getTowerVisual(state.type);
    const pulse = reducedMotion ? 0 : Math.sin(time * 3.2 + state.position.x * .02) * 1.5;
    context.save();
    context.translate(state.position.x, state.position.y);

    if (state.selected) {
      context.strokeStyle = "rgba(255, 226, 154, .92)";
      context.lineWidth = 2;
      context.shadowColor = "#f6c85f";
      context.shadowBlur = 12;
      context.beginPath();
      context.ellipse(0, 5, 27 + pulse, 19 + pulse * .5, 0, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
    }
    if (state.auraBuffed) {
      context.strokeStyle = "rgba(250, 204, 21, .78)";
      context.lineWidth = 2;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(0, 0, 29 + pulse, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    if (state.upgradeFlash > 0) {
      context.globalAlpha = state.upgradeFlash;
      context.strokeStyle = visual.glow;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, 22 + (1 - state.upgradeFlash) * 18, 0, Math.PI * 2);
      context.stroke();
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 + time;
        context.fillStyle = visual.glow;
        context.fillRect(Math.cos(angle) * 25 - 1, Math.sin(angle) * 17 - 1, 3, 3);
      }
    }

    if (state.type === "frost") this.#frost(context, visual, state, time, reducedMotion);
    else if (state.type === "tesla") this.#tesla(context, visual, state, time, reducedMotion);
    else if (state.type === "poison") this.#poison(context, visual, state, time, reducedMotion);
    else if (state.type === "rapid") this.#rapid(context, visual, state, time, reducedMotion);

    if (state.fireFlash > 0) this.#muzzle(context, visual, state);
    context.restore();
  }

  drawProjectile(context: CanvasRenderingContext2D, projectile: {
    readonly position?: { readonly x: number; readonly y: number };
    readonly rotation?: number;
    readonly damageType?: string;
    readonly projectileType?: string;
    readonly color?: string;
    readonly damage?: number;
    readonly areaRadius?: number;
  }, time: number): void {
    if (!projectile.position) return;
    const type = projectile.damageType ?? "physical";
    context.save();
    context.translate(projectile.position.x, projectile.position.y);
    context.rotate(projectile.rotation ?? 0);
    context.lineCap = "round";
    if (type === "cold") {
      context.rotate(time * 3);
      context.fillStyle = "#cffafe";
      context.strokeStyle = "#67e8f9";
      context.shadowColor = "#67e8f9";
      context.shadowBlur = 10;
      this.#diamond(context, 8, 4);
      context.fill(); context.stroke();
      for (let arm = 0; arm < 3; arm += 1) {
        context.rotate(Math.PI / 3);
        context.beginPath(); context.moveTo(-10, 0); context.lineTo(-5, 0); context.stroke();
      }
    } else if (type === "explosive") {
      context.fillStyle = "#3f2d21";
      context.strokeStyle = "#d97706";
      context.lineWidth = 2;
      context.shadowColor = "#fb923c";
      context.shadowBlur = 8;
      context.beginPath(); context.arc(0, 0, 6, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = "#fed7aa";
      context.beginPath(); context.arc(2, -2, 1.5, 0, Math.PI * 2); context.fill();
    } else if (type === "electric") {
      context.strokeStyle = "#fde047";
      context.shadowColor = "#fef08a";
      context.shadowBlur = 12;
      context.lineWidth = 3;
      context.beginPath(); context.moveTo(-12, -2); context.lineTo(-5, 3); context.lineTo(0, -4); context.lineTo(6, 2); context.lineTo(12, -1); context.stroke();
    } else if (type === "poison") {
      context.fillStyle = "#4ade80";
      context.strokeStyle = "#14532d";
      context.shadowColor = "#86efac";
      context.shadowBlur = 10;
      context.beginPath(); context.arc(0, 0, 5.5, 0, Math.PI * 2); context.fill(); context.stroke();
      context.globalAlpha = .7;
      context.beginPath(); context.arc(-8, 2, 2.5, 0, Math.PI * 2); context.arc(-13, -1, 1.5, 0, Math.PI * 2); context.fill();
    } else {
      context.strokeStyle = projectile.color ?? "#e7d3a1";
      context.lineWidth = projectile.damage && projectile.damage >= 80 ? 3 : 2;
      context.shadowColor = projectile.damage && projectile.damage >= 80 ? "#f472b6" : "#fde68a";
      context.shadowBlur = projectile.damage && projectile.damage >= 80 ? 8 : 3;
      const length = projectile.damage && projectile.damage >= 80 ? 24 : 17;
      context.beginPath(); context.moveTo(-length, 0); context.lineTo(7, 0); context.stroke();
      context.fillStyle = "#f8fafc";
      context.beginPath(); context.moveTo(10, 0); context.lineTo(4, -4); context.lineTo(5, 4); context.closePath(); context.fill();
    }
    context.restore();
  }

  #muzzle(context: CanvasRenderingContext2D, visual: ReturnType<typeof getTowerVisual>, state: TowerEffectState): void {
    context.save();
    context.rotate(state.angle);
    context.translate(state.type === "sniper" ? 37 : state.type === "cannon" ? 30 : 27, 0);
    context.globalAlpha = state.fireFlash;
    context.fillStyle = visual.glow;
    context.shadowColor = visual.accent;
    context.shadowBlur = 14;
    for (let ray = 0; ray < 5; ray += 1) {
      context.rotate(Math.PI * 2 / 5);
      context.beginPath(); context.moveTo(0, 0); context.lineTo(8 + ray, -2); context.lineTo(8 + ray, 2); context.closePath(); context.fill();
    }
    context.restore();
  }

  #frost(context: CanvasRenderingContext2D, visual: ReturnType<typeof getTowerVisual>, state: TowerEffectState, time: number, reduced: boolean): void {
    context.fillStyle = visual.glow;
    const count = 2 + state.level;
    for (let index = 0; index < count; index += 1) {
      const phase = reduced ? index : time * .8 + index * 2.4;
      const radius = 20 + index * 2;
      context.globalAlpha = .35 + index * .1;
      context.beginPath(); context.arc(Math.cos(phase) * radius, Math.sin(phase) * radius * .6, 1.4, 0, Math.PI * 2); context.fill();
    }
  }

  #tesla(context: CanvasRenderingContext2D, visual: ReturnType<typeof getTowerVisual>, state: TowerEffectState, time: number, reduced: boolean): void {
    if (reduced) return;
    context.strokeStyle = visual.glow;
    context.lineWidth = 1.3;
    context.globalAlpha = .45 + Math.sin(time * 12) * .2;
    const span = 9 + state.level * 2;
    context.beginPath(); context.moveTo(-span, -11); context.lineTo(-3, -15); context.lineTo(2, -10); context.lineTo(span, -14); context.stroke();
  }

  #poison(context: CanvasRenderingContext2D, visual: ReturnType<typeof getTowerVisual>, state: TowerEffectState, time: number, reduced: boolean): void {
    const count = reduced ? 2 : 3 + state.level;
    context.fillStyle = visual.glow;
    for (let index = 0; index < count; index += 1) {
      const phase = time * (.35 + index * .04) + index * 1.7;
      context.globalAlpha = .12 + index * .045;
      context.beginPath();
      context.arc(Math.sin(phase * 2) * 14, -8 - ((phase * 9 + index * 5) % 18), 3 + index % 2, 0, Math.PI * 2);
      context.fill();
    }
  }

  #rapid(context: CanvasRenderingContext2D, visual: ReturnType<typeof getTowerVisual>, state: TowerEffectState, time: number, reduced: boolean): void {
    if (reduced) return;
    context.strokeStyle = visual.accent;
    context.globalAlpha = .25;
    context.lineWidth = 1;
    context.beginPath(); context.arc(0, 0, 25 + Math.sin(time * 7) * 1.5, 0, Math.PI * 2); context.stroke();
  }

  #diamond(context: CanvasRenderingContext2D, height: number, width: number): void {
    context.beginPath(); context.moveTo(0, -height); context.lineTo(width, 0); context.lineTo(0, height); context.lineTo(-width, 0); context.closePath();
  }
}

export default TowerEffectRenderer;
