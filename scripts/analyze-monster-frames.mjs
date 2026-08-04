import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const ids = ["grunt", "runner", "tank", "armored", "regenerator", "boss"];
const label = process.argv[2] ?? "before";
const outputDirectory = path.join(root, "artifacts", "monster-frame-cleanup");
await mkdir(outputDirectory, { recursive: true });

const atlases = await Promise.all(ids.map(async (id) => {
  const directory = path.join(root, "public", "assets", "monsters", id);
  const metadata = JSON.parse(await readFile(path.join(directory, "atlas.json"), "utf8"));
  const png = await readFile(path.join(directory, metadata.atlas.file));
  return { id, metadata, dataUrl: `data:image/png;base64,${png.toString("base64")}` };
}));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
  const result = await page.evaluate(async ({ atlases, label }) => {
    const displayWidth = 64;
    const displayHeight = 76;
    const gutter = 12;
    const titleHeight = 34;
    const originalGap = 28;
    const loaded = await Promise.all(atlases.map(async (atlas) => {
      const image = new Image();
      image.src = atlas.dataUrl;
      await image.decode();
      return { ...atlas, image };
    }));
    const blockWidths = loaded.map(({ metadata }) =>
      gutter * 5 + metadata.atlas.frameWidth * 4 + originalGap + displayWidth * 4);
    const blockHeights = loaded.map(({ metadata }) =>
      titleHeight + gutter * 6 + metadata.atlas.frameHeight * 5);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(...blockWidths);
    canvas.height = blockHeights.reduce((sum, height) => sum + height, 0);
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D unavailable while building monster contact sheet");
    context.fillStyle = "#163047";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const reports = [];
    let blockY = 0;
    for (const { id, metadata, image } of loaded) {
      const geometry = metadata.atlas;
      context.fillStyle = "#f8fafc";
      context.font = "bold 22px sans-serif";
      context.fillText(`${id} — ${label} — original scale + game display size`, gutter, blockY + 24);
      const frames = [];
      for (let frame = 0; frame < geometry.columns * geometry.rows; frame += 1) {
        const column = frame % geometry.columns;
        const row = Math.floor(frame / geometry.columns);
        const sourceX = column * geometry.frameWidth;
        const sourceY = row * geometry.frameHeight;
        const destinationX = gutter + column * (geometry.frameWidth + gutter);
        const destinationY = blockY + titleHeight + gutter + row * (geometry.frameHeight + gutter);
        context.fillStyle = (row + column) % 2 === 0 ? "#e7d7b3" : "#b9d7dc";
        context.fillRect(destinationX, destinationY, geometry.frameWidth, geometry.frameHeight);
        context.drawImage(
          image,
          sourceX, sourceY, geometry.frameWidth, geometry.frameHeight,
          destinationX, destinationY, geometry.frameWidth, geometry.frameHeight,
        );
        const displayX = gutter * 5 + geometry.frameWidth * 4 + originalGap + column * displayWidth;
        const displayY = blockY + titleHeight + gutter + row * (geometry.frameHeight + gutter);
        context.fillStyle = "#d5e7c5";
        context.fillRect(displayX, displayY, displayWidth, displayHeight);
        context.drawImage(
          image,
          sourceX, sourceY, geometry.frameWidth, geometry.frameHeight,
          displayX, displayY, displayWidth, displayHeight,
        );

        const scratch = document.createElement("canvas");
        scratch.width = geometry.frameWidth;
        scratch.height = geometry.frameHeight;
        const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
        scratchContext.drawImage(
          image,
          sourceX, sourceY, geometry.frameWidth, geometry.frameHeight,
          0, 0, geometry.frameWidth, geometry.frameHeight,
        );
        const pixels = scratchContext.getImageData(0, 0, scratch.width, scratch.height);
        const occupied = new Uint8Array(scratch.width * scratch.height);
        for (let pixel = 0; pixel < occupied.length; pixel += 1) {
          occupied[pixel] = pixels.data[pixel * 4 + 3] >= 16 ? 1 : 0;
        }
        const visited = new Uint8Array(occupied.length);
        const components = [];
        for (let seed = 0; seed < occupied.length; seed += 1) {
          if (!occupied[seed] || visited[seed]) continue;
          const queue = [seed];
          visited[seed] = 1;
          let area = 0;
          let alphaArea = 0;
          let minX = scratch.width;
          let minY = scratch.height;
          let maxX = 0;
          let maxY = 0;
          for (let head = 0; head < queue.length; head += 1) {
            const pixel = queue[head];
            const x = pixel % scratch.width;
            const y = Math.floor(pixel / scratch.width);
            area += 1;
            alphaArea += pixels.data[pixel * 4 + 3] / 255;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
              for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                const nextX = x + offsetX;
                const nextY = y + offsetY;
                if ((offsetX === 0 && offsetY === 0) || nextX < 0 || nextY < 0
                  || nextX >= scratch.width || nextY >= scratch.height) continue;
                const next = nextY * scratch.width + nextX;
                if (!occupied[next] || visited[next]) continue;
                visited[next] = 1;
                queue.push(next);
              }
            }
          }
          components.push({ area, alphaArea: Math.round(alphaArea), minX, minY, maxX, maxY });
        }
        components.sort((left, right) => right.alphaArea - left.alphaArea);
        const main = components[0];
        const gapToMain = (component) => {
          const gapX = Math.max(0, main.minX - component.maxX - 1, component.minX - main.maxX - 1);
          const gapY = Math.max(0, main.minY - component.maxY - 1, component.minY - main.maxY - 1);
          return Math.round(Math.hypot(gapX, gapY));
        };
        const enriched = components.map((component, index) => ({
          ...component,
          gapToMain: index === 0 ? 0 : gapToMain(component),
        }));
        const suspects = enriched.slice(1).filter((component) =>
          component.alphaArea >= 4 && component.gapToMain >= 4);
        context.fillStyle = "#0f172a";
        context.font = "bold 14px monospace";
        context.fillText(String(frame).padStart(2, "0"), destinationX + 5, destinationY + 17);
        context.strokeStyle = "#ef4444";
        context.lineWidth = 2;
        for (const suspect of suspects) {
          context.strokeRect(
            destinationX + suspect.minX - 2,
            destinationY + suspect.minY - 2,
            suspect.maxX - suspect.minX + 5,
            suspect.maxY - suspect.minY + 5,
          );
        }
        frames.push({ frame, components: enriched, suspects });
      }
      reports.push({ id, frames });
      blockY += blockHeights[reports.length - 1];
    }
    const sheets = [];
    let sheetY = 0;
    for (let index = 0; index < loaded.length; index += 1) {
      const sheet = document.createElement("canvas");
      sheet.width = blockWidths[index];
      sheet.height = blockHeights[index];
      const sheetContext = sheet.getContext("2d", { alpha: false });
      sheetContext.drawImage(
        canvas,
        0, sheetY, sheet.width, sheet.height,
        0, 0, sheet.width, sheet.height,
      );
      sheets.push({ id: loaded[index].id, png: sheet.toDataURL("image/png").split(",")[1] });
      sheetY += blockHeights[index];
    }
    return {
      png: canvas.toDataURL("image/png").split(",")[1],
      reports,
      sheets,
    };
  }, { atlases, label });
  await writeFile(
    path.join(outputDirectory, `monster-frames-${label}.png`),
    Buffer.from(result.png, "base64"),
  );
  for (const sheet of result.sheets) {
    await writeFile(
      path.join(outputDirectory, `${sheet.id}-frames-${label}.png`),
      Buffer.from(sheet.png, "base64"),
    );
  }
  await writeFile(
    path.join(outputDirectory, `monster-components-${label}.json`),
    `${JSON.stringify(result.reports, null, 2)}\n`,
    "utf8",
  );
  for (const atlas of result.reports) {
    const suspectFrames = atlas.frames.filter((frame) => frame.suspects.length > 0);
    process.stdout.write(`${atlas.id}: ${suspectFrames.length} suspect frame(s) ${suspectFrames.map((frame) => frame.frame).join(", ")}\n`);
    for (const frame of suspectFrames) {
      process.stdout.write(`  frame ${frame.frame}: ${frame.suspects.map((component) =>
        `area=${component.alphaArea} bbox=${component.minX},${component.minY}-${component.maxX},${component.maxY} gap=${component.gapToMain}`).join("; ")}\n`);
    }
  }
} finally {
  await browser.close();
}
