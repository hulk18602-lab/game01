export class EntityLayer {
  render(context, state) {
    for (const entity of state.entities ?? []) {
      if (entity.visible === false) continue;
      const position = entity.renderPosition ?? entity.position;
      if (!position) continue;
      const radius = entity.radius ?? 14;
      context.fillStyle = entity.color ?? "#f4f1de";
      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fill();
      if (entity.label) {
        context.fillStyle = entity.labelColor ?? "#111";
        context.textAlign = "center";
        context.fillText(entity.label, position.x, position.y - radius - 5);
      }
    }
  }
}

export default EntityLayer;
