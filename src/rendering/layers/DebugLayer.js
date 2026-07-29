export class DebugLayer {
  constructor({ grid, converter, enabled = false } = {}) {
    this.grid = grid;
    this.converter = converter;
    this.enabled = enabled;
  }

  render(context, state) {
    if (!(state.debug?.enabled ?? this.enabled)) return;
    if (this.grid && this.converter) {
      context.strokeStyle = state.debug?.gridColor ?? "rgba(255,255,255,.25)";
      context.lineWidth = 1;
      this.grid.forEach((_tile, point) => {
        const rect = this.converter.gridRect(point);
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });
    }
    for (const point of state.debug?.points ?? []) {
      context.fillStyle = point.color ?? "#ff3b30";
      context.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
  }
}

export default DebugLayer;
