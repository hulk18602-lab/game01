import type { CommandDispatcher, OverlayView } from "./contracts.js";
import { button, element } from "./dom.js";

export class GameOverlays {
  readonly element = element("div", "game-ui__overlay");
  readonly #dispatch: CommandDispatcher;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
  }

  render(view: OverlayView): void {
    this.element.hidden = view.kind === "none";
    if (view.kind === "none") {
      this.element.replaceChildren();
      return;
    }
    if (view.kind === "paused") {
      this.element.replaceChildren(
        element("h2", undefined, "Paused"),
        button("Continue", () => this.#dispatch({ type: "toggle-pause" })),
      );
      return;
    }
    const won = view.kind === "victory";
    this.element.replaceChildren(
      element("h2", undefined, won ? "Victory" : "Defeat"),
      element("p", undefined, won ? `Score: ${view.score}` : `Reached wave ${view.wave}`),
      button("Play again", () => this.#dispatch({ type: "restart-game" })),
    );
  }
}
