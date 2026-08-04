import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const atlasIds = ["grunt", "runner", "tank", "armored", "regenerator", "boss"] as const;

test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 720 } });

test("all real frames contain only policy-approved alpha components", async ({ page }) => {
  await page.goto("/");
  const reports = await page.evaluate(async (ids) => {
    const distance = (left: Bounds, right: Bounds) => {
      const gapX = Math.max(0, left.minX - right.maxX - 1, right.minX - left.maxX - 1);
      const gapY = Math.max(0, left.minY - right.maxY - 1, right.minY - left.maxY - 1);
      return Math.round(Math.hypot(gapX, gapY));
    };
    const analyze = (pixels: ImageData, width: number, height: number, alphaThreshold: number) => {
      const occupied = new Uint8Array(width * height);
      for (let pixel = 0; pixel < occupied.length; pixel += 1) {
        occupied[pixel] = pixels.data[pixel * 4 + 3]! >= alphaThreshold ? 1 : 0;
      }
      const visited = new Uint8Array(occupied.length);
      const components: Array<Bounds & { area: number; alphaArea: number; gapToMain: number }> = [];
      for (let seed = 0; seed < occupied.length; seed += 1) {
        if (!occupied[seed] || visited[seed]) continue;
        const queue = [seed];
        visited[seed] = 1;
        let area = 0;
        let alphaArea = 0;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        for (let head = 0; head < queue.length; head += 1) {
          const pixel = queue[head]!;
          const x = pixel % width;
          const y = Math.floor(pixel / width);
          area += 1;
          alphaArea += pixels.data[pixel * 4 + 3]! / 255;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              const nextX = x + offsetX;
              const nextY = y + offsetY;
              if ((offsetX === 0 && offsetY === 0) || nextX < 0 || nextY < 0
                || nextX >= width || nextY >= height) continue;
              const next = nextY * width + nextX;
              if (!occupied[next] || visited[next]) continue;
              visited[next] = 1;
              queue.push(next);
            }
          }
        }
        components.push({ area, alphaArea, minX, minY, maxX, maxY, gapToMain: 0 });
      }
      components.sort((left, right) => right.alphaArea - left.alphaArea);
      const main = components[0]!;
      for (let index = 1; index < components.length; index += 1) {
        components[index]!.gapToMain = distance(components[index]!, main);
      }
      return components;
    };

    const results = [];
    for (const id of ids) {
      const metadata = await fetch(`/assets/monsters/${id}/atlas.json`).then((response) => response.json());
      const image = new Image();
      image.src = `/assets/monsters/${id}/${metadata.atlas.file}`;
      await image.decode();
      const atlas = metadata.atlas;
      const cleanup = metadata.componentCleanup;
      const canvas = document.createElement("canvas");
      canvas.width = atlas.frameWidth;
      canvas.height = atlas.frameHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const frames = [];
      for (let frame = 0; frame < atlas.columns * atlas.rows; frame += 1) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const sourceX = frame % atlas.columns * atlas.frameWidth;
        const sourceY = Math.floor(frame / atlas.columns) * atlas.frameHeight;
        context.drawImage(
          image,
          sourceX, sourceY, atlas.frameWidth, atlas.frameHeight,
          0, 0, atlas.frameWidth, atlas.frameHeight,
        );
        const framePixels = context.getImageData(0, 0, canvas.width, canvas.height);
        let paddingOpaquePixels = 0;
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            const insideContent = x >= atlas.padding && x < atlas.padding + atlas.contentWidth
              && y >= atlas.padding && y < atlas.padding + atlas.contentHeight;
            if (!insideContent && framePixels.data[(y * canvas.width + x) * 4 + 3] !== 0) {
              paddingOpaquePixels += 1;
            }
          }
        }
        const content = context.getImageData(
          atlas.padding, atlas.padding, atlas.contentWidth, atlas.contentHeight,
        );
        const components = analyze(content, atlas.contentWidth, atlas.contentHeight, cleanup.alphaThreshold);
        const main = components[0]!;
        const override = cleanup.perFrameOverrides[String(frame)] ?? {};
        const maximumGap = override.maximumComponentGap ?? cleanup.maximumComponentGap;
        const significant = components.filter((component) => component.alphaArea >= cleanup.minimumComponentArea);
        const totalAlpha = significant.reduce((sum, component) => sum + component.alphaArea, 0);
        const forbidden = components.slice(1).filter((component) => {
          const detachedAbove = component.minY <= cleanup.boundaryMargin && component.maxY < main.minY;
          const remote = component.alphaArea >= cleanup.minimumComponentArea
            && component.gapToMain > maximumGap;
          const side = (component.minX <= cleanup.boundaryMargin
              || component.maxX >= atlas.contentWidth - 1 - cleanup.boundaryMargin)
            && component.gapToMain > maximumGap && !override.allowBoundaryComponents;
          return detachedAbove || remote || side;
        });
        frames.push({
          frame,
          componentCount: components.length,
          components,
          forbidden,
          mainAlphaShare: main.alphaArea / totalAlpha,
          paddingOpaquePixels,
          contentInBounds: atlas.padding + atlas.contentWidth <= atlas.frameWidth
            && atlas.padding + atlas.contentHeight <= atlas.frameHeight,
        });
      }
      results.push({ id, frames, cleanupReports: cleanup.frameReports });
    }
    return results;
  }, atlasIds);

  expect(reports).toHaveLength(6);
  for (const atlas of reports) {
    expect(atlas.frames, `${atlas.id} must expose all animation frames`).toHaveLength(20);
    expect(atlas.cleanupReports, `${atlas.id} must record cleanup for all frames`).toHaveLength(20);
    for (const frame of atlas.frames) {
      expect(frame.contentInBounds, `${atlas.id}:${frame.frame} content bounds`).toBe(true);
      expect(frame.paddingOpaquePixels, `${atlas.id}:${frame.frame} transparent padding`).toBe(0);
      expect(frame.forbidden, `${atlas.id}:${frame.frame} detached components`).toEqual([]);
      expect(frame.mainAlphaShare, `${atlas.id}:${frame.frame} dominant silhouette`).toBeGreaterThan(0.8);
    }
  }
  expect(reports.flatMap((atlas) => atlas.cleanupReports)
    .reduce((sum, frame) => sum + frame.removed.length, 0)).toBeGreaterThan(100);
});

