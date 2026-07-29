export interface GameKeyEvent {
  readonly phase: "down" | "up";
  readonly code: string;
  readonly repeat: boolean;
  readonly alt: boolean;
  readonly control: boolean;
  readonly shift: boolean;
}

export class KeyboardInputAdapter {
  readonly #target: Window;
  readonly #handler: (event: GameKeyEvent) => void;
  constructor(target: Window, handler: (event: GameKeyEvent) => void) {
    this.#target = target;
    this.#handler = handler;
    target.addEventListener("keydown", this.#down);
    target.addEventListener("keyup", this.#up);
  }
  destroy(): void {
    this.#target.removeEventListener("keydown", this.#down);
    this.#target.removeEventListener("keyup", this.#up);
  }
  readonly #down = (event: KeyboardEvent): void => this.#forward("down", event);
  readonly #up = (event: KeyboardEvent): void => this.#forward("up", event);
  #forward(phase: "down" | "up", event: KeyboardEvent): void {
    this.#handler(Object.freeze({
      phase, code: event.code, repeat: event.repeat,
      alt: event.altKey, control: event.ctrlKey, shift: event.shiftKey,
    }));
  }
}
