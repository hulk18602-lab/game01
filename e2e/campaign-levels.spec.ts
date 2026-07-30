import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TILE_SIZE = 48;

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
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

async function openLevelSelect(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "River Outpost" })).toBeVisible();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("heading", { name: "Select level" })).toBeVisible();
}

test("level selection starts with Level 1 open and later chapters locked", async ({ page }, testInfo) => {
  await openLevelSelect(page);
  await expect(page.getByRole("button", { name: /Play Level 1 — River Outpost/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Level 2 — Serpent Pass locked/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Level 3 .* locked/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Level 4 .* locked/ })).toBeDisabled();
  await attachScreenshot(page, testInfo, "campaign-level-select");
  await page.getByRole("button", { name: /Play Level 1/ }).click();
  await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
});

test("short Level 1 victory unlocks Level 2 and survives reload", async ({ page }) => {
  test.setTimeout(45_000);
  await openLevelSelect(page, "/?scenario=short");
  await page.getByRole("button", { name: /Play Level 1/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const tutorial = page.getByRole("heading", { name: "Defend the outpost" });
  if (await tutorial.isVisible()) {
    await page.getByRole("button", { name: "Begin defense" }).click();
  }
  const canvas = page.locator("canvas.game-canvas");
  await page.getByRole("button", { name: /^Sniper tower/ }).click();
  await clickCell(page, canvas, 5, 2);
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
  await expect(page.getByRole("button", { name: "Next level" })).toBeVisible();
  await page.getByRole("button", { name: "Level select" }).click();
  await expect(page.getByRole("button", { name: /Play Level 2 — Serpent Pass/ })).toBeEnabled();

  await page.reload();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("button", { name: /Play Level 2 — Serpent Pass/ })).toBeEnabled();
});

test("Level 2 recreates Serpent Pass and Tesla deals damage", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("river-outpost.settings", JSON.stringify({
      version: 2,
      tutorialSeen: true,
      difficulty: "normal",
      speed: 1,
      soundEnabled: false,
      musicVolume: 0.34,
      sfxVolume: 0.62,
      selectedLevelId: "level-2",
      unlockedLevelIds: ["level-1", "level-2"],
      completedLevelIds: ["level-1"],
      bestScoreByLevel: { "level-1": 1000 },
      bestDifficultyByLevel: { "level-1": "normal" },
    }));
  });
  await openLevelSelect(page);
  await page.getByRole("button", { name: /Play Level 2 — Serpent Pass/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();

  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toHaveAttribute("data-map-id", "map02");
  expect(await page.evaluate(() => ({
    levelId: window.__GAME_DEBUG__?.levelId,
    mapId: window.__GAME_DEBUG__?.mapId,
    pathLength: window.__GAME_DEBUG__?.pathLength,
  }))).toEqual({ levelId: "level-2", mapId: "map02", pathLength: 1680 });
  await expect(page.getByRole("button", { name: /^Tesla tower/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Poison tower/ })).toBeVisible();

  await page.getByRole("button", { name: /^Tesla tower/ }).click();
  await clickCell(page, canvas, 18, 3);
  await expect(page.getByText("Gold: 70", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Start wave/ }).click();
  await page.waitForFunction(
    () => (window.__GAME_DEBUG__?.enemies.some((enemy) => (enemy.health ?? 35) < 35) ?? false)
      || (window.__GAME_DEBUG__?.gold ?? 0) > 102,
    null,
    { timeout: 12_000 },
  );
  expect(await page.evaluate(() => window.__GAME_DEBUG__?.towers[0]?.type)).toBe("tesla");
  await attachScreenshot(page, testInfo, "serpent-pass-tesla");
});