test("grunt and runner frame gallery matches the reviewed clean baseline", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const ids = ["grunt", "runner"];
    const cellWidth = 86;
    const cellHeight = 102;
    const gutter = 12;
    const titleHeight = 38;
    const canvas = document.createElement("canvas");
    canvas.id = "monster-frame-gallery";
    canvas.width = gutter * 3 + cellWidth * 8;
    canvas.height = titleHeight + gutter * 3 + cellHeight * 5;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#17324a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    for (let atlasIndex = 0; atlasIndex < ids.length; atlasIndex += 1) {
      const id = ids[atlasIndex]!;
      const metadata = await fetch(`/assets/monsters/${id}/atlas.json`).then((response) => response.json());
      const image = new Image();
      image.src = `/assets/monsters/${id}/${metadata.atlas.file}`;
      await image.decode();
      context.fillStyle = "#f8fafc";
      context.font = "bold 18px sans-serif";
      context.fillText(id, gutter + atlasIndex * (cellWidth * 4 + gutter), 25);
      for (let frame = 0; frame < 20; frame += 1) {
        const column = frame % 4 + atlasIndex * 4;
        const row = Math.floor(frame / 4);
        const x = gutter + column * cellWidth + (atlasIndex > 0 ? gutter : 0);
        const y = titleHeight + gutter + row * cellHeight;
        context.fillStyle = (frame + atlasIndex) % 2 === 0 ? "#e7d7b3" : "#b9d7dc";
        context.fillRect(x, y, 78, 92);
        const atlas = metadata.atlas;
        context.drawImage(
          image,
          frame % atlas.columns * atlas.frameWidth + atlas.padding,
          Math.floor(frame / atlas.columns) * atlas.frameHeight + atlas.padding,
          atlas.contentWidth,
          atlas.contentHeight,
          x + 7,
          y + 8,
          64,
          76,
        );
        context.fillStyle = "#0f172a";
        context.font = "bold 11px monospace";
        context.fillText(String(frame).padStart(2, "0"), x + 3, y + 13);
      }
    }
    Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "99999" });
    document.body.append(canvas);
  });
  await expect(page.locator("#monster-frame-gallery")).toHaveScreenshot("monster-frame-gallery.png", {
    animations: "disabled",
  });
});

