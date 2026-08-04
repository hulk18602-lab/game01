/**
 * Browser-facing presentation composition root. The detailed TypeScript
 * components are loaded once in browsers; Node rendering tests retain a small
 * synchronous fallback and never need to resolve browser-only asset modules.
 */
export class HeroLayer {
  #controller = null;
  #sprite = null;
  #effects = null;
  #visual = {
    animation: "idle",
    direction: "south",
    frame: 0,
    frameIndex: 0,
    visualTier: "scout",
    releasedThisFrame: false,
  };
  #definition = null;

  constructor() {
    if (typeof window === "undefined") return;
    void Promise.all([
      import("../../content/visuals/heroVisuals.js"),
      import("../hero/HeroAnimationController.js"),
      import("../hero/HeroEffectRenderer.js"),
      import("../hero/HeroSpriteRenderer.js"),
    ]).then(([visuals, controller, effects, sprite]) => {
      this.#definition = visuals.eldrinVisual;
      this.#controller = new controller.default();
      this.#effects = new effects.default();
      this.#sprite = new sprite.default();
    }).catch(() => {
      // The fallback below intentionally remains readable when an optional art module fails.
    });
  }

  get visualState() {
    return this.#controller?.state ?? this.#visual;
  }

  render(context, state) {
    const hero = state.hero;
    if (!hero) return;
    if (context.canvas?.dataset) context.canvas.dataset.heroRendered = "true";
    if (this.#controller && this.#sprite && this.#effects && this.#definition) {
      const target = (state.enemies ?? []).find((enemy) => enemy.id === hero.targetId) ?? null;
      const phase = state.phase === "victory" ? "victory" : state.phase === "defeat" ? "defeat" : "playing";
      const visual = this.#controller.update(hero, target?.position ?? null, phase, state.visualTime ?? 0);
      this.#effects.render(context, hero, visual, {
        selected: state.selectedHeroId === hero.id,
        visualTime: state.visualTime ?? 0,
        reducedMotion: state.reducedMotion === true,
        projectiles: state.projectiles ?? [],
      });
      this.#sprite.render(context, hero, visual, this.#definition);
      this.#label(context, hero);
      return;
    }
    this.#fallback(context, hero, state);
  }

  #label(context, hero) {
    context.save();
    context.fillStyle = "#ecfccb";
    context.font = "800 11px system-ui";
    context.textAlign = "center";
    context.fillText(`Lv ${hero.level}`, hero.position.x, hero.position.y - 42);
    context.restore();
  }

  #fallback(context, hero, state) {
    if (state.selectedHeroId === hero.id) {
      context.save();
      context.strokeStyle = "rgba(220, 252, 231, .78)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(hero.position.x, hero.position.y, hero.range, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    context.save();
    context.translate(hero.position.x, hero.position.y);
    context.fillStyle = "rgba(8, 15, 25, .36)";
    context.beginPath();
    context.ellipse(0, 5, 20, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#214e34";
    context.beginPath();
    context.moveTo(-16, 9); context.lineTo(-11, -24); context.lineTo(13, -24); context.lineTo(20, 9); context.closePath();
    context.fill();
    context.fillStyle = "#6b4423";
    context.fillRect(-9, -13, 18, 24);
    context.fillStyle = "#d4a373";
    context.beginPath(); context.arc(0, -31, 9, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#a3e635";
    context.lineWidth = 2;
    context.beginPath(); context.arc(13, -8, 15, -Math.PI / 2, Math.PI / 2); context.stroke();
    context.restore();
    this.#label(context, hero);
  }
}

export default HeroLayer;
