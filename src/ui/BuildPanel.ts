import type { BuildOptionView, CommandDispatcher } from "./contracts.js";
import { button, element } from "./dom.js";

export class BuildPanel {
  readonly element = element("aside", "game-ui__build-panel");
  readonly #list = element("div", "game-ui__build-list");
  readonly #hint = element("p", "game-ui__build-hint");
  readonly #dispatch: CommandDispatcher;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Build towers");
    this.#hint.hidden = true;
    this.element.append(element("h2", undefined, "Build"), this.#list, this.#hint);
  }

  render(options: readonly BuildOptionView[], selectedType: string | null): void {
    const controls = options.map((option) => {
      const control = button(`${option.name} · ${option.cost}`, () =>
        this.#dispatch(
          selectedType === option.type
            ? { type: "cancel-build" }
            : { type: "select-build", towerType: option.type },
        ),
      );
      control.classList.toggle("is-selected", selectedType === option.type);
      control.classList.toggle("is-unavailable", !option.available);
      control.setAttribute("aria-pressed", String(selectedType === option.type));
      control.title = option.available
        ? `Build ${option.name}`
        : `Select to see why ${option.name} cannot be built`;
      return control;
    });
    this.#list.replaceChildren(...controls);
    const selected = options.find((option) => option.type === selectedType);
    this.#hint.hidden = !selected;
    this.#hint.textContent = selected
      ? `Building ${selected.name}: choose a cell. Press Esc or click the button again to cancel.`
      : "";
  }
}
