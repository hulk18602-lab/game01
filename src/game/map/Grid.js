/** A read-only view of rectangular map data used by game systems. */
export class Grid {
  constructor({ width, height, layout, legend }) {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new TypeError("Grid width and height must be positive integers");
    }
    if (!Array.isArray(layout) || layout.length !== height || layout.some((row) => row.length !== width)) {
      throw new RangeError("Grid layout dimensions do not match width and height");
    }
    this.width = width;
    this.height = height;
    this._layout = Object.freeze([...layout]);
    this._legend = legend;
    Object.freeze(this);
  }

  contains(positionOrX, y) {
    const x = typeof positionOrX === "object" ? positionOrX.x : positionOrX;
    const row = typeof positionOrX === "object" ? positionOrX.y : y;
    return Number.isInteger(x) && Number.isInteger(row) && x >= 0 && row >= 0 && x < this.width && row < this.height;
  }

  tileAt(positionOrX, y) {
    const x = typeof positionOrX === "object" ? positionOrX.x : positionOrX;
    const row = typeof positionOrX === "object" ? positionOrX.y : y;
    if (!this.contains(x, row)) return undefined;
    const symbol = this._layout[row][x];
    const definition = this._legend[symbol];
    if (!definition) throw new Error(`Unknown tile symbol "${symbol}" at ${x},${row}`);
    return definition;
  }

  isWalkable(positionOrX, y) {
    return this.tileAt(positionOrX, y)?.walkable === true;
  }

  movementCost(positionOrX, y) {
    const tile = this.tileAt(positionOrX, y);
    return tile?.walkable ? (tile.movementCost ?? 1) : Infinity;
  }

  neighbors(position, { diagonals = false } = {}) {
    const offsets = diagonals
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return offsets
      .map(([dx, dy]) => Object.freeze({ x: position.x + dx, y: position.y + dy }))
      .filter((point) => this.isWalkable(point));
  }

  forEach(callback) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) callback(this.tileAt(x, y), Object.freeze({ x, y }));
    }
  }
}

export default Grid;
