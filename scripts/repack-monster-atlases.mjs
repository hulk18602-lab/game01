import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const ids = ["grunt", "runner", "tank", "armored", "regenerator", "boss"];
const columns = 4;
const rows = 5;
const padding = 2;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const id of ids) {
    const directory = path.join(root, "public", "assets", "monsters", id);
    const sourcePath = path.join(directory, "atlas-source-placeholder.png");
    const outputPath = path.join(directory, "atlas-placeholder.png");
    const metadataPath = path.join(directory, "atlas.json");
    const source = await readFile(sourcePath);
    const dataUrl = `data:image/png;base64,${source.toString("base64")}`;
    const packed = await page.evaluate(async ({ dataUrl, columns, rows, padding }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const xEdges = Array.from({ length: columns + 1 }, (_, index) =>
        Math.round(index * image.naturalWidth / columns));
      const yEdges = Array.from({ length: rows + 1 }, (_, index) =>
        Math.round(index * image.naturalHeight / rows));
      const sourceWidths = xEdges.slice(1).map((edge, index) => edge - xEdges[index]);
      const sourceHeights = yEdges.slice(1).map((edge, index) => edge - yEdges[index]);
      const contentWidth = Math.max(...sourceWidths);
      const contentHeight = Math.max(...sourceHeights);
      const frameWidth = contentWidth + padding * 2;
      const frameHeight = contentHeight + padding * 2;
      const canvas = document.createElement("canvas");
      canvas.width = columns * frameWidth;
      canvas.height = rows * frameHeight;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Canvas 2D unavailable while repacking monster atlas");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const sourceX = xEdges[column];
          const sourceY = yEdges[row];
          const sourceWidth = sourceWidths[column];
          const sourceHeight = sourceHeights[row];
          const destinationX = column * frameWidth + padding
            + Math.floor((contentWidth - sourceWidth) / 2);
          const destinationY = row * frameHeight + padding + contentHeight - sourceHeight;
          context.drawImage(
            image,
            sourceX, sourceY, sourceWidth, sourceHeight,
            destinationX, destinationY, sourceWidth, sourceHeight,
          );
        }
      }
      // The project-generated source sheets use an opaque magenta chroma backdrop.
      // Flood only chroma-colored pixels connected to each frame boundary, keeping
      // disconnected purple spell/weapon artwork intact.
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const isChroma = (pixelIndex) => {
        const offset = pixelIndex * 4;
        const red = pixels.data[offset];
        const green = pixels.data[offset + 1];
        const blue = pixels.data[offset + 2];
        return red > 125 && blue > 125 && green < 185 && Math.abs(red - blue) < 115;
      };
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const left = column * frameWidth + padding;
          const top = row * frameHeight + padding;
          const right = left + contentWidth - 1;
          const bottom = top + contentHeight - 1;
          const visited = new Uint8Array(contentWidth * contentHeight);
          const queue = new Int32Array(contentWidth * contentHeight);
          let head = 0;
          let tail = 0;
          const enqueue = (x, y) => {
            const local = (y - top) * contentWidth + x - left;
            const pixel = y * canvas.width + x;
            if (visited[local] || !isChroma(pixel)) return;
            visited[local] = 1;
            queue[tail++] = pixel;
          };
          for (let x = left; x <= right; x += 1) {
            enqueue(x, top);
            enqueue(x, bottom);
          }
          for (let y = top; y <= bottom; y += 1) {
            enqueue(left, y);
            enqueue(right, y);
          }
          while (head < tail) {
            const pixel = queue[head++];
            pixels.data[pixel * 4 + 3] = 0;
            const x = pixel % canvas.width;
            const y = Math.floor(pixel / canvas.width);
            if (x > left) enqueue(x - 1, y);
            if (x < right) enqueue(x + 1, y);
            if (y > top) enqueue(x, y - 1);
            if (y < bottom) enqueue(x, y + 1);
          }
        }
      }
      context.putImageData(pixels, 0, 0);
      return {
        png: canvas.toDataURL("image/png").split(",")[1],
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
        width: canvas.width,
        height: canvas.height,
        frameWidth,
        frameHeight,
        contentWidth,
        contentHeight,
      };
    }, { dataUrl, columns, rows, padding });

    const previous = JSON.parse(await readFile(metadataPath, "utf8"));
    const metadata = {
      ...previous,
      schemaVersion: 2,
      atlas: {
        file: "atlas-placeholder.png",
        width: packed.width,
        height: packed.height,
        columns,
        rows,
        frameWidth: packed.frameWidth,
        frameHeight: packed.frameHeight,
        contentWidth: packed.contentWidth,
        contentHeight: packed.contentHeight,
        padding,
      },
      source: {
        file: "atlas-source-placeholder.png",
        width: packed.sourceWidth,
        height: packed.sourceHeight,
        extraction: "rounded proportional boundaries; centered horizontally and bottom-aligned per frame",
      },
    };
    await writeFile(outputPath, Buffer.from(packed.png, "base64"));
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    process.stdout.write(`${id}: ${packed.sourceWidth}x${packed.sourceHeight} -> ${packed.width}x${packed.height} (${packed.frameWidth}x${packed.frameHeight} cells)\n`);
  }
  const regressionAtlas = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 36;
    canvas.height = 12;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable while creating regression atlas");
    const interiors = ["#facc15", "#a855f7", "#fb923c"];
    for (let frame = 0; frame < 3; frame += 1) {
      const cellX = frame * 12;
      context.fillStyle = "#00ff00";
      context.fillRect(cellX, 0, 12, 12);
      context.fillStyle = interiors[frame];
      context.fillRect(cellX + 2, 2, 8, 8);
      context.fillStyle = "#ff0000";
      context.fillRect(cellX + 2, 2, 8, 1);
      context.fillStyle = "#0000ff";
      context.fillRect(cellX + 2, 9, 8, 1);
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const regressionDirectory = path.join(root, "public", "assets", "monsters", "test");
  await mkdir(regressionDirectory, { recursive: true });
  await writeFile(path.join(regressionDirectory, "frame-boundary-atlas.png"), Buffer.from(regressionAtlas, "base64"));
} finally {
  await browser.close();
}
