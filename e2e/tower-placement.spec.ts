import { expect, test, type Locator, type Page } from "@playwright/test";

const TILE_SIZE = 48;

type DebugEntity = {
  readonly id: string;
  readonly health?: number;
  readonly targetId?: string | null;
};

declare global {
  interface Window {
    __GAME_DEBUG__?: {
      readonly towers: readonly DebugEntity[];
      readonly enemies: readonly DebugEntity[];
      readonly projectiles: readonly DebugEntity[];
      readonly lives: number;
      readonly gold: number;
      readonly score: number;
      readonly currentWave: number;
      readonly phase: string;
      readonly speed: number;
    };
  }
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function startNormalGame(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "River Outpost" })).toBeVisible();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  await page.getByRole("button", { name: /Commander/ }).click();
  const tutorial = page.getByRole("heading", { name: "Defend the outpost" });
  if (await tutorial.isVisible()) {
    await page.getByRole("button", { name: "Begin defense" }).click();
  }
  await expect(page.getByRole("button", { name: /^Basic tower/ })).toBeVisible();
}

async function cellPoint(canvas: Locator, x: number, y: number): Promise<{ x: number; y: number }> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no browser layout box");
  const size = await canvas.evaluate((node: HTMLCanvasElement) => ({
    width: node.width,
    height: node.height,
  }));
  return {
    x: bounds.x + (((x + 0.5) * TILE_SIZE) / size.width) * bounds.width,
    y: bounds.y + (((y + 0.5) * TILE_SIZE) / size.height) * bounds.height,
  };
}

async function moveToCell(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
  const point = await cellPoint(canvas, x, y);
  await page.mouse.move(point.x, point.y);
}

async function clickCell(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
  const point = await cellPoint(canvas, x, y);
  await page.mouse.click(point.x, point.y);
}

async function cellPixel(canvas: Locator, x: number, y: number): Promise<number[]> {
  return canvas.evaluate((node: HTMLCanvasElement, point) => {
    const context = node.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    return [...context.getImageData(
      (point.x + 0.5) * point.tileSize,
      (point.y + 0.5) * point.tileSize,
      1,
      1,
    ).data];
  }, { x, y, tileSize: TILE_SIZE });
}

async function rememberElement(locator: Locator, key: string): Promise<void> {
  await locator.evaluate((node, property) => {
    (window as Window & Record<string, unknown>)[property] = node;
  }, key);
}

async function expectSameElement(locator: Locator, key: string): Promise<void> {
  expect(await locator.evaluate((node, property) =>
    (window as Window & Record<string, unknown>)[property] === node
  , key)).toBe(true);
}

test("menu, tutorial and stable build controls lead to tower placement", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await startNormalGame(page);

  const canvas = page.locator("canvas.game-canvas");
  const basic = page.getByRole("button", { name: /^Basic tower/ });
  const startWave = page.getByRole("button", { name: /Start wave/ });
  const pause = page.getByRole("button", { name: "Pause" });
  const continueButton = page.getByRole("button", { name: "Continue", includeHidden: true });
  const playAgain = page.getByRole("button", { name: "Play again", includeHidden: true });
  await expect(canvas).toBeVisible();

  await rememberElement(basic, "__basicTowerButton");
  await rememberElement(startWave, "__startWaveButton");
  await rememberElement(pause, "__pauseButton");
  await rememberElement(continueButton, "__continueButton");
  await rememberElement(playAgain, "__playAgainButton");
  const basicHandle = await basic.elementHandle();
  const pauseHandle = await pause.elementHandle();
  const continueHandle = await continueButton.elementHandle();
  if (!basicHandle || !pauseHandle || !continueHandle) throw new Error("Expected stable button handles");

  await page.waitForTimeout(400);
  await expectSameElement(basic, "__basicTowerButton");
  await expectSameElement(startWave, "__startWaveButton");
  await expectSameElement(pause, "__pauseButton");
  await expectSameElement(continueButton, "__continueButton");
  await expectSameElement(playAgain, "__playAgainButton");

  await pauseHandle.click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await continueHandle.click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeHidden();

  await basicHandle.click();
  await expect(basic).toHaveAttribute("aria-pressed", "true");

  const firstBaseline = await cellPixel(canvas, 1, 9);
  const secondBaseline = await cellPixel(canvas, 18, 9);
  await moveToCell(page, canvas, 1, 9);
  await page.waitForTimeout(50);
  expect(await cellPixel(canvas, 1, 9)).not.toEqual(firstBaseline);
  await moveToCell(page, canvas, 18, 9);
  await page.waitForTimeout(50);
  expect(await cellPixel(canvas, 1, 9)).toEqual(firstBaseline);
  expect(await cellPixel(canvas, 18, 9)).not.toEqual(secondBaseline);

  await clickCell(page, canvas, 4, 4);
  await expect(page.getByRole("status")).toHaveText("Basic tower built.");
  await expect(page.getByText("Gold: 250", { exact: true })).toBeVisible();
  await expect(basic).toHaveAttribute("aria-pressed", "true");
  expect((await cellPixel(canvas, 4, 4)).slice(0, 3)).toEqual([96, 165, 250]);

  await page.keyboard.press("Escape");
  await clickCell(page, canvas, 4, 4);
  const towerPanel = page.getByLabel("Selected tower");
  await expect(towerPanel).toBeVisible();
  await expect(towerPanel.getByRole("heading", { name: "Basic tower" })).toBeVisible();

  const upgrade = towerPanel.getByRole("button", { name: "Upgrade · 100" });
  const sell = towerPanel.getByRole("button", { name: "Sell · 50" });
  await rememberElement(upgrade, "__upgradeButton");
  await rememberElement(sell, "__sellButton");
  await page.waitForTimeout(350);
  await expectSameElement(upgrade, "__upgradeButton");
  await expectSameElement(sell, "__sellButton");
  expect(browserErrors).toEqual([]);
});

