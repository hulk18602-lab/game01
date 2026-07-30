export class EntityLayer {
  render(context, state) {
    if (state.runtimeTowers || state.enemies || state.projectiles) {
      const enemies = state.enemies ?? [];
      for (const tower of state.runtimeTowers ?? []) this.drawTower(context, tower, enemies);
      for (const enemy of enemies) this.drawEnemy(context, enemy);
      for (const projectile of state.projectiles ?? []) this.drawProjectile(context, projectile);
      return;
    }

    // Compatibility path for renderer-level consumers and focused unit tests.
    for (const entity of state.entities ?? []) {
      if (entity.visible === false || !entity.position) continue;
      this.drawGeneric(context, entity);
      if (entity.kind === "enemy") {
        this.drawHealthBar(context, entity, entity.position, entity.radius ?? 12);
      }
    }
  }

  drawGeneric(context, entity) {
    const radius = entity.radius ?? 14;
    context.fillStyle = entity.color ?? "#f4f1de";
    context.beginPath();
    context.arc(entity.position.x, entity.position.y, radius, 0, Math.PI * 2);
    context.fill();
    if (entity.label) {
      context.fillStyle = entity.labelColor ?? "#111";
      context.textAlign = "center";
      context.fillText(entity.label, entity.position.x, entity.position.y - radius - 5);
    }
  }

  drawTower(context, tower, enemies) {
    const { position } = tower;
    const radius = tower.radius ?? 18;
    const target = enemies.find((enemy) => enemy.id === tower.targetId);
    const angle = target
      ? Math.atan2(target.position.y - position.y, target.position.x - position.x)
      : -Math.PI / 2;

    context.save();
    context.translate(position.x, position.y);
    context.fillStyle = "rgba(15, 23, 42, .42)";
    context.beginPath();
    context.ellipse(2, radius * 0.55, radius + 6, radius * 0.7, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = tower.level === 2 ? "#fbbf24" : tower.level === 1 ? "#cbd5e1" : "#475569";
    context.beginPath();
    context.arc(0, 0, radius + 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = tower.color ?? "#60a5fa";

    if (tower.type === "rapid") {
      context.fillRect(-radius * 0.7, -radius * 0.55, radius * 1.4, radius * 1.1);
    } else if (tower.type === "frost") {
      this.polygon(context, 6, radius, Math.PI / 6);
      context.fill();
      context.strokeStyle = "#ecfeff";
      context.lineWidth = 2;
      context.stroke();
    } else if (tower.type === "cannon") {
      context.beginPath();
      context.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      context.fill();
    } else if (tower.type === "sniper") {
      context.rotate(Math.PI / 4);
      context.fillRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44);
      context.rotate(-Math.PI / 4);
    } else {
      context.beginPath();
      context.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
      context.fill();
    }

    context.rotate(angle);
    context.strokeStyle = "#172033";
    context.lineCap = "round";
    context.lineWidth = tower.type === "cannon" ? 10 : tower.type === "sniper" ? 5 : 6;
    const barrelLength = tower.type === "sniper" ? radius + 20 : radius + 11;
    const doubleBarrel = tower.type === "rapid";
    for (const offset of doubleBarrel ? [-4, 4] : [0]) {
      context.beginPath();
      context.moveTo(radius * 0.25, offset);
      context.lineTo(barrelLength, offset);
      context.stroke();
    }
    context.restore();
  }

  drawEnemy(context, enemy) {
    if (!enemy.position) return;
    const { position } = enemy;
    const radius = enemy.radius ?? 12;
    const bob = Math.sin((enemy.progress ?? 0) * 70) * 1.5;
    context.save();
    context.translate(position.x, position.y + bob);
    context.fillStyle = "rgba(15, 23, 42, .35)";
    context.beginPath();
    context.ellipse(2, radius * 0.75, radius, radius * 0.55, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = enemy.color ?? "#fb7185";
    context.strokeStyle = "#1e293b";
    context.lineWidth = enemy.type === "armored" ? 4 : 2;
    context.beginPath();
    if (enemy.type === "runner") {
      context.moveTo(radius, 0);
      context.lineTo(-radius * 0.75, -radius * 0.72);
      context.lineTo(-radius * 0.45, 0);
      context.lineTo(-radius * 0.75, radius * 0.72);
      context.closePath();
    } else if (enemy.type === "tank") {
      this.polygon(context, 6, radius, Math.PI / 6);
    } else if (enemy.type === "armored") {
      this.polygon(context, 6, radius, 0);
    } else if (enemy.type === "boss") {
      this.polygon(context, 8, radius, (enemy.progress ?? 0) * Math.PI * 2);
    } else {
      context.arc(0, 0, radius, 0, Math.PI * 2);
    }
    context.fill();
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.font = `bold ${Math.max(10, radius)}px system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(enemy.shortLabel ?? "", 0, 1);
    if ((enemy.statusEffects ?? []).some((effect) => effect.type === "slow")) {
      context.strokeStyle = "#67e8f9";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, radius + 5, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
    this.drawHealthBar(context, enemy, position, radius);
  }

  drawProjectile(context, projectile) {
    if (!projectile.position) return;
    context.save();
    context.shadowBlur = 10;
    context.shadowColor = projectile.color ?? "#f8fafc";
    context.fillStyle = projectile.color ?? "#f8fafc";
    context.beginPath();
    context.arc(projectile.position.x, projectile.position.y, projectile.radius ?? 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawHealthBar(context, enemy, position, radius) {
    if (!Number.isFinite(enemy.maxHealth) || enemy.maxHealth <= 0) return;
    const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    const width = Math.max(28, radius * 2.4);
    const height = enemy.boss ? 7 : 5;
    const x = position.x - width / 2;
    const y = position.y - radius - 12;
    context.fillStyle = "rgba(15, 23, 42, .9)";
    context.fillRect(x - 1, y - 1, width + 2, height + 2);
    context.fillStyle = ratio > 0.6 ? "#22c55e" : ratio > 0.3 ? "#eab308" : "#ef4444";
    context.fillRect(x, y, width * ratio, height);
  }

  polygon(context, sides, radius, rotation) {
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + index * Math.PI * 2 / sides;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }
}

export default EntityLayer;
