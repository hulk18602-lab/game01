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
    this.element.append(element("h2", undefined, "Build"), this.#list, this.#hint);
  }

  render(options: readonly BuildOptionView[], selectedType: string | null): void {
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
        this.#controls.set(option.type, control);
        this.#list.append(control);
      }
      control.textContent = `${option.name} · ${option.cost}`;
      control.disabled = !option.available && selectedType !== option.type;
      control.classList.toggle("is-selected", selectedType === option.type);
      control.classList.toggle("is-unavailable", !option.available);
      control.setAttribute("aria-pressed", String(selectedType === option.type));
      control.title = option.available
        ? `Build ${option.name}`
        : `Select to see why ${option.name} cannot be built`;
    }
    const selected = options.find((option) => option.type === selectedType);
    this.#hint.hidden = !selected;
    this.#hint.textContent = selected
      ? `Building ${selected.name}: choose a cell. Press Esc or click the button again to cancel.`
      : "";
  }
}
