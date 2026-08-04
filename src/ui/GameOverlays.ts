import type {
  CommandDispatcher,
  DifficultyOptionView,
  AudioSettingsView,
  LevelOptionView,
  OverlayView,
} from "./contracts.js";
import { AudioControls } from "./AudioControls.js";
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
  readonly #nextLevel: HTMLButtonElement;
  readonly #newCampaign: HTMLButtonElement;
  readonly #levelSelect: HTMLButtonElement;
  readonly #menu: HTMLButtonElement;
  readonly #difficultyButtons = new Map<string, HTMLButtonElement>();
  readonly #levelButtons = new Map<string, HTMLButtonElement>();
  readonly #audio: AudioControls;
  #nextLevelId: LevelOptionView["id"] | null = null;
  #signature = "";

  constructor(dispatch: CommandDispatcher) {
    this.#dispatch = dispatch;
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.#newGame = button("New Game", () => this.#dispatch({ type: "open-level-select" }));
    this.#newGame.classList.add("game-ui__button--hero");
    this.#resumeSave = button("Resume saved defense", () => this.#dispatch({ type: "continue-game" }));
    this.#tutorial = button("Begin defense", () => this.#dispatch({ type: "complete-tutorial" }));
    this.#tutorial.classList.add("game-ui__button--hero");
    this.#continue = button("Continue", () => this.#dispatch({ type: "toggle-pause" }));
    this.#playAgain = button("Replay", () => this.#dispatch({ type: "restart-game" }));
    this.#playAgain.setAttribute("aria-label", "Play again");
    this.#nextLevel = button("Next level", () => {
      if (this.#nextLevelId) {
        this.#dispatch({ type: "next-level", levelId: this.#nextLevelId });
      }
    });
    this.#newCampaign = button("New campaign", () => this.#dispatch({ type: "new-campaign" }));
    this.#levelSelect = button(
      "Level select",
      () => this.#dispatch({ type: "return-level-select" }),
    );
    this.#menu = button("Main menu", () => this.#dispatch({ type: "return-menu" }));
    this.#audio = new AudioControls(dispatch);
    this.#controls.append(
      this.#newGame,
      this.#resumeSave,
      this.#tutorial,
      this.#continue,
      this.#playAgain,
      this.#nextLevel,
      this.#newCampaign,
      this.#levelSelect,
      this.#menu,
    );
    const panel = element("section", "game-ui__overlay-panel");
    panel.append(this.#eyebrow, this.#title, this.#detail, this.#best, this.#controls, this.#audio.element);
    this.element.append(panel);
  }

  render(view: OverlayView, audio: AudioSettingsView): void {
    this.#audio.render(audio);
    let signature = view.kind;
    if (view.kind === "menu") signature += `|${view.continueAvailable}|${view.bestScore}`;
    if (view.kind === "difficulty") {
      for (const option of view.options) {
        signature += `|${option.id}:${option.startingGold}:${option.lives}`;
      }
    }
    if (view.kind === "level-select") {
      for (const option of view.options) {
        signature += `|${option.id}:${option.unlocked}:${option.completed}:${option.bestScore}:${option.bestDifficulty}`;
      }
    }
    if (view.kind === "victory") {
      signature += `|${view.score}|${view.bestScore}|${view.levelName}|${view.totalWaves}|${view.nextLevelId}|${view.campaignCompleted}`;
    }
    if (view.kind === "defeat") signature += `|${view.wave}|${view.score}`;
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.dataset.state = view.kind;
    this.element.hidden = view.kind === "none";
    this.#hideControls();
    this.#eyebrow.hidden = false;
    this.#best.hidden = true;
    if (view.kind === "none") return;

    if (view.kind === "menu") {
      this.#title.textContent = "River Outpost";
      this.#detail.textContent = "A colorful multi-level fantasy tower defense campaign.";
      this.#newGame.hidden = false;
      this.#resumeSave.hidden = false;
      this.#resumeSave.disabled = !view.continueAvailable;
      this.#best.textContent = `Best score: ${view.bestScore}`;
      this.#best.hidden = false;
      return;
    }

    if (view.kind === "level-select") {
      this.#title.textContent = "Select level";
      this.#detail.textContent = "Complete campaign chapters to unlock the next battlefield.";
      for (const option of view.options) this.#levelControl(option).hidden = false;
      this.#menu.hidden = false;
      return;
    }

    if (view.kind === "difficulty") {
      this.#title.textContent = "Choose difficulty";
      this.#detail.textContent = "Starting resources and enemy strength change; tower balance stays consistent.";
      for (const option of view.options) this.#difficultyControl(option).hidden = false;
      this.#levelSelect.hidden = false;
      this.#menu.hidden = false;
      return;
    }

    if (view.kind === "tutorial") {
      this.#title.textContent = "Defend the outpost";
      this.#detail.textContent = [
        "1. Select a tower card or press its number key, then place it on grass.",
        "2. Press Space to launch a wave early and earn bonus Gold.",
        "3. Select towers to upgrade, sell, or change targeting.",
        "P pauses; U upgrades; T cycles targeting; Esc cancels.",
      ].join("\n");
      this.#tutorial.hidden = false;
      this.#levelSelect.hidden = false;
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
    this.#title.textContent = won && view.campaignCompleted ? "Campaign completed" : won ? "Victory" : "Defeat";
    this.#detail.textContent = won
      ? `${view.levelName}: all ${view.totalWaves} waves defeated. Final score: ${view.score}.`
      : `The outpost fell on wave ${view.wave}. Score: ${view.score}.`;
    if (won) {
      this.#best.textContent = `Best score: ${view.bestScore}`;
      this.#best.hidden = false;
    }
    this.#playAgain.hidden = false;
    this.#levelSelect.hidden = false;
    if (won && view.nextLevelId) {
      this.#nextLevelId = view.nextLevelId;
      this.#nextLevel.hidden = false;
    }
    if (won && view.campaignCompleted) this.#newCampaign.hidden = false;
    this.#menu.hidden = false;
  }

  #levelControl(option: LevelOptionView): HTMLButtonElement {
    let control = this.#levelButtons.get(option.id);
    if (!control) {
      control = button("", () => this.#dispatch({ type: "select-level", levelId: option.id }));
      control.classList.add("game-ui__level-card");
      this.#levelButtons.set(option.id, control);
      this.#controls.insertBefore(control, this.#tutorial);
    }
    const progress = option.completed ? "Completed" : "Not completed";
    const difficulty = option.bestDifficulty ? ` · Best difficulty ${option.bestDifficulty}` : "";
    control.textContent = option.unlocked
      ? `Play Level ${option.number} — ${option.name} · Best ${option.bestScore} · ${progress}${difficulty}`
      : `Level ${option.number} — ${option.name} · Locked`;
    control.disabled = !option.unlocked;
    control.title = option.description;
    control.setAttribute(
      "aria-label",
      option.unlocked
        ? `Play Level ${option.number} — ${option.name}`
        : `Level ${option.number} — ${option.name} locked`,
    );
    return control;
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
    this.#nextLevel.hidden = true;
    this.#newCampaign.hidden = true;
    this.#levelSelect.hidden = true;
    this.#menu.hidden = true;
    this.#nextLevelId = null;
    for (const control of this.#difficultyButtons.values()) control.hidden = true;
    for (const control of this.#levelButtons.values()) control.hidden = true;
  }
}
