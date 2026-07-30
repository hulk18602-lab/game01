import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TILE_SIZE = 48;

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ animations: "disabled", fullPage: true, path });
  await testInfo.attach(name, {
    path,
    contentType: "image/png",
  });
}

async function startGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /Play Level 1/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const tutorial = page.getByRole("heading", { name: "Defend the outpost" });
  if (await tutorial.isVisible()) {
    await page.getByRole("button", { name: "Begin defense" }).click();
  }
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
}

async function clickCell(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no layout box");
  const world = await page.evaluate(() => ({
    width: window.__GAME_DEBUG__?.worldWidth ?? 960,
    height: window.__GAME_DEBUG__?.worldHeight ?? 576,
  }));
  await page.mouse.click(
    bounds.x + ((x + 0.5) * TILE_SIZE / world.width) * bounds.width,
    bounds.y + ((y + 0.5) * TILE_SIZE / world.height) * bounds.height,
  );
}

test("fantasy menu and battlefield produce a varied procedural canvas", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "River Outpost" })).toBeVisible();
  await attachScreenshot(page, testInfo, "fantasy-main-menu");

  await startGame(page);
  const canvas = page.locator("canvas.game-canvas");
  await page.getByRole("button", { name: /^Basic tower/ }).click();
  await clickCell(page, canvas, 4, 4);
  await page.getByRole("button", { name: /Start wave/ }).click();
  await page.waitForTimeout(700);

  const distinctColors = await canvas.evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext("2d");
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, node.width, node.height).data;
    const colors = new Set<number>();
    const step = Math.max(4, Math.floor(Math.min(node.width, node.height) / 28));
    for (let y = 0; y < node.height; y += step) {
      for (let x = 0; x < node.width; x += step) {
        const index = (y * node.width + x) * 4;
        colors.add((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!);
      }
    }
    return colors.size;
  });
  expect(distinctColors).toBeGreaterThan(45);
  await attachScreenshot(page, testInfo, "fantasy-battlefield");
});

test.describe("retina and responsive canvas", () => {
  test.use({ deviceScaleFactor: 2 });

  test("keeps DPR backing resolution and mouse coordinates after resize", async ({ page }, testInfo) => {
    await startGame(page);
    const canvas = page.locator("canvas.game-canvas");
    const initial = await canvas.evaluate((node: HTMLCanvasElement) => ({
      backingWidth: node.width,
      cssWidth: node.getBoundingClientRect().width,
    }));
    expect(initial.backingWidth / initial.cssWidth).toBeCloseTo(2, 1);

    await page.setViewportSize({ width: 940, height: 690 });
    await expect.poll(
      () => canvas.evaluate((node: HTMLCanvasElement) => node.width),
    ).not.toBe(initial.backingWidth);

    await page.getByRole("button", { name: /^Basic tower/ }).click();
    await clickCell(page, canvas, 4, 4);
    await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towers.length ?? 0)).toBe(1);
    expect(await page.evaluate(() => window.__GAME_DEBUG__?.towers[0]?.position)).toEqual({
      x: 216,
      y: 216,
    });
    await attachScreenshot(page, testInfo, "retina-resized-battlefield");
  });
});

test("prefers-reduced-motion disables animated camera motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startGame(page);
  await expect.poll(
    () => page.evaluate(() => window.__GAME_DEBUG__?.reducedMotion ?? false),
  ).toBe(true);
  await attachScreenshot(page, testInfo, "reduced-motion-battlefield");
});
