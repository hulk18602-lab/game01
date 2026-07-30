import type { CommandDispatcher, HudView } from "./contracts.js";
import type { AudioSettingsView } from "./contracts.js";
import { AudioControls } from "./AudioControls.js";
import { button, element } from "./dom.js";

export class Hud {
  readonly element = element("section", "game-ui__hud");
  readonly #stats = element("div", "game-ui__stats");
  readonly #lives = element("span", "game-ui__stat");
  readonly #money = element("span", "game-ui__stat");
  readonly #score = element("span", "game-ui__stat");
  readonly #wave = element("span", "game-ui__stat");
  readonly #remaining = element("span", "game-ui__stat");
  readonly #waveIntel = element("div", "game-ui__wave-intel");
  readonly #waveTitle = element("strong");
  readonly #composition = element("span");
  readonly #countdown = element("span");
  readonly #waveButton: HTMLButtonElement;
  readonly #pauseButton: HTMLButtonElement;
  readonly #speedButtons = new Map<number, HTMLButtonElement>();
  readonly #audio: AudioControls;
  #signature = "";

  constructor(dispatch: CommandDispatcher) {
    this.element.setAttribute("aria-label", "Game status");
    this.#waveButton = button("Start wave", () => dispatch({ type: "start-wave" }));
    this.#waveButton.classList.add("game-ui__button--primary");
    this.#pauseButton = button("Pause", () => dispatch({ type: "toggle-pause" }));
    this.#audio = new AudioControls(dispatch, true);
    const speedControls = element("div", "game-ui__speed");
    speedControls.setAttribute("aria-label", "Game speed");
    for (const speed of [1, 2, 3] as const) {
      const control = button(`${speed}x`, () => dispatch({ type: "set-speed", speed }));
      control.setAttribute("aria-label", `Game speed ${speed}x`);
      this.#speedButtons.set(speed, control);
      speedControls.append(control);
    }
    this.#stats.append(this.#lives, this.#money, this.#score, this.#wave, this.#remaining);
    this.#waveIntel.append(this.#waveTitle, this.#composition, this.#countdown);
    this.element.append(
      this.#stats,
      this.#waveIntel,
      this.#waveButton,
      this.#pauseButton,
      speedControls,
      this.#audio.element,
    );
  }

  render(view: HudView, audio: AudioSettingsView): void {
    this.#audio.render(audio);
    const signature = [
      view.visible,
      view.lives,
      view.money,
      view.score,
      view.wave,
      view.totalWaves,
      view.enemiesRemaining,
      view.waveInProgress,
      Math.ceil(view.countdown),
      view.canStartWave,
      view.earlyStartBonus,
      view.nextWaveTitle,
      view.nextWaveComposition,
      view.speed,
      view.paused,
    ].join("|");
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.hidden = !view.visible;
    this.#lives.textContent = `Lives: ${view.lives}`;
    this.#money.textContent = `Gold: ${view.money}`;
    this.#score.textContent = `Score: ${view.score}`;
    this.#wave.textContent = `Wave: ${view.wave}/${view.totalWaves}`;
    this.#remaining.textContent = `Enemies: ${view.enemiesRemaining}`;
    this.#waveTitle.textContent = view.nextWaveTitle;
    this.#composition.textContent = view.nextWaveComposition;
    this.#countdown.textContent = view.canStartWave
      ? `Next wave in ${Math.ceil(view.countdown)}s`
      : view.waveInProgress
        ? "Wave in progress"
        : "";
    this.#waveButton.disabled = !view.canStartWave;
    this.#waveButton.textContent = view.canStartWave
      ? view.earlyStartBonus > 0
        ? `Start wave early · +${view.earlyStartBonus}`
        : "Start wave"
      : view.waveInProgress
        ? "Wave in progress"
        : "Campaign complete";
    this.#pauseButton.textContent = view.paused ? "Continue" : "Pause";
    for (const [speed, control] of this.#speedButtons) {
      control.classList.toggle("is-selected", speed === view.speed);
      control.setAttribute("aria-pressed", String(speed === view.speed));
    }
  }
}
