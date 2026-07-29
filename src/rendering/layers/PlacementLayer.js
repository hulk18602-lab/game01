/** Renders build-mode feedback without applying placement rules. */
export class PlacementLayer {
  render(context, state) {
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

    context.globalAlpha = 0.58;
    context.fillStyle = preview.color;
    context.beginPath();
    context.arc(preview.position.x, preview.position.y, preview.radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }
}

export default PlacementLayer;
