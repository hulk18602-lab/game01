import type {
  CommandDispatcher,
  DifficultyOptionView,
  OverlayView,
} from "./contracts.js";
import { button, element } from "./dom.js";

export class GameOverlays {
  readonly element = element("div", "game-ui__overlay");
  readonly #dispatch: CommandDispatcher;
  readonly #eyebrow = element("span", "game-ui__eyebrow", "RIVER OUTPOST");
  readonly #title = element("h1");
  readonly #detail = element("p", "game-ui__overlay-detail");
  readonly #best = element("p", "game-ui__best-score");
  readonly #controls = element("div", "game-ui__overlay-controls");
  readonly #newGame: HTMLButtonElement;
  readonly #resumeSave: HTMLButtonElement;
  readonly #tutorial: HTMLButtonElement;
  readonly #continue: HTMLButtonElement;
  readonly #playAgain: HTMLButtonElement;
  readonly #menu: HTMLButtonElement;
  readonly #difficultyButtons = new Map<string, HTMLButtonElement>();

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.#newGame = button("New Game", () => this.#dispatch({ type: "open-difficulty" }));
    this.#newGame.classList.add("game-ui__button--hero");
    this.#resumeSave = button("Resume saved defense", () => this.#dispatch({ type: "continue-game" }));
    this.#tutorial = button("Begin defense", () => this.#dispatch({ type: "complete-tutorial" }));
    this.#tutorial.classList.add("game-ui__button--hero");
    this.#continue = button("Continue", () => this.#dispatch({ type: "toggle-pause" }));
    this.#playAgain = button("Play again", () => this.#dispatch({ type: "restart-game" }));
    this.#menu = button("Main menu", () => this.#dispatch({ type: "return-menu" }));
    this.#controls.append(
      this.#newGame,
      this.#resumeSave,
      this.#tutorial,
      this.#continue,
      this.#playAgain,
      this.#menu,
    );
    const panel = element("section", "game-ui__overlay-panel");
    panel.append(this.#eyebrow, this.#title, this.#detail, this.#best, this.#controls);
    this.element.append(panel);
  }

  render(view: OverlayView): void {
    this.element.hidden = view.kind === "none";
    this.#hideControls();
    this.#eyebrow.hidden = false;
    this.#best.hidden = true;
    if (view.kind === "none") return;

    if (view.kind === "menu") {
      this.#title.textContent = "River Outpost";
      this.#detail.textContent = "A compact twelve-wave fantasy tower defense campaign.";
      this.#newGame.hidden = false;
      this.#resumeSave.hidden = false;
      this.#resumeSave.disabled = !view.continueAvailable;
      this.#best.textContent = `Best score: ${view.bestScore}`;
      this.#best.hidden = false;
      return;
    }

    if (view.kind === "difficulty") {
      this.#title.textContent = "Choose difficulty";
      this.#detail.textContent = "Starting resources and enemy strength change; tower balance stays consistent.";
      for (const option of view.options) this.#difficultyControl(option).hidden = false;
      this.#menu.hidden = false;
      return;
    }

    if (view.kind === "tutorial") {
      this.#title.textContent = "Defend the outpost";
      this.#detail.textContent = [
        "1. Select a tower card or press 1–5, then place it on grass.",
        "2. Press Space to launch a wave early and earn bonus Gold.",
        "3. Select towers to upgrade, sell, or change targeting.",
        "P pauses; U upgrades; T cycles targeting; Esc cancels.",
      ].join("\n");
      this.#tutorial.hidden = false;
      this.#menu.hidden = false;
      return;
    }

    if (view.kind === "paused") {
      this.#eyebrow.hidden = true;
      this.#title.textContent = "Paused";
      this.#detail.textContent = "The battlefield is frozen.";
      this.#continue.hidden = false;
      this.#menu.hidden = false;
      return;
    }

    const won = view.kind === "victory";
    this.#title.textContent = won ? "Victory" : "Defeat";
    this.#detail.textContent = won
      ? `All twelve waves defeated. Final score: ${view.score}.`
      : `The outpost fell on wave ${view.wave}. Score: ${view.score}.`;
    if (won) {
      this.#best.textContent = `Best score: ${view.bestScore}`;
      this.#best.hidden = false;
    }
    this.#playAgain.hidden = false;
    this.#menu.hidden = false;
  }

  #difficultyControl(option: DifficultyOptionView): HTMLButtonElement {
    let control = this.#difficultyButtons.get(option.id);
    if (!control) {
      control = button("", () => this.#dispatch({ type: "new-game", difficulty: option.id }));
      control.classList.add("game-ui__difficulty-card");
      this.#difficultyButtons.set(option.id, control);
      this.#controls.insertBefore(control, this.#tutorial);
    }
    control.textContent = `${option.name} — ${option.startingGold} Gold · ${option.lives} Lives`;
    control.title = option.description;
    return control;
  }

  #hideControls(): void {
    this.#newGame.hidden = true;
    this.#resumeSave.hidden = true;
    this.#tutorial.hidden = true;
    this.#continue.hidden = true;
    this.#playAgain.hidden = true;
    this.#menu.hidden = true;
    for (const control of this.#difficultyButtons.values()) control.hidden = true;
  }
}
