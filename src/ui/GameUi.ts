import { BuildPanel } from "./BuildPanel.js";
import type { CommandDispatcher, StateReader, UiSelectors } from "./contracts.js";
import { selectUiView } from "./contracts.js";
import { element } from "./dom.js";
import { EnemyTooltip } from "./EnemyTooltip.js";
import { GameOverlays } from "./GameOverlays.js";
import { Hud } from "./Hud.js";
import { HeroPanel } from "./HeroPanel.js";
import { SelectedTowerPanel } from "./SelectedTowerPanel.js";
import { StatusMessage } from "./StatusMessage.js";

/** Mounts selector-driven UI and contains the state subscription lifecycle. */
export class GameUi<State> {
  readonly element = element("div", "game-ui");
  readonly #hud: Hud;
  readonly #buildPanel: BuildPanel;
  readonly #towerPanel: SelectedTowerPanel;
  readonly #heroPanel: HeroPanel;
  readonly #overlays: GameOverlays;
  readonly #enemyTooltip: EnemyTooltip;
  readonly #message: StatusMessage;
  readonly #reader: StateReader<State>;
  readonly #selectors: UiSelectors<State>;
  #unsubscribe: (() => void) | null = null;

  constructor(reader: StateReader<State>, selectors: UiSelectors<State>, dispatch: CommandDispatcher) {
    this.#reader = reader;
    this.#selectors = selectors;
    this.#hud = new Hud(dispatch);
    this.#buildPanel = new BuildPanel(dispatch);
    this.#towerPanel = new SelectedTowerPanel(dispatch);
    this.#heroPanel = new HeroPanel();
    this.#overlays = new GameOverlays(dispatch);
    this.#enemyTooltip = new EnemyTooltip();
    this.#message = new StatusMessage();
    this.element.append(
      this.#hud.element,
      this.#buildPanel.element,
      this.#towerPanel.element,
      this.#heroPanel.element,
      this.#enemyTooltip.element,
      this.#message.element,
      this.#overlays.element,
    );
  }

  mount(parent: HTMLElement): void {
    if (this.#unsubscribe) return;
    parent.append(this.element);
    this.#unsubscribe = this.#reader.subscribe(() => this.render());
    this.render();
  }

  unmount(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.element.remove();
  }

  render(): void {
    const view = selectUiView(this.#reader.getState(), this.#selectors);
    this.#hud.render(view.hud, view.audio);
    this.#buildPanel.render(view.buildOptions, view.selectedBuildType, view.hud.visible);
    this.#towerPanel.render(view.selectedTower);
    this.#heroPanel.render(view.hero);
    this.#enemyTooltip.render(view.enemyTooltip);
    this.#message.render(view.message);
    this.#overlays.render(view.overlay, view.audio);
  }
}
