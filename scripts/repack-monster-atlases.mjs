import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const ids = ["grunt", "runner", "tank", "armored", "regenerator", "boss"];
const columns = 4;
const rows = 5;
const padding = 2;
const defaultCleanupPolicy = Object.freeze({
  alphaThreshold: 8,
  minimumComponentArea: 4,
  maximumComponentGap: 12,
  boundaryMargin: 1,
});
const cleanupOverrides = Object.freeze({
  grunt: Object.freeze({
    16: Object.freeze({ maximumComponentGap: 20 }),
  }),
  regenerator: Object.freeze({
    // The collapsing caster intentionally leaves detached staff and dissolve particles.
    17: Object.freeze({ maximumComponentGap: 110, allowBoundaryComponents: true }),
    18: Object.freeze({ maximumComponentGap: 110, allowBoundaryComponents: true }),
    19: Object.freeze({ maximumComponentGap: 110, allowBoundaryComponents: true }),
  }),
});

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
    const componentPolicy = {
      ...defaultCleanupPolicy,
      perFrameOverrides: cleanupOverrides[id] ?? {},
    };
    const packed = await page.evaluate(async ({ dataUrl, columns, rows, padding, componentPolicy }) => {
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
      const frameReports = [];
      const componentGap = (leftComponent, rightComponent) => {
        const gapX = Math.max(
          0,
          leftComponent.minX - rightComponent.maxX - 1,
          rightComponent.minX - leftComponent.maxX - 1,
        );
        const gapY = Math.max(
          0,
          leftComponent.minY - rightComponent.maxY - 1,
          rightComponent.minY - leftComponent.maxY - 1,
        );
        return Math.hypot(gapX, gapY);
      };
      for (let frame = 0; frame < columns * rows; frame += 1) {
        const column = frame % columns;
        const row = Math.floor(frame / columns);
        const left = column * frameWidth + padding;
        const top = row * frameHeight + padding;
        const right = left + contentWidth - 1;
        const bottom = top + contentHeight - 1;
        const occupied = new Uint8Array(contentWidth * contentHeight);
        for (let localY = 0; localY < contentHeight; localY += 1) {
          for (let localX = 0; localX < contentWidth; localX += 1) {
            const pixel = (top + localY) * canvas.width + left + localX;
            occupied[localY * contentWidth + localX] =
              pixels.data[pixel * 4 + 3] >= componentPolicy.alphaThreshold ? 1 : 0;
          }
        }
        const visited = new Uint8Array(occupied.length);
        const components = [];
        for (let seed = 0; seed < occupied.length; seed += 1) {
          if (!occupied[seed] || visited[seed]) continue;
          const queue = [seed];
          const componentPixels = [];
          visited[seed] = 1;
          let alphaArea = 0;
          let minX = contentWidth;
          let minY = contentHeight;
          let maxX = 0;
          let maxY = 0;
          for (let head = 0; head < queue.length; head += 1) {
            const local = queue[head];
            const localX = local % contentWidth;
            const localY = Math.floor(local / contentWidth);
            const pixel = (top + localY) * canvas.width + left + localX;
            componentPixels.push(pixel);
            alphaArea += pixels.data[pixel * 4 + 3] / 255;
            minX = Math.min(minX, localX);
            minY = Math.min(minY, localY);
            maxX = Math.max(maxX, localX);
            maxY = Math.max(maxY, localY);
            for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
              for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                const nextX = localX + offsetX;
                const nextY = localY + offsetY;
                if ((offsetX === 0 && offsetY === 0) || nextX < 0 || nextY < 0
                  || nextX >= contentWidth || nextY >= contentHeight) continue;
                const next = nextY * contentWidth + nextX;
                if (!occupied[next] || visited[next]) continue;
                visited[next] = 1;
                queue.push(next);
              }
            }
          }
          const bodyCenterX = (minX + maxX) / 2;
          const bodyCenterY = (minY + maxY) / 2;
          const centrality = 1 - Math.min(1, Math.abs(bodyCenterX - contentWidth / 2) / (contentWidth / 2));
          const intersectsBodyZone = maxX >= contentWidth * 0.22 && minX <= contentWidth * 0.78
            && maxY >= contentHeight * 0.18 && minY <= contentHeight * 0.94;
          const reachesAnchorZone = maxY >= contentHeight * 0.55;
          const score = alphaArea
            * (1 + centrality * 0.12 + (intersectsBodyZone ? 0.18 : 0) + (reachesAnchorZone ? 0.08 : 0));
          components.push({
            pixels: componentPixels,
            area: componentPixels.length,
            alphaArea,
            minX, minY, maxX, maxY,
            score,
          });
        }
        components.sort((first, second) => second.score - first.score);
        const main = components[0];
        if (!main) throw new Error(`Frame ${frame} contains no opaque monster silhouette`);
        const override = componentPolicy.perFrameOverrides[String(frame)] ?? {};
        const maximumComponentGap = override.maximumComponentGap ?? componentPolicy.maximumComponentGap;
        const minimumComponentArea = override.minimumComponentArea ?? componentPolicy.minimumComponentArea;
        const keepComponents = new Set(override.keepComponents ?? []);
        const removeComponents = new Set(override.removeComponents ?? []);
        const removed = [];
        const kept = [];
        for (let index = 0; index < components.length; index += 1) {
          const component = components[index];
          const gap = index === 0 ? 0 : componentGap(component, main);
          const touchesTop = component.minY <= componentPolicy.boundaryMargin;
          const touchesSide = component.minX <= componentPolicy.boundaryMargin
            || component.maxX >= contentWidth - 1 - componentPolicy.boundaryMargin;
          const aboveMain = component.maxY < main.minY;
          const tooRemote = gap > maximumComponentGap
            && component.alphaArea < main.alphaArea * 0.12;
          const tooSmallAndDetached = component.alphaArea < minimumComponentArea && gap > 2;
          const boundaryFragment = index !== 0
            && ((touchesTop && aboveMain)
              || (touchesSide && gap > maximumComponentGap && !override.allowBoundaryComponents));
          const reasons = [];
          if (removeComponents.has(index)) reasons.push("per-frame override");
          if (touchesTop && aboveMain) reasons.push("detached above main silhouette at source-cell boundary");
          if (touchesSide && gap > maximumComponentGap && !override.allowBoundaryComponents) {
            reasons.push("detached at neighboring source-cell side");
          }
          if (tooRemote) reasons.push("small component beyond maximum gap");
          if (tooSmallAndDetached) reasons.push("sub-threshold detached component");
          const shouldRemove = index !== 0 && !keepComponents.has(index)
            && (removeComponents.has(index) || boundaryFragment || tooRemote || tooSmallAndDetached);
          const report = {
            index,
            alphaArea: Math.round(component.alphaArea),
            area: component.area,
            bounds: [component.minX, component.minY, component.maxX, component.maxY],
            gapToMain: Math.round(gap),
            reasons,
          };
          if (shouldRemove) {
            removed.push(report);
            for (const pixel of component.pixels) pixels.data[pixel * 4 + 3] = 0;
          } else {
            kept.push(report);
          }
        }
        const significantAlpha = kept.reduce((sum, component) => sum + component.alphaArea, 0);
        frameReports.push({
          frame,
          mainComponent: 0,
          mainAlphaShare: Number((main.alphaArea / Math.max(1, significantAlpha)).toFixed(4)),
          kept,
          removed,
        });
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
        componentCleanup: {
          ...componentPolicy,
          connectivity: 8,
          mainComponentSelection: "alpha area + center/body/anchor-zone score",
          frameReports,
        },
      };
    }, { dataUrl, columns, rows, padding, componentPolicy });

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
        extraction: "rounded proportional boundaries; centered horizontally and bottom-aligned; per-frame alpha connected-component cleanup",
      },
      componentCleanup: packed.componentCleanup,
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
