/** Converts tile coordinates to world pixels. Camera projection stays in rendering. */
export class CoordinateConverter {
  constructor(tileSize, origin = { x: 0, y: 0 }) {
    if (!Number.isFinite(tileSize) || tileSize <= 0) throw new TypeError("tileSize must be positive");
    this.tileSize = tileSize;
    this.origin = Object.freeze({ x: origin.x ?? 0, y: origin.y ?? 0 });
    Object.freeze(this);
  }

  gridToWorld({ x, y }, { center = false } = {}) {
    const offset = center ? 0.5 : 0;
    return { x: this.origin.x + (x + offset) * this.tileSize, y: this.origin.y + (y + offset) * this.tileSize };
  }

  worldToGrid({ x, y }) {
    return { x: Math.floor((x - this.origin.x) / this.tileSize), y: Math.floor((y - this.origin.y) / this.tileSize) };
  }

  gridRect(position) {
    const topLeft = this.gridToWorld(position);
    return { ...topLeft, width: this.tileSize, height: this.tileSize };
  }
}

export default CoordinateConverter;
