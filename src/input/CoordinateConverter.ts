export interface ScreenPoint { readonly x: number; readonly y: number }
export interface WorldPoint { readonly x: number; readonly y: number }

/** Converts browser viewport coordinates into coordinates understood by the game. */
export interface CoordinateConverter {
  screenToWorld(point: ScreenPoint): WorldPoint;
}

/** Useful when the converter is simply a canvas offset/scale transformation. */
export class CanvasCoordinateConverter implements CoordinateConverter {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly worldWidth: number,
    private readonly worldHeight: number,
  ) {}

  screenToWorld(point: ScreenPoint): WorldPoint {
    const bounds = this.canvas.getBoundingClientRect();
    return Object.freeze({
      x: ((point.x - bounds.left) / bounds.width) * this.worldWidth,
      y: ((point.y - bounds.top) / bounds.height) * this.worldHeight,
    });
  }
}
