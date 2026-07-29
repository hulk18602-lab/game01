import type { CoordinateConverter, WorldPoint } from "./CoordinateConverter.js";

export type GamePointerEvent = {
  readonly phase: "down" | "move" | "up" | "cancel";
  readonly position: WorldPoint;
  readonly pointerId: number;
  readonly button: number;
  readonly buttons: number;
  readonly pointerType: string;
};

export type PointerHandler = (event: GamePointerEvent) => void;

/** Browser adapter; every pointer event is converted before entering the game. */
export class PointerInputAdapter {
  readonly #target: HTMLElement;
  readonly #converter: CoordinateConverter;
  readonly #handler: PointerHandler;
  readonly #listeners: ReadonlyArray<readonly [keyof HTMLElementEventMap, EventListener]>;

  constructor(target: HTMLElement, converter: CoordinateConverter, handler: PointerHandler) {
    this.#target = target;
    this.#converter = converter;
    this.#handler = handler;
    this.#listeners = (["pointerdown", "pointermove", "pointerup", "pointercancel"] as const).map(
      (name) => [name, ((event: PointerEvent) => this.#forward(name, event)) as EventListener] as const,
    );
    for (const [name, listener] of this.#listeners) target.addEventListener(name, listener);
  }

  destroy(): void {
    for (const [name, listener] of this.#listeners) this.#target.removeEventListener(name, listener);
  }

  #forward(name: string, event: PointerEvent): void {
    const phase = name.slice(7) as GamePointerEvent["phase"];
    const position = this.#converter.screenToWorld({ x: event.clientX, y: event.clientY });
    this.#handler(Object.freeze({
      phase,
      position,
      pointerId: event.pointerId,
      button: event.button,
      buttons: event.buttons,
      pointerType: event.pointerType,
    }));
  }
}
