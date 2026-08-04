const circle = (context, x, y, radius, color) => { context.fillStyle = color; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill(); };

export class TerrainDecorationRenderer {
  draw(context, plan) {
    for (const item of plan.decorations) this.#item(context, item, plan.biome.colors);
    this.#landmark(context, plan);
  }

  #item(context, item, colors) {
    const { type, x, y, scale, variant } = item;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.fillStyle = "rgba(10,15,20,.22)"; context.beginPath(); context.ellipse(4, 7, 10, 5, -.2, 0, Math.PI * 2); context.fill();
    if (["flowers", "mushrooms", "pollen"].includes(type)) {
      const petals = [colors.accent, "#f5c2d9", "#f7dc82"];
      for (let i = 0; i < 5; i += 1) circle(context, Math.cos(i * 2.1) * 7, Math.sin(i * 2.1) * 5, 2.2, petals[(i + variant) % petals.length]);
    } else if (["bush", "fern", "reeds", "dry-grass"].includes(type)) {
      context.strokeStyle = colors.light; context.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) { context.beginPath(); context.moveTo(0, 7); context.quadraticCurveTo(i * 3, -3, i * 5, -9 + Math.abs(i) * 2); context.stroke(); }
    } else if (["willow", "ancient-tree", "snow-pine", "dead-tree", "charred-tree"].includes(type)) {
      context.strokeStyle = type === "snow-pine" ? "#e9f7f6" : colors.shoulder; context.lineWidth = 5; context.beginPath(); context.moveTo(0, 9); context.lineTo(0, -11); context.moveTo(0, -5); context.lineTo(-8, -12); context.moveTo(0, -8); context.lineTo(8, -16); context.stroke();
      if (!type.includes("dead") && !type.includes("charred")) { circle(context, -6, -15, 8, colors.dark); circle(context, 4, -18, 9, colors.ground); }
    } else if (["rune", "mosaic", "crack"].includes(type)) {
      context.strokeStyle = `${colors.accent}bb`; context.lineWidth = 2; context.beginPath(); context.moveTo(-8, 5); context.lineTo(-2, -5); context.lineTo(4, 2); context.lineTo(9, -7); context.stroke();
      if (type === "rune") { context.beginPath(); context.arc(0, 0, 9, 0, Math.PI * 2); context.stroke(); }
    } else if (["crystal", "ice-crystal", "void-crystal", "obelisk", "column"].includes(type)) {
      context.fillStyle = type === "column" ? colors.rock : colors.accent; context.beginPath(); context.moveTo(0, -15); context.lineTo(8, 3); context.lineTo(3, 10); context.lineTo(-7, 6); context.lineTo(-5, -7); context.closePath(); context.fill();
      context.fillStyle = `${colors.light}88`; context.beginPath(); context.moveTo(0, -12); context.lineTo(2, 3); context.lineTo(-4, 5); context.closePath(); context.fill();
    } else if (type === "bones") {
      context.strokeStyle = "#d8cfb3"; context.lineWidth = 3; context.beginPath(); context.moveTo(-8, -5); context.lineTo(8, 6); context.moveTo(-7, 6); context.lineTo(7, -6); context.stroke();
    } else {
      context.fillStyle = colors.rock; context.beginPath(); context.ellipse(0, 2, 9, 6, -.3, 0, Math.PI * 2); context.fill();
      context.fillStyle = `${colors.light}66`; context.beginPath(); context.ellipse(-2, 0, 4, 2, -.3, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  #landmark(context, plan) {
    if (!plan.spawn) return;
    context.save(); context.translate(plan.spawn.x, plan.spawn.y);
    context.fillStyle = plan.biome.colors.dark; context.fillRect(-22, -25, 8, 50); context.fillRect(14, -25, 8, 50);
    context.strokeStyle = plan.biome.colors.accent; context.lineWidth = 3; context.beginPath(); context.arc(0, 0, 26, Math.PI, Math.PI * 2); context.stroke();
    context.restore();
  }
}
