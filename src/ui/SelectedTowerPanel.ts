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
  readonly #header = element("div", "game-ui__tower-panel-header");
  readonly #icon = element("span", "game-ui__tower-icon game-ui__tower-icon--large");
  readonly #role = element("p", "game-ui__tower-role");
  readonly #description = element("p", "game-ui__tower-description");
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
    this.#icon.setAttribute("aria-hidden", "true");
    this.#icon.append(
      element("span", "game-ui__tower-icon-base"),
      element("span", "game-ui__tower-icon-core"),
    );
    const heading = element("div");
    heading.append(this.#title, this.#role);
    this.#header.append(this.#icon, heading);
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
      this.#header,
      this.#description,
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
        tower.type,
        tower.name,
        tower.role,
        tower.description,
        tower.level,
        tower.damage,
        tower.range,
        tower.fireRate,
        tower.effectiveDamage,
        tower.effectiveFireRate,
        tower.auraBuffed,
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
    this.#role.textContent = tower.role;
    this.#description.textContent = tower.description;
    this.#icon.dataset.towerType = tower.type;
    const core = this.#icon.querySelector<HTMLElement>(".game-ui__tower-icon-core");
    if (core) {
      core.textContent = tower.type === "frost"
        ? "❄"
        : tower.type === "tesla"
          ? "ϟ"
          : tower.type === "poison"
            ? "☠"
            : "◆";
    }
    this.#level.textContent = `Level ${tower.level}/3`;
    this.#stats.textContent = tower.auraBuffed
      ? `Rally buff · Damage ${tower.effectiveDamage.toFixed(1)} (${tower.damage} base) · Range ${tower.range} · Rate ${tower.effectiveFireRate.toFixed(2)}/s`
      : `Damage ${tower.damage} · Range ${tower.range} · Rate ${tower.fireRate.toFixed(2)}/s`;
    this.#stats.classList.toggle("is-buffed", tower.auraBuffed);
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
