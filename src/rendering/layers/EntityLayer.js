export class EntityLayer {
  render(context, state) {
    const entities = state.entities ?? [];
    const enemiesById = new Map(
      entities.filter((entity) => entity.kind === "enemy").map((enemy) => [enemy.id, enemy]),
    );

    for (const entity of entities) {
      if (entity.visible === false) continue;
      const position = entity.position;
      if (!position) continue;
      const radius = entity.radius ?? 14;
      context.fillStyle = entity.color ?? "#f4f1de";
      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fill();

      if (entity.kind === "tower") {
        const target = enemiesById.get(entity.targetId);
        const angle = target
          ? Math.atan2(target.position.y - position.y, target.position.x - position.x)
          : -Math.PI / 2;
        context.strokeStyle = "#1e293b";
        context.lineWidth = 6;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(
          position.x + Math.cos(angle) * Math.max(5, radius * 0.4),
          position.y + Math.sin(angle) * Math.max(5, radius * 0.4),
        );
        context.lineTo(
          position.x + Math.cos(angle) * (radius + 10),
          position.y + Math.sin(angle) * (radius + 10),
        );
        context.stroke();
      }

      if (entity.kind === "enemy" && Number.isFinite(entity.maxHealth) && entity.maxHealth > 0) {
        const ratio = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
        const width = Math.max(28, radius * 2.4);
        const height = 5;
        const x = position.x - width / 2;
        const y = position.y - radius - 12;
        context.fillStyle = "rgba(15, 23, 42, .9)";
        context.fillRect(x - 1, y - 1, width + 2, height + 2);
        context.fillStyle = ratio > 0.6 ? "#22c55e" : ratio > 0.3 ? "#eab308" : "#ef4444";
        context.fillRect(x, y, width * ratio, height);
      }

      if (entity.label) {
        context.fillStyle = entity.labelColor ?? "#111";
        context.textAlign = "center";
        context.fillText(entity.label, position.x, position.y - radius - 5);
      }
    }
  }
}

export default EntityLayer;
