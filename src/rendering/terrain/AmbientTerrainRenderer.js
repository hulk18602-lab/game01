import { terrainHash } from "./TerrainRenderPlan.js";

/** Small bounded ambient pass: eight deterministic motes, zero per-frame allocations. */
export class AmbientTerrainRenderer {
  draw(context, plan, time, reducedMotion) {
    const width = plan.width;
    const height = plan.height;
    const motion = reducedMotion ? 0 : time;
    const kind = plan.biome.ambient;
    context.save();
    for (let index = 0; index < 8; index += 1) {
      const seedX = terrainHash(index, plan.mapId.length, 201);
      const seedY = terrainHash(index, plan.mapId.length, 202);
      const speed = kind === "snow" || kind === "dust" ? 9 : 4;
      const x = (seedX * width + motion * speed * (index % 2 ? 1 : -1) + width) % width;
      const y = (seedY * height + motion * speed * .55) % height;
      const color = kind === "embers" ? "#ff9a3c" : kind === "snow" ? "#e9fbff" : plan.biome.colors.accent;
      context.globalAlpha = kind === "mist" ? .08 : .26;
      context.fillStyle = color;
      context.beginPath();
      if (kind === "mist") context.ellipse(x, y, 30, 7, 0, 0, Math.PI * 2);
      else if (kind === "snow" || kind === "dust") context.ellipse(x, y, 2.2, 1.1, -.4, 0, Math.PI * 2);
      else context.arc(x, y, 1.4 + index % 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}