test("road, water and rocks reject placement without charging gold", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await startNormalGame(page);

  const canvas = page.locator("canvas.game-canvas");
  const basic = page.getByRole("button", { name: /^Basic tower/ });
  await basic.click();
  await expect(basic).toHaveAttribute("aria-pressed", "true");

  await clickCell(page, canvas, 4, 3);
  await expect(page.getByRole("status")).toHaveText("Towers cannot be built on the enemy route.");
  await expect(page.getByText("Gold: 350", { exact: true })).toBeVisible();

  await clickCell(page, canvas, 5, 2);
  await expect(page.getByRole("status")).toHaveText("Towers cannot be built on water or rocks.");
  await expect(page.getByText("Gold: 350", { exact: true })).toBeVisible();

  await clickCell(page, canvas, 12, 2);
  await expect(page.getByRole("status")).toHaveText("Towers cannot be built on water or rocks.");
  await expect(page.getByText("Gold: 350", { exact: true })).toBeVisible();
  await expect(basic).toHaveAttribute("aria-pressed", "true");
  expect(browserErrors).toEqual([]);
});

test("tower completes target, projectile, damage, death and reward cycle", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await startNormalGame(page);

  const canvas = page.locator("canvas.game-canvas");
  await page.getByRole("button", { name: /^Basic tower/ }).click();
  await clickCell(page, canvas, 4, 4);
  await expect(page.getByText("Gold: 250", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Start wave/ }).click();

  await page.waitForFunction(() => window.__GAME_DEBUG__ !== undefined);
  const targetHandle = await page.waitForFunction(
    () => window.__GAME_DEBUG__?.towers[0]?.targetId ?? null,
    null,
    { timeout: 15_000 },
  );
  const targetId = await targetHandle.jsonValue() as string;
  expect(targetId).toBeTruthy();

  await page.waitForFunction(
    (id) => window.__GAME_DEBUG__?.projectiles.some((projectile) => projectile.targetId === id),
    targetId,
    { timeout: 5_000 },
  );

  await expect.poll(
    () => page.evaluate(
      (id) => window.__GAME_DEBUG__?.enemies.find((enemy) => enemy.id === id)?.health ?? null,
      targetId,
    ),
    { timeout: 5_000, intervals: [50] },
  ).toBe(80);

  await expect.poll(
    () => page.evaluate(
      (id) => window.__GAME_DEBUG__?.enemies.some((enemy) => enemy.id === id) ?? true,
      targetId,
    ),
    { timeout: 10_000, intervals: [100] },
  ).toBe(false);

  expect(await page.evaluate(() => ({
    gold: window.__GAME_DEBUG__?.gold,
    lives: window.__GAME_DEBUG__?.lives,
    currentWave: window.__GAME_DEBUG__?.currentWave,
  }))).toEqual({ gold: 292, lives: 20, currentWave: 1 });
  await expect(page.getByText("Gold: 292", { exact: true })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("short training map completes the full browser happy path", async ({ page }) => {
  test.setTimeout(45_000);
  const browserErrors = collectBrowserErrors(page);
  await startNormalGame(page, "/?scenario=short");
  const canvas = page.locator("canvas.game-canvas");

  await page.getByRole("button", { name: /^Sniper tower/ }).click();
  await clickCell(page, canvas, 5, 2);
  await expect(page.getByText("Gold: 50", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Game speed 3x" }).click();
  await page.getByRole("button", { name: /Start wave/ }).click();

  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.phase === "preparing"
      && window.__GAME_DEBUG__?.currentWave === 1,
    null,
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: /Start wave/ }).click();
  await expect(page.getByRole("heading", { name: "Victory" })).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => window.__GAME_DEBUG__?.currentWave)).toBe(2);

  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByText("Wave: 0/2", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Main menu" }).click();
  await expect(page.getByRole("heading", { name: "River Outpost" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume saved defense" })).toBeEnabled();
  expect(browserErrors).toEqual([]);
});
