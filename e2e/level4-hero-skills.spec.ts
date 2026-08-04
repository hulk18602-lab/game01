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

test("Level 4 Rally Aura applies and removes temporary effective tower stats", async (
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
      selectedLevelId: "level-4",
      unlockedLevelIds: ["level-1", "level-2", "level-3", "level-4"],
      completedLevelIds: ["level-1", "level-2", "level-3"],
      bestScoreByLevel: {},
      bestDifficultyByLevel: {},
      heroLevel: 5,
      heroXp: 0,
      heroSkillPoints: 3,
      heroSkills: {
        keenEye: 0,
        rapidVolley: 0,
        piercingArrow: 0,
        rallyAura: 1,
      },
    }));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("button", { name: /Play Level 4/ })).toBeEnabled();
  await page.getByRole("button", { name: /Play Level 4/ }).click();
  await page.getByRole("button", { name: /Commander/ }).click();

  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toHaveAttribute("data-map-id", "map04");
  await expect(page.getByRole("complementary", { name: "Hero Skills" })).toContainText(
    "Rally Aura",
  );
  expect(await page.evaluate(() => ({
    levelId: window.__GAME_DEBUG__?.levelId,
    pathLength: window.__GAME_DEBUG__?.pathLength,
    rallyLevel: window.__GAME_DEBUG__?.hero?.skills.rallyAura,
    auraRadius: window.__GAME_DEBUG__?.hero?.auraRadius,
  }))).toEqual({
    levelId: "level-4",
    pathLength: 2256,
    rallyLevel: 1,
    auraRadius: 150,
  });

  await page.getByRole("button", { name: /^Basic tower/ }).click();
  const towerPoint = await cellPoint(canvas, 16, 11);
  await page.mouse.click(towerPoint.x, towerPoint.y);
  await page.waitForFunction(() => window.__GAME_DEBUG__?.towers.length === 1);
  expect(await page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer)).toEqual({
    mode: "detailed",
    renderedTowerCount: 1,
    renderedTowerTypes: ["basic"],
  });
  await expect(canvas).toHaveAttribute("data-tower-visual-architecture", "procedural-medieval-v1");
  expect(await page.evaluate(() => {
    const tower = window.__GAME_DEBUG__!.towers[0]!;
    return {
      auraBuffed: tower.auraBuffed,
      baseDamage: tower.baseDamage,
      effectiveDamage: tower.effectiveDamage,
      baseFireRate: tower.baseFireRate,
      effectiveFireRate: tower.effectiveFireRate,
    };
  })).toEqual({
    auraBuffed: false,
    baseDamage: 20,
    effectiveDamage: 20,
    baseFireRate: 1,
    effectiveFireRate: 1,
  });

  const nearPoint = await cellPoint(canvas, 15, 11);
  await page.mouse.click(nearPoint.x, nearPoint.y, { button: "right" });
  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.towers[0]?.auraBuffed === true,
    null,
    { timeout: 10_000 },
  );
  expect(await page.evaluate(() => {
    const tower = window.__GAME_DEBUG__!.towers[0]!;
    return {
      baseDamage: tower.baseDamage,
      effectiveDamage: tower.effectiveDamage,
      effectiveFireRate: tower.effectiveFireRate,
    };
  })).toEqual({
    baseDamage: 20,
    effectiveDamage: 24,
    effectiveFireRate: 1.15,
  });

  await page.getByRole("button", { name: /Start wave/ }).click();
  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.currentWave === 1
      && window.__GAME_DEBUG__?.towers[0]?.effectiveDamage === 24,
  );

  const screenshotPath = testInfo.outputPath("arcane-citadel-rally-aura.png");
  await page.screenshot({ path: screenshotPath, animations: "disabled" });
  await testInfo.attach("arcane-citadel-rally-aura", {
    path: screenshotPath,
    contentType: "image/png",
  });

  const farPoint = await cellPoint(canvas, 13, 8);
  await page.mouse.click(farPoint.x, farPoint.y, { button: "right" });
  await page.waitForFunction(
    () => window.__GAME_DEBUG__?.towers[0]?.auraBuffed === false,
    null,
    { timeout: 10_000 },
  );
  expect(await page.evaluate(() => {
    const tower = window.__GAME_DEBUG__!.towers[0]!;
    return {
      effectiveDamage: tower.effectiveDamage,
      effectiveFireRate: tower.effectiveFireRate,
    };
  })).toEqual({ effectiveDamage: 20, effectiveFireRate: 1 });
  expect(browserErrors).toEqual([]);
});
