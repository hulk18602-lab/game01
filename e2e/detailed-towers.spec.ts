import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TILE_SIZE = 48;

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function clickCell(
  page: Page,
  canvas: Locator,
  x: number,
  y: number,
  button: "left" | "right" = "left",
): Promise<void> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no layout box");
  const world = await page.evaluate(() => ({
    width: window.__GAME_DEBUG__?.worldWidth ?? 960,
    height: window.__GAME_DEBUG__?.worldHeight ?? 576,
  }));
  await page.mouse.click(
    bounds.x + ((x + 0.5) * TILE_SIZE / world.width) * bounds.width,
    bounds.y + ((y + 0.5) * TILE_SIZE / world.height) * bounds.height,
    { button },
  );
}

async function startLevel(page: Page, level: 1 | 2 | 3): Promise<Locator> {
  await page.addInitScript((selectedLevel) => {
    const unlocked = Array.from({ length: selectedLevel }, (_, index) => `level-${index + 1}`);
    localStorage.setItem("river-outpost.settings", JSON.stringify({
      version: 2,
      tutorialSeen: true,
      difficulty: "normal",
      speed: 1,
      soundEnabled: false,
      musicVolume: 0.34,
      sfxVolume: 0.62,
      selectedLevelId: `level-${selectedLevel}`,
      unlockedLevelIds: unlocked,
      completedLevelIds: unlocked.slice(0, -1),
      bestScoreByLevel: {},
      bestDifficultyByLevel: {},
      heroLevel: 1,
    }));
  }, level);
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: new RegExp(`Play Level ${level}`) }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer.mode)).toBe("detailed");
  await page.evaluate(() => window.__GAME_DEBUG__!.setGold(2_000));
  return canvas;
}

async function build(page: Page, canvas: Locator, type: string, x: number, y: number): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${type} tower`, "i") })
    .evaluate((control: HTMLButtonElement) => control.click());
  await clickCell(page, canvas, x, y);
}

test("Level 1 renders Basic, Frost and Cannon through the detailed tower renderer", async ({ page }, testInfo) => {
  const canvas = await startLevel(page, 1);
  await build(page, canvas, "Basic", 4, 4);
  await build(page, canvas, "Frost", 5, 4);
  await build(page, canvas, "Cannon", 6, 4);

  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer)).toEqual({
    mode: "detailed",
    renderedTowerCount: 3,
    renderedTowerTypes: ["basic", "frost", "cannon"],
  });
  await attachScreenshot(page, testInfo, "level-1-detailed-basic-frost-cannon");
});

test("a tower has visibly distinct Level 1, Level 2 and Level 3 upgrade states", async ({ page }, testInfo) => {
  const canvas = await startLevel(page, 1);
  await build(page, canvas, "Basic", 4, 4);
  await page.keyboard.press("Escape");
  await clickCell(page, canvas, 4, 4);
  const panel = page.getByLabel("Selected tower");

  await expect.poll(() => canvas.getAttribute("data-tower-visual-states")).toContain("tower-1:basic:L1:");
  await attachScreenshot(page, testInfo, "basic-upgrade-level-1");
  await panel.getByRole("button", { name: /Upgrade/ }).click();
  await expect.poll(() => canvas.getAttribute("data-tower-visual-states")).toContain("tower-1:basic:L2:");
  await attachScreenshot(page, testInfo, "basic-upgrade-level-2");
  await panel.getByRole("button", { name: /Upgrade/ }).click();
  await expect.poll(() => canvas.getAttribute("data-tower-visual-states")).toContain("tower-1:basic:L3:");
  await attachScreenshot(page, testInfo, "basic-upgrade-level-3");
});

test("Level 2 gives Tesla and Poison unique detailed silhouettes", async ({ page }, testInfo) => {
  const canvas = await startLevel(page, 2);
  await build(page, canvas, "Tesla", 18, 3);
  await build(page, canvas, "Poison", 17, 3);

  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer)).toEqual({
    mode: "detailed",
    renderedTowerCount: 2,
    renderedTowerTypes: ["tesla", "poison"],
  });
  await expect(canvas).toHaveAttribute("data-tower-visual-architecture", "procedural-medieval-v1");
  await attachScreenshot(page, testInfo, "level-2-detailed-tesla-poison");
});

test("Level 3 renders Eldrin, detailed towers and humanoid monsters while both defenders fire", async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  const canvas = await startLevel(page, 3);
  await build(page, canvas, "Basic", 19, 3);
  await clickCell(page, canvas, 19, 4, "right");
  await page.waitForFunction(
    () => {
      const position = window.__GAME_DEBUG__?.hero?.position;
      return position !== undefined && Math.hypot(position.x - 936, position.y - 216) < 3;
    },
    null,
    { timeout: 10_000 },
  );
  await page.getByRole("button", { name: /Start wave/ }).click();

  await expect(canvas).toHaveAttribute("data-hero-rendered", "true");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer.mode)).toBe("detailed");
  await expect.poll(() => canvas.getAttribute("data-tower-visual-states"), { timeout: 12_000 })
    .toMatch(/tower-1:basic:L1:(tracking|firing):/);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.animationState), { timeout: 12_000 })
    .toMatch(/aim|shoot/);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.targetId), { timeout: 12_000 })
    .not.toBeNull();
  await expect.poll(() => canvas.getAttribute("data-monster-visual-states"), { timeout: 12_000 })
    .toMatch(/:(walk|hit|death):/);
  await attachScreenshot(page, testInfo, "level-3-eldrin-detailed-tower-monsters");
});
