import type { BuildOptionView, CommandDispatcher } from "./contracts.js";
import { button, element } from "./dom.js";

export class BuildPanel {
  readonly element = element("aside", "game-ui__build-panel");
  readonly #list = element("div", "game-ui__build-list");
  readonly #hint = element("p", "game-ui__build-hint");
  readonly #dispatch: CommandDispatcher;
  readonly #controls = new Map<string, HTMLButtonElement>();
  #selectedType: string | null = null;

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
      control.textContent = `${option.icon} ${option.name} · ${option.cost}`;
      control.disabled = !option.available && selectedType !== option.type;
      control.classList.toggle("is-selected", selectedType === option.type);
      control.classList.toggle("is-unavailable", !option.available);
      control.setAttribute("aria-pressed", String(selectedType === option.type));
      control.setAttribute("aria-label", `${option.name} · ${option.cost}`);
      control.title = [
        `${option.name} [${option.hotkey}]`,
        option.description,
        `Damage ${option.damage} · Range ${option.range} · Rate ${option.fireRate.toFixed(2)}/s`,
      ].join("\n");
    }
    const selected = options.find((option) => option.type === selectedType);
    this.#hint.hidden = !selected;
    this.#hint.textContent = selected
      ? `Placing ${selected.name}. Click a cell; Esc cancels.`
      : "";
  }
}
