import type { CommandDispatcher, HudView } from "./contracts.js";
import { button, element } from "./dom.js";

export class Hud {
  readonly element = element("section", "game-ui__hud");
  readonly #stats = element("div", "game-ui__stats");
  readonly #lives = element("span", "game-ui__stat");
  readonly #money = element("span", "game-ui__stat");
  readonly #wave = element("span", "game-ui__stat");
  readonly #waveButton: HTMLButtonElement;
  readonly #pauseButton: HTMLButtonElement;

  constructor(dispatch: CommandDispatcher) {
    this.element.setAttribute("aria-label", "Game status");
    this.#waveButton = button("Start wave", () => dispatch({ type: "start-wave" }));
    this.#pauseButton = button("Pause", () => dispatch({ type: "toggle-pause" }));
    this.#stats.append(this.#lives, this.#money, this.#wave);
    this.element.append(this.#stats, this.#waveButton, this.#pauseButton);
  }

  render(view: HudView): void {
    this.#lives.textContent = `Lives: ${view.lives}`;
    this.#money.textContent = `Gold: ${view.money}`;
    this.#wave.textContent = `Wave: ${view.wave}/${view.totalWaves}`;
    this.#waveButton.disabled = view.waveInProgress || view.wave >= view.totalWaves;
    this.#waveButton.textContent = view.waveInProgress ? "Wave in progress" : "Start wave";
  }
}
