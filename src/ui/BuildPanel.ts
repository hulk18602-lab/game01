import type { BuildOptionView, CommandDispatcher } from "./contracts.js";
import { button, element } from "./dom.js";

export class BuildPanel {
  readonly element = element("aside", "game-ui__build-panel");
  readonly #list = element("div", "game-ui__build-list");
  readonly #dispatch: CommandDispatcher;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("aria-label", "Build towers");
    this.element.append(element("h2", undefined, "Build"), this.#list);
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
      control.disabled = !option.available;
      control.classList.toggle("is-selected", selectedType === option.type);
      control.setAttribute("aria-pressed", String(selectedType === option.type));
      return control;
    });
    this.#list.replaceChildren(...controls);
  }
}
