export class EntityLayer {
  constructor({ monsterRenderer } = {}) {
    this.monsterRenderer = monsterRenderer ?? null;
  }

  render(context, state) {
    if (state.runtimeTowers || state.enemies || state.projectiles) {
      const enemies = state.enemies ?? [];
      const time = state.visualTime ?? 0;
      const reducedMotion = state.reducedMotion === true;
      for (const tower of state.runtimeTowers ?? []) {
        this.drawTower(context, tower, enemies, time, reducedMotion);
      }
      if (this.monsterRenderer) this.monsterRenderer.render(context, enemies, time, reducedMotion);
      else for (const enemy of enemies) this.drawEnemy(context, enemy, time, reducedMotion);
      for (const projectile of state.projectiles ?? []) this.drawProjectile(context, projectile, time);
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

  drawTower(context, tower, enemies, time, reducedMotion) {
    const { position } = tower;
    const radius = tower.radius ?? 18;
    const target = enemies.find((enemy) => enemy.id === tower.targetId);
    const towerSeed = Number.parseInt(tower.id.replace(/\D/g, ""), 10) || 1;
    const angle = target
      ? Math.atan2(target.position.y - position.y, target.position.x - position.x)
      : -Math.PI / 2 + (reducedMotion ? 0 : Math.sin(time * 0.7 + towerSeed) * 0.55);

    context.save();
    context.translate(position.x, position.y);
    if (tower.auraBuffed) {
      context.fillStyle = "rgba(250, 204, 21, .13)";
      context.strokeStyle = "rgba(253, 224, 71, .9)";
      context.lineWidth = 2.5;
      context.shadowColor = "#facc15";
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(0, 0, radius + 8, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
    }
    context.fillStyle = "rgba(15, 23, 42, .42)";
    context.beginPath();
    context.ellipse(2, radius * 0.55, radius + 6, radius * 0.7, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = tower.level === 2 ? "#fbbf24" : tower.level === 1 ? "#cbd5e1" : "#475569";
    context.beginPath();
    context.arc(0, 0, radius + 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = tower.level === 2 ? "#fff0a6" : tower.level === 1 ? "#f8fafc" : "#263343";
    context.lineWidth = tower.level + 1;
    context.beginPath();
    context.arc(0, 0, radius - 1, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = tower.color ?? "#60a5fa";

    if (tower.type === "rapid") {
      context.fillRect(-radius * 0.7, -radius * 0.55, radius * 1.4, radius * 1.1);
    } else if (tower.type === "frost") {
      context.save();
      if (!reducedMotion) context.rotate(time * 0.9 + towerSeed);
      this.polygon(context, 6, radius, Math.PI / 6);
      context.fill();
      context.strokeStyle = "#ecfeff";
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    } else if (tower.type === "cannon") {
      context.beginPath();
      context.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      context.fill();
    } else if (tower.type === "sniper") {
      context.rotate(Math.PI / 4);
      context.fillRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44);
      context.rotate(-Math.PI / 4);
    } else if (tower.type === "tesla") {
      this.polygon(context, 3, radius, -Math.PI / 2);
      context.fill();
      context.strokeStyle = "#fef9c3";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
      context.stroke();
    } else if (tower.type === "poison") {
      context.beginPath();
      context.ellipse(0, 1, radius * 0.78, radius, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#bbf7d0";
      context.beginPath();
      context.arc(-5, -5, 3, 0, Math.PI * 2);
      context.arc(5, 2, 2.5, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
      context.fill();
    }

    for (let marker = 0; marker <= tower.level; marker += 1) {
      const markerAngle = Math.PI * 0.7 + marker * 0.52;
      context.fillStyle = tower.level === 2 ? "#fff3b0" : "#dbeafe";
      context.beginPath();
      context.arc(
        Math.cos(markerAngle) * (radius - 3),
        Math.sin(markerAngle) * (radius - 3),
        2.2,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    context.rotate(angle);
    context.strokeStyle = "#172033";
    context.lineCap = "round";
    context.lineWidth = tower.type === "cannon" ? 10 : tower.type === "sniper" ? 5 : 6;
    const barrelLength = tower.type === "sniper" ? radius + 20 : radius + 11;
    const barrelCount = tower.type === "rapid" ? 2 : 1;
    for (let barrel = 0; barrel < barrelCount; barrel += 1) {
      const offset = barrelCount === 1 ? 0 : barrel === 0 ? -4 : 4;
      context.beginPath();
      context.moveTo(radius * 0.25, offset);
      context.lineTo(barrelLength, offset);
      context.stroke();
    }
    context.fillStyle = tower.type === "frost" ? "#cffafe" : tower.type === "cannon" ? "#fdba74" : "#94a3b8";
    context.beginPath();
    context.arc(barrelLength, 0, tower.type === "cannon" ? 6 : 3.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (tower.auraBuffed) {
      context.save();
      context.translate(position.x, position.y - radius - 12);
      context.fillStyle = "#facc15";
      context.strokeStyle = "#713f12";
      context.lineWidth = 1.5;
      this.polygon(context, 4, 6, Math.PI / 4);
      context.fill();
      context.stroke();
      context.fillStyle = "#422006";
      context.font = "900 8px system-ui";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("↑", 0, 1);
      context.restore();
    }
  }

  drawEnemy(context, enemy, time, reducedMotion) {
    if (!enemy.position) return;
    const { position } = enemy;
    const radius = enemy.radius ?? 12;
    const bob = reducedMotion ? 0 : Math.sin((enemy.progress ?? 0) * 70 + time * 7) * 1.5;
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
    if (enemy.type === "runner" || enemy.type === "eliteRunner") {
      context.moveTo(radius, 0);
      context.lineTo(-radius * 0.75, -radius * 0.72);
      context.lineTo(-radius * 0.45, 0);
      context.lineTo(-radius * 0.75, radius * 0.72);
      context.closePath();
    } else if (enemy.type === "tank") {
      this.polygon(context, 6, radius, Math.PI / 6);
    } else if (enemy.type === "armored") {
      this.polygon(context, 6, radius, 0);
    } else if (enemy.type === "shielded") {
      this.polygon(context, 4, radius, Math.PI / 4);
    } else if (enemy.type === "splitter") {
      this.polygon(context, 4, radius, 0);
    } else if (enemy.type === "arcaneSentinel") {
      this.polygon(context, 6, radius, Math.PI / 6);
    } else if (enemy.type === "stormLancer") {
      this.polygon(context, 3, radius, 0);
    } else if (enemy.type === "boss") {
      this.polygon(context, 8, radius, reducedMotion ? 0 : time * 0.35);
    } else if (enemy.type === "archonBoss") {
      this.polygon(context, 10, radius, reducedMotion ? 0 : -time * 0.24);
    } else {
      context.arc(0, 0, radius, 0, Math.PI * 2);
    }
    context.fill();
    context.stroke();

    if (enemy.type === "runner" || enemy.type === "eliteRunner") {
      context.strokeStyle = "#fef3c7";
      context.lineWidth = 2;
      const stride = reducedMotion ? 0 : Math.sin(time * 13 + (enemy.progress ?? 0) * 80) * 4;
      context.beginPath();
      context.moveTo(-radius * 0.35, radius * 0.45);
      context.lineTo(-radius * 0.6 + stride, radius * 0.95);
      context.moveTo(radius * 0.05, radius * 0.42);
      context.lineTo(radius * 0.3 - stride, radius * 0.92);
      context.stroke();
    } else if (enemy.type === "tank") {
      context.fillStyle = "#f8fafc";
      for (let rivet = 0; rivet < 3; rivet += 1) {
        context.beginPath();
        context.arc(-radius * 0.42 + rivet * radius * 0.42, -radius * 0.35, 1.7, 0, Math.PI * 2);
        context.fill();
      }
    } else if (enemy.type === "armored") {
      context.strokeStyle = "rgba(241, 245, 249, .75)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-radius * 0.62, -radius * 0.18);
      context.lineTo(0, -radius * 0.62);
      context.lineTo(radius * 0.62, -radius * 0.18);
      context.stroke();
    } else if (enemy.type === "regenerator") {
      context.strokeStyle = "#dcfce7";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-radius * 0.45, 0);
      context.lineTo(radius * 0.45, 0);
      context.moveTo(0, -radius * 0.45);
      context.lineTo(0, radius * 0.45);
      context.stroke();
    } else if (enemy.type === "boss" || enemy.type === "archonBoss") {
      context.strokeStyle = "#f5d0fe";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, radius * 0.64, 0, Math.PI * 2);
      context.stroke();
    } else if (enemy.type === "swarm") {
      context.strokeStyle = "#fff1f2";
      context.lineWidth = 1.5;
      context.beginPath();
      context.ellipse(-radius * 0.75, 0, radius * 0.55, radius * 0.3, -0.4, 0, Math.PI * 2);
      context.ellipse(radius * 0.75, 0, radius * 0.55, radius * 0.3, 0.4, 0, Math.PI * 2);
      context.stroke();
    } else if (enemy.type === "shielded") {
      context.strokeStyle = "#bae6fd";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, radius + 3, Math.PI * 0.15, Math.PI * 1.85);
      context.stroke();
    } else if (enemy.type === "splitter") {
      context.strokeStyle = "#fae8ff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -radius * 0.65);
      context.lineTo(0, radius * 0.65);
      context.stroke();
    }

    if (enemy.elite) {
      context.strokeStyle = "#fde68a";
      context.lineWidth = enemy.boss ? 3 : 2;
      context.setLineDash([4, 3]);
      context.beginPath();
      context.arc(0, 0, radius + 5, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }

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

  drawProjectile(context, projectile, time) {
    if (!projectile.position) return;
    context.save();
    context.translate(projectile.position.x, projectile.position.y);
    context.shadowBlur = 10;
    context.shadowColor = projectile.color ?? "#f8fafc";
    context.fillStyle = projectile.color ?? "#f8fafc";
    if (projectile.projectileType === "arrow") {
      context.rotate(projectile.rotation ?? 0);
      context.shadowBlur = 4;
      context.strokeStyle = projectile.color ?? "#f5d68a";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-12, 0);
      context.lineTo(8, 0);
      context.stroke();
      context.fillStyle = "#e2e8f0";
      context.beginPath();
      context.moveTo(10, 0);
      context.lineTo(4, -4);
      context.lineTo(5, 4);
      context.closePath();
      context.fill();
      context.strokeStyle = "#86efac";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(-10, 0);
      context.lineTo(-15, -4);
      context.moveTo(-10, 0);
      context.lineTo(-15, 4);
      context.stroke();
    } else if (projectile.damageType === "electric") {
      context.strokeStyle = projectile.color ?? "#fde047";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-10, -2);
      context.lineTo(-3, 3);
      context.lineTo(1, -4);
      context.lineTo(8, 1);
      context.stroke();
    } else if (projectile.damageType === "poison") {
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#dcfce7";
      context.beginPath();
      context.arc(-2, -2, 1.5, 0, Math.PI * 2);
      context.fill();
    } else if (projectile.damageType === "cold") {
      context.rotate(time * 5);
      context.beginPath();
      context.moveTo(0, -7);
      context.lineTo(4, 0);
      context.lineTo(0, 7);
      context.lineTo(-4, 0);
      context.closePath();
      context.fill();
    } else if ((projectile.areaRadius ?? 0) > 0) {
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fff7ed";
      context.lineWidth = 2;
      context.stroke();
    } else if (projectile.damage >= 80) {
      context.strokeStyle = projectile.color ?? "#f8fafc";
      context.lineWidth = 3;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-10, 0);
      context.lineTo(5, 0);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(0, 0, projectile.radius ?? 4, 0, Math.PI * 2);
      context.fill();
    }
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
    if ((enemy.maxShield ?? 0) > 0 && enemy.shield > 0) {
      const shieldRatio = Math.max(0, Math.min(1, enemy.shield / enemy.maxShield));
      context.fillStyle = "rgba(15, 23, 42, .9)";
      context.fillRect(x - 1, y - 6, width + 2, 4);
      context.fillStyle = "#38bdf8";
      context.fillRect(x, y - 5, width * shieldRatio, 2);
    }
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
