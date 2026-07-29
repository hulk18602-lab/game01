import type { CommandDispatcher, HudView } from "./contracts.js";
import { button, element } from "./dom.js";

export class Hud {
  readonly element = element("section", "game-ui__hud");
  readonly #stats = element("div", "game-ui__stats");
  readonly #waveButton: HTMLButtonElement;

  constructor(dispatch: CommandDispatcher) {
    this.element.setAttribute("aria-label", "Game status");
    this.#waveButton = button("Start wave", () => dispatch({ type: "start-wave" }));
    const pause = button("Pause", () => dispatch({ type: "toggle-pause" }));
    this.element.append(this.#stats, this.#waveButton, pause);
  }

  render(view: HudView): void {
    this.#stats.replaceChildren(
      element("span", "game-ui__stat", `Lives: ${view.lives}`),
      element("span", "game-ui__stat", `Gold: ${view.money}`),
      element("span", "game-ui__stat", `Wave: ${view.wave}/${view.totalWaves}`),
    );
    this.#waveButton.disabled = view.waveInProgress || view.wave >= view.totalWaves;
    this.#waveButton.textContent = view.waveInProgress ? "Wave in progress" : "Start wave";
  }
}
