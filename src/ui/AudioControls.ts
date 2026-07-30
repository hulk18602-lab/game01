import type { AudioSettingsView, CommandDispatcher } from "./contracts.js";
import { button, element } from "./dom.js";

const range = (labelText: string, dispatch: (value: number) => void): HTMLLabelElement => {
  const label = element("label", "game-ui__audio-range");
  const title = element("span", undefined, labelText);
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.01";
  input.setAttribute("aria-label", `${labelText} volume`);
  input.addEventListener("input", () => dispatch(Number(input.value)));
  label.append(title, input);
  return label;
};

export class AudioControls {
  readonly element = element("section", "game-ui__audio");
  readonly #toggle: HTMLButtonElement;
  readonly #music: HTMLInputElement | null;
  readonly #sfx: HTMLInputElement | null;
  #enabled = true;
  #signature = "";

  constructor(dispatch: CommandDispatcher, compact = false) {
    this.element.setAttribute("aria-label", "Sound settings");
    this.element.classList.toggle("game-ui__audio--compact", compact);
    this.#toggle = button("Sound on", () => dispatch({ type: "set-audio", enabled: !this.#enabled }));
    this.#toggle.classList.add("game-ui__audio-toggle");
    this.element.append(this.#toggle);
    if (compact) {
      this.#music = null;
      this.#sfx = null;
      return;
    }
    const musicLabel = range("Music", (musicVolume) => dispatch({ type: "set-audio", musicVolume }));
    const sfxLabel = range("Effects", (sfxVolume) => dispatch({ type: "set-audio", sfxVolume }));
    this.#music = musicLabel.querySelector("input");
    this.#sfx = sfxLabel.querySelector("input");
    this.element.append(musicLabel, sfxLabel);
  }

  render(view: AudioSettingsView): void {
    const signature = `${view.enabled}|${view.musicVolume.toFixed(2)}|${view.sfxVolume.toFixed(2)}`;
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.#enabled = view.enabled;
    this.#toggle.textContent = view.enabled ? "Sound on" : "Sound off";
    this.#toggle.setAttribute("aria-pressed", String(view.enabled));
    this.#toggle.classList.toggle("is-selected", view.enabled);
    if (this.#music && this.#music.value !== String(view.musicVolume)) {
      this.#music.value = String(view.musicVolume);
    }
    if (this.#sfx && this.#sfx.value !== String(view.sfxVolume)) {
      this.#sfx.value = String(view.sfxVolume);
    }
  }
}

export default AudioControls;
