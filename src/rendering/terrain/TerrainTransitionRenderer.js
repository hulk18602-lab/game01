export class TerrainTransitionRenderer {
  draw(context, plan, grid, tileSize) {
    const byPosition = new Map(plan.cells.map((cell) => [`${cell.position.x},${cell.position.y}`, cell]));
    context.lineCap = "round";
    for (const cell of plan.cells) {
      if (cell.material === "road") continue;
      const { x, y } = cell.position;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const other = byPosition.get(`${x + dx},${y + dy}`);
        if (!other || other.material === cell.material || other.material === "road") continue;
        const liquidEdge = cell.material === "liquid" || other.material === "liquid";
        const sx = cell.rect.x + (dx ? tileSize : 0); const sy = cell.rect.y + (dy ? tileSize : 0);
        context.strokeStyle = liquidEdge ? `${plan.biome.colors.accent}88` : `${plan.biome.colors.dark}55`;
        context.lineWidth = liquidEdge ? 3 : 4;
        context.beginPath();
        if (dx) { context.moveTo(sx, sy + tileSize * .27); context.bezierCurveTo(sx - 3, sy + tileSize * .4, sx + 4, sy + tileSize * .56, sx, sy + tileSize * .72); }
        else { context.moveTo(sx + tileSize * .27, sy); context.bezierCurveTo(sx + tileSize * .4, sy + 3, sx + tileSize * .56, sy - 4, sx + tileSize * .72, sy); }
        context.stroke();
      }
    }
  }
}
