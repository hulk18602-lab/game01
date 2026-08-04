import { terrainHash } from "./TerrainRenderPlan.js";

const ellipse = (context, x, y, rx, ry, color, rotation = 0) => {
  context.fillStyle = color;
  context.beginPath(); context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); context.fill();
};

export class TerrainTileRenderer {
  draw(context, plan) {
    const { colors } = plan.biome;
    context.fillStyle = colors.ground;
    context.fillRect(0, 0, plan.width, plan.height);
    for (const cell of plan.cells) {
      if (cell.material === "road" || cell.material === "liquid") continue;
      const { rect, position } = cell;
      const base = cell.material === "obstacle" ? colors.rock : cell.material === "sand" ? colors.light : colors.ground;
      if (cell.material === "sand") {
        ellipse(context, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width * .62, rect.height * .55, base, terrainHash(position.x, position.y, 5) * .18);
      }
      const wash = terrainHash(position.x, position.y, 2) > 0.48 ? colors.light : colors.dark;
      context.globalAlpha = cell.material === "obstacle" ? 0.24 : 0.12;
      ellipse(context, rect.x + 8 + terrainHash(position.x, position.y, 3) * 35, rect.y + 9 + terrainHash(position.x, position.y, 4) * 32, 18, 10, wash, terrainHash(position.x, position.y, 5));
      context.globalAlpha = 1;
      if (cell.material === "obstacle") this.#obstacle(context, cell, colors);
      else this.#texture(context, cell, colors);
    }
  }

  #texture(context, { rect, position }, colors) {
    context.lineCap = "round";
    for (let index = 0; index < 5; index += 1) {
      const x = rect.x + terrainHash(position.x, position.y, 20 + index) * rect.width;
      const y = rect.y + terrainHash(position.x, position.y, 30 + index) * rect.height;
      context.strokeStyle = index % 2 ? `${colors.light}66` : `${colors.dark}55`;
      context.lineWidth = 1.2; context.beginPath(); context.moveTo(x - 2, y + 2); context.quadraticCurveTo(x, y - 3, x + 3, y); context.stroke();
    }
  }

  #obstacle(context, { rect, position }, colors) {
    const x = rect.x + rect.width / 2; const y = rect.y + rect.height / 2;
    context.fillStyle = colors.rock; context.beginPath();
    context.moveTo(x - 23, y + 15); context.lineTo(x - 18, y - 12); context.lineTo(x - 5, y - 23); context.lineTo(x + 17, y - 15); context.lineTo(x + 23, y + 12); context.lineTo(x + 8, y + 22); context.lineTo(x - 12, y + 20); context.closePath(); context.fill();
    context.fillStyle = `${colors.light}55`; context.beginPath(); context.moveTo(x - 15, y - 10); context.lineTo(x - 5, y - 18); context.lineTo(x + 8, y - 11); context.lineTo(x - 4, y - 4); context.closePath(); context.fill();
    if (terrainHash(position.x, position.y, 8) > 0.45) { context.strokeStyle = `${colors.accent}55`; context.lineWidth = 1.5; context.beginPath(); context.moveTo(x - 3, y - 4); context.lineTo(x + 3, y + 5); context.lineTo(x - 1, y + 14); context.stroke(); }
  }
}