test("a stable crowded road scene matches the reviewed clean baseline", async ({ page }, testInfo: TestInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startBattle(page);
  const canvas = page.locator("canvas.game-canvas");
  await page.evaluate(() => {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
    for (let index = 0; index < 24; index += 1) {
      window.__GAME_DEBUG__!.spawnEnemy("runner", 0.10 + index * 0.015);
    }
    for (let index = 0; index < 8; index += 1) {
      window.__GAME_DEBUG__!.spawnEnemy("grunt", 0.47 + index * 0.025);
    }
    window.__GAME_DEBUG__!.clearPresentationEffects();
    window.__GAME_DEBUG__!.renderMonsterFrame(4);
  });
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.enemies.length ?? 0)).toBe(32);
  await expect(canvas).toHaveAttribute("data-monster-visual-states", /:4(?:,|$)/);
  await expect(canvas).toHaveScreenshot("crowded-monster-scene.png", { animations: "disabled" });
  const auditDirectory = path.join(process.cwd(), "artifacts", "monster-frame-cleanup");
  mkdirSync(auditDirectory, { recursive: true });
  await canvas.screenshot({
    path: path.join(auditDirectory, "crowded-scene-after.png"),
    animations: "disabled",
  });
  const screenshotPath = testInfo.outputPath("crowded-scene-after.png");
  await canvas.screenshot({ path: screenshotPath, animations: "disabled" });
  await testInfo.attach("crowded-scene-after", { path: screenshotPath, contentType: "image/png" });
});

