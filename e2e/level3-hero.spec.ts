import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TILE_SIZE = 48;

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function cellPoint(
  canvas: Locator,
  x: number,
  y: number,
): Promise<{ readonly x: number; readonly y: number }> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no layout box");
  const world = await canvas.evaluate((node: HTMLCanvasElement) => ({
    width: window.__GAME_DEBUG__?.worldWidth ?? node.width,
    height: window.__GAME_DEBUG__?.worldHeight ?? node.height,
  }));
  return {
    x: bounds.x + (((x + 0.5) * TILE_SIZE) / world.width) * bounds.width,
    y: bounds.y + (((y + 0.5) * TILE_SIZE) / world.height) * bounds.height,
  };
}

test("Level 3 archer moves, fires arrows and earns one normal kill reward", async (
  { page },
  testInfo: TestInfo,
) => {
  test.setTimeout(45_000);
  const browserErrors = collectBrowserErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("river-outpost.settings", JSON.stringify({
      version: 2,
      tutorialSeen: true,
      difficulty: "normal",
      speed: 1,
      soundEnabled: false,
      musicVolume: 0.34,
      sfxVolume: 0.62,
      selectedLevelId: "level-3",
      unlockedLevelIds: ["level-1", "level-2", "level-3"],
      completedLevelIds: ["level-1", "level-2"],
      bestScoreByLevel: { "level-1": 1000, "level-2": 2000 },
      bestDifficultyByLevel: { "level-1": "normal", "level-2": "normal" },
      heroLevel: 1,
    }));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("button", { name: /Play Level 3/ })).toBeEnabled();
  await page.getByRole("button", { name: /Play Level 3/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();

  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toHaveAttribute("data-map-id", "map03");
  await expect(canvas).toHaveAttribute("data-hero-rendered", "true");
  await expect(page.getByRole("region", { name: "Hero panel" })).toContainText("Eldrin");
  expect(await page.evaluate(() => {
    const battlefield = document.querySelector("canvas.game-canvas");
    if (!battlefield) throw new Error("Canvas is missing");
    const canvasEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const bodyEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    battlefield.dispatchEvent(canvasEvent);
    document.body.dispatchEvent(bodyEvent);
    return {
      canvasPrevented: canvasEvent.defaultPrevented,
      bodyPrevented: bodyEvent.defaultPrevented,
    };
  })).toEqual({ canvasPrevented: true, bodyPrevented: false });
  expect(await page.evaluate(() => ({
    levelId: window.__GAME_DEBUG__?.levelId,
    mapId: window.__GAME_DEBUG__?.mapId,
    pathLength: window.__GAME_DEBUG__?.pathLength,
    heroId: window.__GAME_DEBUG__?.hero?.id,
    heroIsTower: window.__GAME_DEBUG__?.towers.some(
      (tower) => tower.id === window.__GAME_DEBUG__?.hero?.id,
    ),
  }))).toEqual({
    levelId: "level-3",
    mapId: "map03",
    pathLength: 1920,
    heroId: "hero-eldrin",
    heroIsTower: false,
  });

  const initialPosition = await page.evaluate(() => window.__GAME_DEBUG__!.hero!.position);
  const destinationCell = { x: 19, y: 4 };
  const destination = {
    x: (destinationCell.x + 0.5) * TILE_SIZE,
    y: (destinationCell.y + 0.5) * TILE_SIZE,
  };
  const point = await cellPoint(canvas, destinationCell.x, destinationCell.y);
  await page.mouse.click(point.x, point.y, { button: "right" });
  await page.waitForFunction(
    () => ["walk", "run"].includes(window.__GAME_DEBUG__?.hero?.animationState ?? ""),
    null,
    { timeout: 4_000 },
  );
  await page.waitForFunction(
    (target) => {
      const position = window.__GAME_DEBUG__?.hero?.position;
      return position !== undefined
        && Math.hypot(position.x - target.x, position.y - target.y) < 2;
    },
    destination,
    { timeout: 10_000 },
  );
  const movedPosition = await page.evaluate(() => window.__GAME_DEBUG__!.hero!.position);
  expect(Math.hypot(
    movedPosition.x - initialPosition.x,
    movedPosition.y - initialPosition.y,
  )).toBeGreaterThan(100);
  await page.keyboard.down("a");
  await page.waitForTimeout(350);
  await page.keyboard.up("a");
  await page.waitForFunction(
    (previousX) => (window.__GAME_DEBUG__?.hero?.position.x ?? previousX) < previousX - 10,
    movedPosition.x,
  );

  await page.getByRole("button", { name: /Start wave/ }).click();
  const goldAfterStart = await page.evaluate(() => window.__GAME_DEBUG__!.gold);
  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.hero?.targetId !== null,
    null,
    { timeout: 8_000 },
  );
  await page.waitForFunction(
    () => ["aim", "shoot"].includes(window.__GAME_DEBUG__?.hero?.animationState ?? ""),
    null,
    { timeout: 8_000 },
  );
  await page.waitForFunction(
    () => (window.__GAME_DEBUG__?.hero?.arrowProjectiles.length ?? 0) > 0,
    null,
    { timeout: 8_000 },
  );
  const screenshotPath = testInfo.outputPath("greenwood-archer.png");
  await page.screenshot({ path: screenshotPath, animations: "disabled" });
  await testInfo.attach("greenwood-archer", {
    path: screenshotPath,
    contentType: "image/png",
  });
  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.enemies.some((enemy) =>
      (enemy.health ?? 0) > 0 && (enemy.health ?? 100) < 100
    ) ?? false,
    null,
    { timeout: 8_000 },
  );
  await page.waitForFunction(
    (startingGold) =>
      (window.__GAME_DEBUG__?.hero?.xp ?? 0) >= 10
      && (window.__GAME_DEBUG__?.gold ?? 0) >= startingGold + 10,
    goldAfterStart,
    { timeout: 12_000 },
  );

  const hero = await page.evaluate(() => window.__GAME_DEBUG__!.hero);
  expect(hero?.level).toBe(1);
  expect(hero?.xp).toBeGreaterThanOrEqual(10);
  expect(hero?.facingDirection).toMatch(/north|south|east|west/);
  expect(hero?.animationFrame).toBeGreaterThanOrEqual(0);
  expect(hero?.visualTier).toBe("scout");
  expect(browserErrors).toEqual([]);
});
