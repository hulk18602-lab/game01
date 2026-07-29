import type { CommandDispatcher, SelectedTowerView } from "./contracts.js";
import { button, element } from "./dom.js";

export class SelectedTowerPanel {
  readonly element = element("aside", "game-ui__tower-panel");
  readonly #dispatch: CommandDispatcher;
  readonly #title = element("h2");
  readonly #level = element("p");
  readonly #stats = element("p");
  readonly #upgrade: HTMLButtonElement;
  readonly #sell: HTMLButtonElement;
  #towerId: string | null = null;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Selected tower");
    this.#upgrade = button("", () => {
      if (this.#towerId) this.#dispatch({ type: "upgrade-tower", towerId: this.#towerId });
    });
    this.#sell = button("", () => {
      if (this.#towerId) this.#dispatch({ type: "sell-tower", towerId: this.#towerId });
    });
    this.element.append(this.#title, this.#level, this.#stats, this.#upgrade, this.#sell);
  }

  render(tower: SelectedTowerView | null): void {
    this.element.hidden = tower === null;
    if (!tower) {
      this.#towerId = null;
      this.#upgrade.disabled = true;
      this.#sell.disabled = true;
      return;
    }
    this.#towerId = tower.id;
    this.#title.textContent = tower.name;
    this.#level.textContent = `Level ${tower.level}`;
    this.#stats.textContent = `Damage ${tower.damage} · Range ${tower.range}`;
    this.#upgrade.textContent = tower.upgradeCost === null ? "Max level" : `Upgrade · ${tower.upgradeCost}`;
    this.#upgrade.disabled = tower.upgradeCost === null;
    this.#sell.textContent = `Sell · ${tower.sellValue}`;
    this.#sell.disabled = false;
  }
}
