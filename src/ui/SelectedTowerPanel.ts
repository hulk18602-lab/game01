import type {
  CommandDispatcher,
  SelectedTowerView,
} from "./contracts.js";
import type { TargetingMode } from "../game/types.js";
import { button, element } from "./dom.js";

const targetingLabels: Readonly<Record<TargetingMode, string>> = {
  first: "First",
  nearest: "Nearest",
  strongest: "Strongest",
};

export class SelectedTowerPanel {
  readonly element = element("aside", "game-ui__tower-panel");
  readonly #dispatch: CommandDispatcher;
  readonly #title = element("h2");
  readonly #level = element("p");
  readonly #stats = element("p");
  readonly #upgradePreview = element("p", "game-ui__upgrade-preview");
  readonly #upgrade: HTMLButtonElement;
  readonly #sell: HTMLButtonElement;
  readonly #targeting = new Map<TargetingMode, HTMLButtonElement>();
  #towerId: string | null = null;
  #signature = "";

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Selected tower");
    this.#upgrade = button("", () => {
      if (this.#towerId) this.#dispatch({ type: "upgrade-tower", towerId: this.#towerId });
    });
    this.#upgrade.classList.add("game-ui__button--primary");
    this.#sell = button("", () => {
      if (this.#towerId) this.#dispatch({ type: "sell-tower", towerId: this.#towerId });
    });
    const targeting = element("div", "game-ui__targeting");
    targeting.append(element("span", undefined, "Target:"));
    for (const mode of ["first", "nearest", "strongest"] as const) {
      const control = button(targetingLabels[mode], () => {
        if (this.#towerId) {
          this.#dispatch({ type: "set-targeting", towerId: this.#towerId, mode });
        }
      });
      this.#targeting.set(mode, control);
      targeting.append(control);
    }
    this.element.append(
      this.#title,
      this.#level,
      this.#stats,
      this.#upgradePreview,
      targeting,
      this.#upgrade,
      this.#sell,
    );
  }

  render(tower: SelectedTowerView | null): void {
    const signature = tower
      ? [
        tower.id,
        tower.name,
        tower.level,
        tower.damage,
        tower.range,
        tower.fireRate,
        tower.targeting,
        tower.upgradeCost,
        tower.upgradeAffordable,
        tower.upgradeDelta?.damage,
        tower.upgradeDelta?.range,
        tower.upgradeDelta?.fireRate,
        tower.sellValue,
      ].join("|")
      : "none";
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.hidden = tower === null;
    if (!tower) {
      this.#towerId = null;
      this.#upgrade.disabled = true;
      this.#sell.disabled = true;
      return;
    }
    this.#towerId = tower.id;
    this.#title.textContent = tower.name;
    this.#level.textContent = `Level ${tower.level}/3`;
    this.#stats.textContent =
      `Damage ${tower.damage} · Range ${tower.range} · Rate ${tower.fireRate.toFixed(2)}/s`;
    this.#upgrade.textContent = tower.upgradeCost === null
      ? "Max level"
      : `Upgrade · ${tower.upgradeCost}`;
    this.#upgrade.disabled = tower.upgradeCost === null || !tower.upgradeAffordable;
    if (tower.upgradeDelta) {
      const damage = tower.upgradeDelta.damage >= 0 ? `+${tower.upgradeDelta.damage}` : `${tower.upgradeDelta.damage}`;
      const range = tower.upgradeDelta.range >= 0 ? `+${tower.upgradeDelta.range}` : `${tower.upgradeDelta.range}`;
      const rate = tower.upgradeDelta.fireRate >= 0
        ? `+${tower.upgradeDelta.fireRate.toFixed(2)}`
        : tower.upgradeDelta.fireRate.toFixed(2);
      this.#upgradePreview.textContent = `Next: damage ${damage}, range ${range}, rate ${rate}/s`;
      this.#upgradePreview.hidden = false;
      this.#upgrade.title = this.#upgradePreview.textContent;
    } else {
      this.#upgradePreview.hidden = true;
      this.#upgrade.title = "Maximum tower level reached";
    }
    this.#sell.textContent = `Sell · ${tower.sellValue}`;
    this.#sell.disabled = false;
    for (const [mode, control] of this.#targeting) {
      control.classList.toggle("is-selected", tower.targeting === mode);
      control.setAttribute("aria-pressed", String(tower.targeting === mode));
    }
  }
}
