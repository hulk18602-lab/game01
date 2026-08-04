import type { BuildOptionView, CommandDispatcher } from "./contracts.js";
import { button, element } from "./dom.js";

export class BuildPanel {
  readonly element = element("aside", "game-ui__build-panel");
  readonly #list = element("div", "game-ui__build-list");
  readonly #hint = element("p", "game-ui__build-hint");
  readonly #dispatch: CommandDispatcher;
  readonly #controls = new Map<string, HTMLButtonElement>();
  #selectedType: string | null = null;
  #signature = "";

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Build towers");
    this.#hint.hidden = true;
    this.element.append(element("h2", undefined, "Build towers"), this.#list, this.#hint);
  }

  render(
    options: readonly BuildOptionView[],
    selectedType: string | null,
    visible = true,
  ): void {
    let signature = `${visible}|${selectedType ?? ""}`;
    for (const option of options) {
      signature += `|${option.type}:${option.available}:${option.cost}:${option.damage}:${option.range}:${option.fireRate}`;
    }
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.hidden = !visible;
    this.#selectedType = selectedType;
    for (const option of options) {
      let control = this.#controls.get(option.type);
      if (!control) {
        control = button("", () => {
          this.#dispatch(
            this.#selectedType === option.type
              ? { type: "cancel-build" }
              : { type: "select-build", towerType: option.type },
          );
        });
        control.classList.add("game-ui__tower-card");
        this.#controls.set(option.type, control);
        this.#list.append(control);
      }
      const icon = element("span", "game-ui__tower-icon");
      icon.dataset.towerType = option.type;
      icon.setAttribute("aria-hidden", "true");
      icon.append(
        element("span", "game-ui__tower-icon-base"),
        element("span", "game-ui__tower-icon-core", option.icon),
      );
      const copy = element("span", "game-ui__tower-card-copy");
      copy.append(
        element("strong", undefined, option.name),
        element("small", undefined, option.role),
      );
      const cost = element("span", "game-ui__tower-card-cost", `${option.cost} gold`);
      const stats = element(
        "span",
        "game-ui__tower-card-stats",
        `${option.damage} DMG  •  ${option.range} RNG  •  ${option.fireRate.toFixed(2)}/s`,
      );
      control.replaceChildren(icon, copy, cost, stats);
      control.disabled = !option.available && selectedType !== option.type;
      control.classList.toggle("is-selected", selectedType === option.type);
      control.classList.toggle("is-unavailable", !option.available);
      control.setAttribute("aria-pressed", String(selectedType === option.type));
      control.setAttribute("aria-label", `${option.name} · ${option.cost} gold`);
      control.title = [
        `${option.name} — ${option.role} [${option.hotkey}]`,
        option.description,
        `Cost ${option.cost} · Damage ${option.damage} · Range ${option.range} · Rate ${option.fireRate.toFixed(2)}/s`,
      ].join("\n");
    }
    const selected = options.find((option) => option.type === selectedType);
    this.#hint.hidden = !selected;
    this.#hint.textContent = selected
      ? `Placing ${selected.name}. Click a cell; Esc cancels.`
      : "";
  }
}
