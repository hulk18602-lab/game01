export class MapLayer {
  constructor({ grid, converter }) {
    this.grid = grid;
    this.converter = converter;
  }

  render(context, _state, camera) {
    const bounds = camera.visibleBounds();
    const first = this.converter.worldToGrid(bounds);
    const last = this.converter.worldToGrid({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    for (let y = Math.max(0, first.y); y <= Math.min(this.grid.height - 1, last.y); y += 1) {
      for (let x = Math.max(0, first.x); x <= Math.min(this.grid.width - 1, last.x); x += 1) {
        const tile = this.grid.tileAt(x, y);
        const rect = this.converter.gridRect({ x, y });
        context.fillStyle = tile.color ?? "#777";
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
  }
}

export default MapLayer;
