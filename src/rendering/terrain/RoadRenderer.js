import { terrainHash } from "./TerrainRenderPlan.js";

export class RoadRenderer {
  draw(context, plan, grid, tileSize) {
    const { colors } = plan.biome;
    const roadAt = (x, y) => grid.tileAt(x, y)?.id === "road";
    context.lineCap = "round"; context.lineJoin = "round";
    for (const pass of [{ width: tileSize * 0.92, color: colors.shoulder }, { width: tileSize * 0.72, color: colors.road }]) {
      context.strokeStyle = pass.color; context.lineWidth = pass.width;
      for (const { position, rect } of plan.roads) {
        const cx = rect.x + tileSize / 2; const cy = rect.y + tileSize / 2;
        context.beginPath(); context.moveTo(cx, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (roadAt(position.x + dx, position.y + dy)) context.lineTo(cx + dx * tileSize * 0.55, cy + dy * tileSize * 0.55), context.moveTo(cx, cy);
        context.stroke();
      }
    }
    for (const { position, rect } of plan.roads) {
      const cx = rect.x + tileSize / 2; const cy = rect.y + tileSize / 2;
      context.fillStyle = `${colors.light}45`;
      for (let i = 0; i < 3; i += 1) {
        const x = cx + (terrainHash(position.x, position.y, 70 + i) - .5) * tileSize * .55;
        const y = cy + (terrainHash(position.x, position.y, 80 + i) - .5) * tileSize * .55;
        context.beginPath(); context.ellipse(x, y, 2.3, 1.2, terrainHash(position.x, position.y, 90 + i) * Math.PI, 0, Math.PI * 2); context.fill();
      }
    }
  }
}
