import type { EnemyTooltipView } from "./contracts.js";
import { element } from "./dom.js";

export class EnemyTooltip {
  readonly element = element("aside", "game-ui__enemy-tooltip");
  readonly #title = element("h2");
  readonly #type = element("p");
  readonly #health = element("p");
  readonly #traits = element("p");
  readonly #effects = element("p");

  constructor() {
    this.element.setAttribute("aria-label", "Enemy details");
    this.element.append(this.#title, this.#type, this.#health, this.#traits, this.#effects);
  }

  render(view: EnemyTooltipView | null): void {
    this.element.hidden = view === null;
    if (!view) return;
    this.#title.textContent = view.name;
    this.#type.textContent = `Type: ${view.type}`;
    this.#health.textContent = `Health: ${Math.ceil(view.health)}/${view.maxHealth}`;
    this.#traits.textContent = [
      `Reward ${view.reward} Gold`,
      `Base damage ${view.baseDamage}`,
      view.armorPercent > 0 ? `Physical armor ${view.armorPercent}%` : "No armor",
    ].join(" · ");
    this.#effects.textContent = `Effects: ${view.effects}`;
  }
}
