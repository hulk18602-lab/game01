import type { HeroEntity } from "../../entities/HeroEntity.js";
import type { Position } from "../../game/types.js";
import type { HeroVisualState } from "./HeroVisualState.js";

interface HeroEffectRenderState {
  readonly selected: boolean;
  readonly visualTime: number;
  readonly reducedMotion: boolean;
  readonly projectiles: readonly { readonly sourceId?: string; readonly projectileType?: string; readonly position: Position }[];
}

/** Draws non-sprite presentation cues: selection, destination, aura and arrow trails. */
export class HeroEffectRenderer {
  render(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    state: HeroEffectRenderState,
  ): void {
    if (state.selected) this.#selection(context, hero);
    if (hero.moveTarget) this.#destination(context, hero.moveTarget, state.visualTime, state.reducedMotion);
    if (hero.auraRadius > 0) this.#aura(context, hero, visual, state.visualTime, state.reducedMotion);
    this.#arrows(context, hero, state.projectiles);
  }

  #selection(context: CanvasRenderingContext2D, hero: HeroEntity): void {
    context.save();
    context.fillStyle = "rgba(187, 247, 208, .10)";
    context.strokeStyle = "rgba(220, 252, 231, .78)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(hero.position.x, hero.position.y, hero.range, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  #destination(
    context: CanvasRenderingContext2D,
    target: Position,
    time: number,
    reduced: boolean,
  ): void {
    const pulse = reduced ? 0 : Math.sin(time * 5) * 3;
    context.save();
    context.strokeStyle = "#bbf7d0";
    context.fillStyle = "rgba(187, 247, 208, .18)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(target.x, target.y, 8 + pulse, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  #aura(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    time: number,
    reduced: boolean,
  ): void {
    const pulse = reduced ? 0 : Math.sin(time * 3.4) * 3;
    const alpha = visual.visualTier === "legendary" ? 0.16 : 0.09;
    context.save();
    context.fillStyle = `rgba(190, 242, 100, ${alpha})`;
    context.strokeStyle = "rgba(253, 224, 71, .58)";
    context.lineWidth = 2;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.arc(hero.position.x, hero.position.y, hero.auraRadius + pulse, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  #arrows(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    projectiles: HeroEffectRenderState["projectiles"],
  ): void {
    context.save();
    context.strokeStyle = "rgba(253, 230, 138, .76)";
    context.lineWidth = 1.4;
    for (const projectile of projectiles) {
      if (projectile.sourceId !== hero.id || projectile.projectileType !== "arrow") continue;
      context.beginPath();
      context.moveTo(projectile.position.x, projectile.position.y);
      context.lineTo(
        projectile.position.x - (projectile.position.x - hero.position.x) * 0.16,
        projectile.position.y - (projectile.position.y - hero.position.y) * 0.16,
      );
      context.stroke();
    }
    context.restore();
  }
}

export default HeroEffectRenderer;
