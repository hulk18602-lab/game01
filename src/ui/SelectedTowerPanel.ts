import type { CommandDispatcher, SelectedTowerView } from "./contracts.js";
import { button, element } from "./dom.js";

export class SelectedTowerPanel {
  readonly element = element("aside", "game-ui__tower-panel");
  readonly #dispatch: CommandDispatcher;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Selected tower");
  }

  render(tower: SelectedTowerView | null): void {
    this.element.hidden = tower === null;
    if (!tower) {
      this.element.replaceChildren();
      return;
    }
    const upgrade = button(
      tower.upgradeCost === null ? "Max level" : `Upgrade · ${tower.upgradeCost}`,
      () => this.#dispatch({ type: "upgrade-tower", towerId: tower.id }),
    );
    upgrade.disabled = tower.upgradeCost === null;
    this.element.replaceChildren(
      element("h2", undefined, tower.name),
      element("p", undefined, `Level ${tower.level}`),
      element("p", undefined, `Damage ${tower.damage} · Range ${tower.range}`),
      upgrade,
      button(`Sell · ${tower.sellValue}`, () =>
        this.#dispatch({ type: "sell-tower", towerId: tower.id }),
      ),
    );
  }
}
