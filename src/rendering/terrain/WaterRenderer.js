export class WaterRenderer {
  drawStatic(context, plan) {
    const { colors } = plan.biome;
    const liquidPositions = new Set(plan.liquids.map((cell) => `${cell.position.x},${cell.position.y}`));
    context.lineCap = "round"; context.lineJoin = "round";
    for (const { rect, position, tile } of plan.liquids) {
      const special = tile.id === "lava" || tile.id === "void-rift";
      const cx = rect.x + rect.width / 2; const cy = rect.y + rect.height / 2;
      context.strokeStyle = special ? colors.dark : colors.water; context.lineWidth = rect.width * .84;
      context.beginPath(); context.moveTo(cx, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (liquidPositions.has(`${position.x + dx},${position.y + dy}`)) { context.lineTo(cx + dx * rect.width * .55, cy + dy * rect.height * .55); context.moveTo(cx, cy); }
      context.stroke();
      context.fillStyle = colors.water; context.globalAlpha = .88; context.beginPath(); context.ellipse(cx, cy, rect.width * .38, rect.height * .4, 0, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
      context.strokeStyle = `${colors.accent}66`; context.lineWidth = 2; context.beginPath(); context.arc(cx, cy, rect.width * .36, Math.PI * .12, Math.PI * .9); context.stroke();
    }
  }

  drawAmbient(context, plan, time) {
    context.save(); context.lineCap = "round";
    plan.liquids.forEach(({ rect, tile }, index) => {
      context.save(); context.beginPath(); context.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width * .39, rect.height * .41, 0, 0, Math.PI * 2); context.clip();
      for (let line = 0; line < 2; line += 1) {
        const phase = time * (tile.id === "lava" ? .7 : 1.1) + index * .63 + line * 2.4;
        const y = rect.y + 15 + line * 19 + Math.sin(phase) * 2;
        context.strokeStyle = `${plan.biome.colors.accent}${tile.id === "void-rift" ? "88" : "66"}`; context.lineWidth = line + 1;
        context.beginPath(); context.moveTo(rect.x - 5, y); context.bezierCurveTo(rect.x + 10, y - 4, rect.x + 25, y + 4, rect.x + 53, y - 1); context.stroke();
      }
      context.restore();
    });
    context.restore();
  }
}
