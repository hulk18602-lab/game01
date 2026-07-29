import type { CommandDispatcher, OverlayView } from "./contracts.js";
import { button, element } from "./dom.js";

export class GameOverlays {
  readonly element = element("div", "game-ui__overlay");
  readonly #dispatch: CommandDispatcher;
  readonly #title = element("h2");
  readonly #detail = element("p");
  readonly #continue: HTMLButtonElement;
  readonly #playAgain: HTMLButtonElement;

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.#continue = button("Continue", () => this.#dispatch({ type: "toggle-pause" }));
    this.#playAgain = button("Play again", () => this.#dispatch({ type: "restart-game" }));
    this.element.append(this.#title, this.#detail, this.#continue, this.#playAgain);
  }

  render(view: OverlayView): void {
    this.element.hidden = view.kind === "none";
    if (view.kind === "none") {
      this.#continue.hidden = true;
      this.#playAgain.hidden = true;
      return;
    }
    if (view.kind === "paused") {
      this.#title.textContent = "Paused";
      this.#detail.textContent = "";
      this.#detail.hidden = true;
      this.#continue.hidden = false;
      this.#playAgain.hidden = true;
      return;
    }
    const won = view.kind === "victory";
    this.#title.textContent = won ? "Victory" : "Defeat";
    this.#detail.textContent = won ? `Score: ${view.score}` : `Reached wave ${view.wave}`;
    this.#detail.hidden = false;
    this.#continue.hidden = true;
    this.#playAgain.hidden = false;
  }
}
