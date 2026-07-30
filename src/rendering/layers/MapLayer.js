const hash = (x, y, salt = 0) => {
  let value = Math.imul(x + 37 + salt, 374761393) ^ Math.imul(y + 91, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

/** Procedural fantasy terrain. Decorations are presentation-only and precomputed once. */
export class MapLayer {
  constructor({ grid, converter }) {
    this.grid = grid;
    this.converter = converter;
    this.tileSize = converter.tileSize;
    this.water = [];
    this.decorations = [];
    this.spawnPosition = null;
    this.spawnGridX = -1;
    this.grid.forEach((tile, position) => {
      const rect = this.converter.gridRect(position);
      if (tile.id === "water") this.water.push(rect);
      if (tile.id === "road" && position.x > this.spawnGridX) {
        this.spawnGridX = position.x;
        this.spawnPosition = this.converter.gridToWorld(position, { center: true });
      }
      if (!tile.buildable || (tile.id !== "grass" && tile.id !== "sand")) return;
      const roll = hash(position.x, position.y, 11);
      const decoration = roll < 0.045
        ? "tree"
        : roll < 0.115
          ? "bush"
          : roll < 0.205
            ? "flowers"
            : roll < 0.245
              ? "stone"
              : null;
      if (!decoration) return;
      this.decorations.push({
        type: decoration,
        x: rect.x + rect.width * (0.22 + hash(position.x, position.y, 12) * 0.56),
        y: rect.y + rect.height * (0.25 + hash(position.x, position.y, 13) * 0.52),
        scale: 0.72 + hash(position.x, position.y, 14) * 0.45,
        variant: Math.floor(hash(position.x, position.y, 15) * 4),
      });
    });
    this.surface = this.createSurface();
  }

  createSurface() {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = this.grid.width * this.tileSize;
    canvas.height = this.grid.height * this.tileSize;
    const context = canvas.getContext("2d");
    if (!context) return null;
    this.drawTerrain(context);
    for (const decoration of this.decorations) this.drawDecoration(context, decoration);
    this.drawLandmarks(context);
    return canvas;
  }

  render(context, state) {
    if (this.surface) context.drawImage(this.surface, 0, 0);
    else {
      this.drawTerrain(context);
      for (const decoration of this.decorations) this.drawDecoration(context, decoration);
      this.drawLandmarks(context);
    }
    this.drawWaterAnimation(
      context,
      state.reducedMotion ? 0 : (state.visualTime ?? 0),
    );
  }

  drawTerrain(context) {
    this.grid.forEach((tile, position) => {
      const rect = this.converter.gridRect(position);
      if (tile.id === "grass") this.drawGrass(context, rect, position);
      else if (tile.id === "road") this.drawRoad(context, rect, position);
      else if (tile.id === "water") this.drawWater(context, rect, position);
      else if (tile.id === "rock") this.drawRock(context, rect, position);
      else if (tile.id === "sand") this.drawSand(context, rect, position);
      else {
        context.fillStyle = tile.color ?? "#777";
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    });
  }

  drawGrass(context, rect, position) {
    const shade = hash(position.x, position.y, 1);
    context.fillStyle = shade > 0.5 ? "#4f913f" : "#548f42";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.fillStyle = "rgba(193, 230, 128, .16)";
    for (let index = 0; index < 7; index += 1) {
      const x = rect.x + hash(position.x, position.y, 20 + index) * rect.width;
      const y = rect.y + hash(position.x, position.y, 30 + index) * rect.height;
      context.fillRect(x, y, 1.5, 3.5);
    }
    context.strokeStyle = "rgba(34, 87, 38, .22)";
    context.lineWidth = 1;
    for (let index = 0; index < 3; index += 1) {
      const x = rect.x + hash(position.x, position.y, 40 + index) * rect.width;
      const y = rect.y + hash(position.x, position.y, 50 + index) * rect.height;
      context.beginPath();
      context.moveTo(x, y + 4);
      context.lineTo(x - 2, y);
      context.moveTo(x, y + 4);
      context.lineTo(x + 2, y + 0.5);
      context.stroke();
    }
  }

  drawRoad(context, rect, position) {
    const gradient = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    gradient.addColorStop(0, "#c69a62");
    gradient.addColorStop(0.48, "#b7834f");
    gradient.addColorStop(1, "#96643d");
    context.fillStyle = gradient;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.fillStyle = "rgba(255, 230, 174, .16)";
    context.fillRect(rect.x, rect.y + 3, rect.width, 3);
    context.fillStyle = "rgba(75, 45, 29, .16)";
    context.fillRect(rect.x, rect.y + rect.height - 5, rect.width, 5);
    context.strokeStyle = "rgba(91, 55, 34, .18)";
    context.lineWidth = 2;
    context.setLineDash([6, 9]);
    context.beginPath();
    context.moveTo(rect.x, rect.y + rect.height * 0.34);
    context.lineTo(rect.x + rect.width, rect.y + rect.height * 0.34);
    context.moveTo(rect.x, rect.y + rect.height * 0.7);
    context.lineTo(rect.x + rect.width, rect.y + rect.height * 0.7);
    context.stroke();
    context.setLineDash([]);
    for (let index = 0; index < 3; index += 1) {
      const x = rect.x + hash(position.x, position.y, 60 + index) * rect.width;
      const y = rect.y + hash(position.x, position.y, 70 + index) * rect.height;
      context.fillStyle = index % 2 ? "#d4ad78" : "#765035";
      context.beginPath();
      context.ellipse(x, y, 1.7, 1.1, hash(position.x, position.y, 80 + index) * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawWater(context, rect, position) {
    const gradient = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    gradient.addColorStop(0, "#216b91");
    gradient.addColorStop(0.5, "#2d88aa");
    gradient.addColorStop(1, "#15536f");
    context.fillStyle = gradient;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.fillStyle = `rgba(137, 220, 229, ${0.08 + hash(position.x, position.y, 4) * 0.08})`;
    context.fillRect(rect.x + 3, rect.y + 4, rect.width - 6, 5);
  }

  drawWaterAnimation(context, time) {
    context.save();
    context.lineCap = "round";
    for (let tileIndex = 0; tileIndex < this.water.length; tileIndex += 1) {
      const rect = this.water[tileIndex];
      context.save();
      context.beginPath();
      context.rect(rect.x, rect.y, rect.width, rect.height);
      context.clip();
      for (let line = 0; line < 3; line += 1) {
        const phase = time * (1.1 + line * 0.16) + tileIndex * 0.7 + line * 2.1;
        const y = rect.y + 10 + line * 14 + Math.sin(phase) * 2.4;
        context.strokeStyle = line === 1 ? "rgba(186, 242, 239, .34)" : "rgba(130, 211, 224, .24)";
        context.lineWidth = line === 1 ? 2 : 1.5;
        context.beginPath();
        context.moveTo(rect.x - 8, y);
        context.bezierCurveTo(
          rect.x + 6,
          y - 4,
          rect.x + 17,
          y + 5,
          rect.x + 31,
          y,
        );
        context.bezierCurveTo(
          rect.x + 39,
          y - 3,
          rect.x + 48,
          y + 2,
          rect.x + 58,
          y - 1,
        );
        context.stroke();
      }
      context.restore();
    }
    context.restore();
  }

  drawRock(context, rect, position) {
    context.fillStyle = "#405056";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    context.fillStyle = hash(position.x, position.y, 5) > 0.5 ? "#637176" : "#59686d";
    context.beginPath();
    context.moveTo(centerX - 21, centerY + 14);
    context.lineTo(centerX - 16, centerY - 12);
    context.lineTo(centerX - 2, centerY - 21);
    context.lineTo(centerX + 17, centerY - 13);
    context.lineTo(centerX + 22, centerY + 11);
    context.lineTo(centerX + 8, centerY + 20);
    context.lineTo(centerX - 10, centerY + 20);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(220, 235, 225, .18)";
    context.beginPath();
    context.moveTo(centerX - 14, centerY - 10);
    context.lineTo(centerX - 2, centerY - 17);
    context.lineTo(centerX + 8, centerY - 10);
    context.lineTo(centerX - 5, centerY - 5);
    context.closePath();
    context.fill();
  }

  drawSand(context, rect, position) {
    context.fillStyle = "#cfb36c";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    for (let index = 0; index < 5; index += 1) {
      context.fillStyle = index % 2 ? "rgba(112, 79, 39, .18)" : "rgba(255, 238, 174, .28)";
      context.beginPath();
      context.arc(
        rect.x + hash(position.x, position.y, 90 + index) * rect.width,
        rect.y + hash(position.x, position.y, 100 + index) * rect.height,
        1 + (index % 2),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }

  drawDecoration(context, decoration) {
    const { x, y, scale, variant } = decoration;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    if (decoration.type === "tree") {
      context.fillStyle = "rgba(18, 39, 27, .28)";
      context.beginPath();
      context.ellipse(7, 9, 15, 8, -0.25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#6d4930";
      context.fillRect(-3, -2, 6, 17);
      const greens = ["#23623b", "#2d7643", "#3c8747", "#28724d"];
      context.fillStyle = greens[variant] ?? greens[0];
      for (const [dx, dy, radius] of [[-8, -8, 10], [6, -11, 12], [0, -20, 11]]) {
        context.beginPath();
        context.arc(dx, dy, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "rgba(167, 220, 115, .28)";
      context.beginPath();
      context.arc(-3, -22, 5, 0, Math.PI * 2);
      context.fill();
    } else if (decoration.type === "bush") {
      context.fillStyle = variant % 2 ? "#2d7540" : "#397f45";
      for (const [dx, dy, radius] of [[-7, 1, 7], [0, -4, 9], [8, 1, 7]]) {
        context.beginPath();
        context.arc(dx, dy, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "rgba(190, 231, 120, .35)";
      context.beginPath();
      context.arc(-2, -7, 3, 0, Math.PI * 2);
      context.fill();
    } else if (decoration.type === "flowers") {
      const colors = ["#f9a8d4", "#fde68a", "#c4b5fd", "#fca5a5"];
      for (let index = 0; index < 5; index += 1) {
        const angle = index * 2.4;
        const px = Math.cos(angle) * (4 + index);
        const py = Math.sin(angle) * (3 + index * 0.7);
        context.strokeStyle = "#397444";
        context.beginPath();
        context.moveTo(px, py + 5);
        context.lineTo(px, py);
        context.stroke();
        context.fillStyle = colors[(variant + index) % colors.length];
        context.beginPath();
        context.arc(px, py, 2.2, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      context.fillStyle = "#77858a";
      context.beginPath();
      context.ellipse(0, 2, 8, 5.5, -0.25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(225, 235, 230, .26)";
      context.beginPath();
      context.ellipse(-2, 0, 3.5, 1.7, -0.3, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  drawLandmarks(context) {
    const spawn = this.spawnPosition;
    if (!spawn) return;
    context.save();
    context.translate(spawn.x, spawn.y);
    context.fillStyle = "#35283f";
    context.fillRect(-21, -25, 8, 50);
    context.fillRect(13, -25, 8, 50);
    context.strokeStyle = "#9d7bb7";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 25, Math.PI, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

export default MapLayer;
