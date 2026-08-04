/** Renders build-mode feedback without applying placement rules. */
export class PlacementLayer {
  constructor({ towerRenderer } = {}) {
    this.towerRenderer = towerRenderer ?? null;
  }

  render(context, state) {
    const selected = state.selectedTowerRange;
    if (selected) {
      context.globalAlpha = 0.11;
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.arc(selected.position.x, selected.position.y, selected.range, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.48;
      context.strokeStyle = "#f8fafc";
      context.lineWidth = 2;
      context.stroke();
      context.globalAlpha = 1;
    }

    const preview = state.placementPreview;
    if (!preview) return;

    const accent = preview.valid ? "#22c55e" : "#ef4444";
    const bounds = preview.cellBounds;

    context.globalAlpha = 0.32;
    context.fillStyle = accent;
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    context.globalAlpha = 0.9;
    context.strokeStyle = accent;
    context.lineWidth = 3;
    context.strokeRect(bounds.x + 1.5, bounds.y + 1.5, bounds.width - 3, bounds.height - 3);

    context.globalAlpha = 0.16;
    context.fillStyle = accent;
    context.beginPath();
    context.arc(preview.position.x, preview.position.y, preview.range, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.75;
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.stroke();

    if (this.towerRenderer) {
      context.globalAlpha = 1;
      this.towerRenderer.drawPreview(
        context,
        preview,
        state.visualTime ?? 0,
        state.reducedMotion === true,
      );
    } else {
      context.globalAlpha = 0.58;
      context.fillStyle = preview.color;
      context.beginPath();
      context.arc(preview.position.x, preview.position.y, preview.radius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }
}

export default PlacementLayer;
