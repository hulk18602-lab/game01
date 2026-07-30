import type { HeroView } from "./contracts.js";
import { element } from "./dom.js";

/** Stable DOM panel for the campaign archer. */
export class HeroPanel {
  readonly element = element("section", "game-ui__hero-panel");
  readonly #title = element("h2");
  readonly #level = element("p");
  readonly #xp = element("p");
  readonly #stats = element("p");
  readonly #target = element("p");
  readonly #hint = element(
    "p",
    "game-ui__build-hint",
    "Right-click: move · WASD: move · Left-click: select",
  );
  #signature = "";

  constructor() {
    this.element.setAttribute("aria-label", "Hero panel");
    this.element.append(
      this.#title,
      this.#level,
      this.#xp,
      this.#stats,
      this.#target,
      this.#hint,
    );
  }

  render(hero: HeroView | null): void {
    const signature = hero
      ? [
        hero.id,
        hero.level,
        hero.maximumLevel,
        hero.xp,
        hero.xpToNextLevel,
        hero.damage,
        hero.range,
        hero.fireRate,
        hero.target,
        hero.skillPoints,
        hero.auraRadius,
      ].join("|")
      : "none";
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.hidden = hero === null;
    if (!hero) return;
    this.#title.textContent = `🏹 ${hero.name}`;
    this.#level.textContent =
      `Hero level ${hero.level}/${hero.maximumLevel} · ${hero.skillPoints} skill point${hero.skillPoints === 1 ? "" : "s"}`;
    this.#xp.textContent = hero.level >= hero.maximumLevel
      ? "XP MAX"
      : `XP ${hero.xp}/${hero.xpToNextLevel}`;
    this.#stats.textContent =
      `Damage ${hero.damage} · Range ${hero.range} · Rate ${hero.fireRate.toFixed(2)}/s`;
    this.#target.textContent = `Target: ${hero.target ?? "None"}`;
  }
}

export default HeroPanel;
