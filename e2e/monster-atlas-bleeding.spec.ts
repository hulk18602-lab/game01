import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function startBattle(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /Play Level 1/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const tutorial = page.getByRole("heading", { name: "Defend the outpost" });
  if (await tutorial.isVisible()) await page.getByRole("button", { name: "Begin defense" }).click();
}

test("integer source rectangles exclude colored neighboring cells with smoothing enabled", async ({ page }) => {
  await page.goto("/");
  const samples = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/assets/monsters/test/frame-boundary-atlas.png";
    await image.decode();
    return [0, 1, 2].map((frame) => {
      const canvas = document.createElement("canvas");
      canvas.width = 4;
      canvas.height = 4;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, frame * 12 + 2, 2, 8, 8, 0, 0, 4, 4);
      return [...context.getImageData(0, 0, 4, 4).data];
    });
  });

  for (const pixels of samples) {
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const [red, green, blue, alpha] = pixels.slice(offset, offset + 4);
      assertPixel(alpha! > 240, "rendered content must remain opaque");
      assertPixel(!(green! > 220 && red! < 40 && blue! < 40), "green neighbor padding leaked into frame");
    }
    const top = pixels.slice(0, 4);
    const bottom = pixels.slice((4 * 3) * 4, (4 * 3 + 1) * 4);
    assertPixel(top[0]! > top[2]!, "top border must remain red-dominant");
    assertPixel(bottom[2]! > bottom[0]!, "bottom border must remain blue-dominant");
  }
});

test("crowded grunt and runner wave uses only validated atlases", async ({ page }, testInfo: TestInfo) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));
  await startBattle(page);
  const canvas = page.locator("canvas.game-canvas");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.monsterAtlases.length ?? 0)).toBe(6);
  const diagnostics = await page.evaluate(() => window.__GAME_DEBUG__!.monsterAtlases);
  expect(diagnostics.every((atlas) => atlas.valid && !atlas.fallbackUsed)).toBe(true);
  expect(diagnostics.every((atlas) => Number.isInteger(atlas.frameWidth) && Number.isInteger(atlas.frameHeight))).toBe(true);
  await expect(canvas).toHaveAttribute("data-monster-atlas-valid", "true");

  await page.evaluate(async () => {
    const image = new Image();
    image.src = "/assets/monsters/grunt/atlas-source-placeholder.png";
    await image.decode();
    const preview = document.createElement("canvas");
    preview.id = "fractional-atlas-reproduction";
    preview.width = 720;
    preview.height = 420;
    Object.assign(preview.style, {
      position: "fixed", inset: "0", margin: "auto", zIndex: "99999",
      width: "720px", height: "420px", background: "#17324a",
    });
    const context = preview.getContext("2d")!;
    context.fillStyle = "#17324a";
    context.fillRect(0, 0, preview.width, preview.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const frameWidth = image.naturalWidth / 4;
    const frameHeight = image.naturalHeight / 5;
    for (let index = 0; index < 32; index += 1) {
      const frame = 4 + index % 4;
      const x = 20 + index % 8 * 86;
      const y = 80 + Math.floor(index / 8) * 86;
      context.drawImage(
        image,
        frame % 4 * frameWidth, Math.floor(frame / 4) * frameHeight,
        frameWidth, frameHeight,
        x, y, 52, 68,
      );
    }
    document.body.append(preview);
  });
  const beforePath = testInfo.outputPath("monster-frame-bleeding-before.png");
  await page.locator("#fractional-atlas-reproduction").screenshot({ path: beforePath });
  await testInfo.attach("monster-frame-bleeding-before", { path: beforePath, contentType: "image/png" });
  await page.locator("#fractional-atlas-reproduction").evaluate((element) => element.remove());

  await page.getByRole("button", { name: /Start wave/ }).click();
  await page.evaluate(() => {
    for (let index = 0; index < 40; index += 1) {
      window.__GAME_DEBUG__!.spawnEnemy(index % 2 === 0 ? "grunt" : "runner", 0.04 + index * 0.018);
    }
  });
  await expect.poll(async () => {
    const states = await canvas.getAttribute("data-monster-visual-states");
    return states?.split(",").filter(Boolean).length ?? 0;
  }).toBeGreaterThan(30);
  const afterPath = testInfo.outputPath("monster-frame-bleeding-after.png");
  await page.screenshot({ path: afterPath, animations: "disabled" });
  await testInfo.attach("monster-frame-bleeding-after", { path: afterPath, contentType: "image/png" });
  expect(browserErrors).toEqual([]);
});

function assertPixel(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