test("capture the legacy crowded scene from the parent commit on demand", async ({ page }) => {
  test.skip(process.env.CAPTURE_LEGACY_MONSTER_SCENE !== "1", "diagnostic artifact generator");
  for (const id of atlasIds) {
    const assetPath = `public/assets/monsters/${id}/atlas-placeholder.png`;
    const legacyAtlas = execFileSync("git", ["show", `cc18e55:${assetPath}`], { maxBuffer: 8_000_000 });
    await page.route(`**/assets/monsters/${id}/atlas-placeholder.png`, (route) => route.fulfill({
      body: legacyAtlas,
      contentType: "image/png",
    }));
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startBattle(page);
  await page.evaluate(() => {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
    for (let index = 0; index < 24; index += 1) {
      window.__GAME_DEBUG__!.spawnEnemy("runner", 0.10 + index * 0.015);
    }
    for (let index = 0; index < 8; index += 1) {
      window.__GAME_DEBUG__!.spawnEnemy("grunt", 0.47 + index * 0.025);
    }
    window.__GAME_DEBUG__!.clearPresentationEffects();
    window.__GAME_DEBUG__!.renderMonsterFrame(4);
  });
  const outputDirectory = path.join(process.cwd(), "artifacts", "monster-frame-cleanup");
  mkdirSync(outputDirectory, { recursive: true });
  await page.locator("canvas.game-canvas").screenshot({
    path: path.join(outputDirectory, "crowded-scene-before.png"),
    animations: "disabled",
  });
});

test("capture campaign monster close-ups for manual audit on demand", async ({ page }) => {
  test.skip(process.env.CAPTURE_MONSTER_CAMPAIGN_AUDIT !== "1", "manual visual audit generator");
  const allLevels = ["level-1", "level-2", "level-3", "level-4", "level-5", "level-6", "level-7", "level-8"];
  await page.addInitScript((levelIds) => {
    localStorage.setItem("river-outpost.settings", JSON.stringify({
      version: 3,
      tutorialSeen: true,
      difficulty: "normal",
      speed: 1,
      soundEnabled: false,
      musicVolume: 0,
      sfxVolume: 0,
      selectedLevelId: "level-1",
      unlockedLevelIds: levelIds,
      completedLevelIds: levelIds.slice(0, 7),
      bestScoreByLevel: {},
      bestDifficultyByLevel: {},
      heroLevel: 20,
      heroXp: 0,
      heroSkillPoints: 0,
      heroSkills: {
        keenEye: 2, rapidVolley: 1, piercingArrow: 0, rallyAura: 1,
        multishot: 2, venomArrows: 0, frostArrows: 1,
        rainOfArrows: 1, windStep: 1, huntersMark: 1,
      },
      heroAbilityCooldowns: { rainOfArrows: 0, windStep: 0, huntersMark: 0 },
    }));
  }, allLevels);
  const audits = [
    { level: 1, types: ["runner", "grunt"] },
    { level: 2, types: ["runner", "swarm", "grunt"] },
    { level: 5, types: ["berserker", "warBannerCaptain", "runner"] },
    { level: 8, types: ["dreadPaladin", "eclipseKing", "boss"] },
  ];
  const outputDirectory = path.join(process.cwd(), "artifacts", "monster-frame-cleanup");
  mkdirSync(outputDirectory, { recursive: true });
  for (const audit of audits) {
    await page.goto("/");
    await page.getByRole("button", { name: "New Game" }).click();
    await page.getByRole("button", { name: new RegExp(`Play Level ${audit.level}`) }).click();
    await page.getByRole("button", { name: /Commander/ }).click();
    await page.evaluate(({ types }) => {
      window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
      for (let index = 0; index < 18; index += 1) {
        window.__GAME_DEBUG__!.spawnEnemy(types[index % types.length]!, 0.12 + index * 0.025);
      }
      window.__GAME_DEBUG__!.clearPresentationEffects();
      window.__GAME_DEBUG__!.renderMonsterFrame(4);
      const source = document.querySelector<HTMLCanvasElement>("canvas.game-canvas")!;
      const enemies = window.__GAME_DEBUG__!.enemies;
      const minX = Math.max(0, Math.min(...enemies.map((enemy) => enemy.position.x)) - 70);
      const maxX = Math.min(source.width, Math.max(...enemies.map((enemy) => enemy.position.x)) + 70);
      const minY = Math.max(0, Math.min(...enemies.map((enemy) => enemy.position.y)) - 125);
      const maxY = Math.min(source.height, Math.max(...enemies.map((enemy) => enemy.position.y)) + 45);
      const zoom = document.createElement("canvas");
      zoom.id = "monster-campaign-audit";
      zoom.width = Math.ceil((maxX - minX) * 2);
      zoom.height = Math.ceil((maxY - minY) * 2);
      const context = zoom.getContext("2d")!;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        source,
        minX, minY, maxX - minX, maxY - minY,
        0, 0, zoom.width, zoom.height,
      );
      Object.assign(zoom.style, { position: "fixed", inset: "0", zIndex: "99999" });
      document.body.append(zoom);
    }, audit);
    await page.locator("#monster-campaign-audit").screenshot({
      path: path.join(outputDirectory, `manual-level-${audit.level}-monster-zoom.png`),
      animations: "disabled",
    });
  }
});

async function startBattle(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /Play Level 1/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const tutorial = page.getByRole("heading", { name: "Defend the outpost" });
  if (await tutorial.isVisible()) await page.getByRole("button", { name: "Begin defense" }).click();
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
