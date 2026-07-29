import type { UiMessageView } from "./contracts.js";
import { element } from "./dom.js";

export class StatusMessage {
  readonly element = element("div", "game-ui__message");

  constructor() {
    this.element.setAttribute("role", "status");
    this.element.setAttribute("aria-live", "polite");
    this.element.hidden = true;
  }

  render(message: UiMessageView | null): void {
    this.element.hidden = message === null;
    this.element.textContent = message?.text ?? "";
    this.element.classList.toggle("is-error", message?.kind === "error");
    this.element.classList.toggle("is-success", message?.kind === "success");
  }
}
