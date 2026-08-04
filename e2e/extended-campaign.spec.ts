import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TILE_SIZE = 48;
const allLevels = ["level-1", "level-2", "level-3", "level-4", "level-5", "level-6", "level-7", "level-8"];

function settings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 3, tutorialSeen: true, difficulty: "normal", speed: 1,
    soundEnabled: false, musicVolume: 0.34, sfxVolume: 0.62,
    selectedLevelId: "level-5", unlockedLevelIds: allLevels,
    completedLevelIds: allLevels.slice(0, 4), bestScoreByLevel: {}, bestDifficultyByLevel: {},
    heroLevel: 20, heroXp: 0, heroSkillPoints: 9,
    heroSkills: {
      keenEye: 2, rapidVolley: 1, piercingArrow: 0, rallyAura: 1,
      multishot: 2, venomArrows: 0, frostArrows: 1,
      rainOfArrows: 1, windStep: 1, huntersMark: 1,
    },
    heroAbilityCooldowns: { rainOfArrows: 0, windStep: 0, huntersMark: 0 },
    ...overrides,
  };
}

async function worldPoint(canvas: Locator, x: number, y: number): Promise<{ x: number; y: number }> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no layout box");
  const world = await canvas.evaluate((node: HTMLCanvasElement) => ({
    width: window.__GAME_DEBUG__?.worldWidth ?? node.width,
    height: window.__GAME_DEBUG__?.worldHeight ?? node.height,
  }));
  return {
    x: bounds.x + x / world.width * bounds.width,
    y: bounds.y + y / world.height * bounds.height,
  };
}

async function cellPoint(canvas: Locator, x: number, y: number): Promise<{ x: number; y: number }> {
  return worldPoint(canvas, (x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE);
}

async function openLevel(page: Page, level: number): Promise<Locator> {
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: new RegExp(`Play Level ${level}`) }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toHaveAttribute("data-map-id", `map0${level}`);
  return canvas;
}

test("Level 4 victory unlocks Levels 5-8 in sequence and survives reload", async ({ page }) => {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem("river-outpost.settings")) {
      localStorage.setItem("river-outpost.settings", JSON.stringify(seed));
    }
  }, settings({
    selectedLevelId: "level-4",
    unlockedLevelIds: allLevels.slice(0, 4),
    completedLevelIds: allLevels.slice(0, 3),
  }));
  await page.goto("/");
  await openLevel(page, 4);

  for (let level = 4; level <= 8; level += 1) {
    await page.evaluate(() => window.__GAME_DEBUG__!.completeLevel());
    await expect(page.getByRole("heading", { name: level === 8 ? "Campaign completed" : "Victory" })).toBeVisible();
    if (level < 8) {
      await page.getByRole("button", { name: "Next level" }).click();
      await page.getByRole("button", { name: /Commander/ }).click();
      await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.levelId)).toBe(`level-${level + 1}`);
    }
  }
  await expect(page.getByRole("button", { name: "New campaign" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("button", { name: /Play Level 8/ })).toBeEnabled();
});

test("Levels 5-8 render their maps, detailed towers, hero and new humanoid monsters", async ({ page }, testInfo: TestInfo) => {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem("river-outpost.settings")) {
      localStorage.setItem("river-outpost.settings", JSON.stringify(seed));
    }
  }, settings());
  const monsterTypes = ["berserker", "frostboundKnight", "shadowAssassin", "dreadPaladin"];
  for (let level = 5; level <= 8; level += 1) {
    await page.goto("/");
    const canvas = await openLevel(page, level);
    await page.evaluate(() => window.__GAME_DEBUG__!.setGold(2_000));
    await page.getByRole("button", { name: /^Basic tower/ }).click();
    const build = await cellPoint(canvas, 1, 1);
    await page.mouse.click(build.x, build.y);
    await page.getByRole("button", { name: /Start wave/ }).click();
    const monsterType = monsterTypes[level - 5]!;
    const enemyId = await page.evaluate((type) => window.__GAME_DEBUG__!.spawnEnemy(type), monsterType);
    await expect.poll(() => page.evaluate((id) =>
      window.__GAME_DEBUG__?.enemies.some((enemy) => enemy.id === id), enemyId)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.towerRenderer.mode)).toBe("detailed");
    await expect(canvas).toHaveAttribute("data-hero-rendered", "true");
    await expect(canvas).toHaveAttribute("data-monster-visual-architecture", "humanoid-sprite-v1");
    await expect(canvas).toHaveAttribute("data-monster-visual-states", /.+/);
    const screenshotPath = testInfo.outputPath(`level-${level}-campaign.png`);
    await page.screenshot({ path: screenshotPath, animations: "disabled" });
    await testInfo.attach(`level-${level}-campaign`, { path: screenshotPath, contentType: "image/png" });
  }
});

test("Eldrin progression and Q/E/R targeting persist and remain cancellable", async ({ page }) => {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem("river-outpost.settings")) {
      localStorage.setItem("river-outpost.settings", JSON.stringify(seed));
    }
  }, settings({
    heroLevel: 10, heroSkillPoints: 8,
    heroSkills: {
      keenEye: 2, rapidVolley: 1, piercingArrow: 0, rallyAura: 1,
      multishot: 0, venomArrows: 0, frostArrows: 1,
      rainOfArrows: 0, windStep: 0, huntersMark: 0,
    },
  }));
  await page.goto("/");
  let canvas = await openLevel(page, 5);
  await page.evaluate(() => window.__GAME_DEBUG__!.grantHeroXp(2_000));
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.level ?? 0)).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Upgrade Multishot" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Resume saved defense" }).click();
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.skills.multishot)).toBe(1);

  // Load a deterministic level-20 ability build for interaction coverage.
  await page.evaluate((seed) => {
    localStorage.setItem("river-outpost.settings", JSON.stringify(seed));
    localStorage.removeItem("river-outpost.active-game");
  }, settings());
  await page.reload();
  canvas = await openLevel(page, 5);
  await page.getByRole("button", { name: /Start wave/ }).click();
  const enemyId = await page.evaluate(() => window.__GAME_DEBUG__!.spawnEnemy("berserker", 0.5));

  await page.keyboard.press("KeyE");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.selectedHeroAbility)).toBe("windStep");
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.selectedHeroAbility)).toBeNull();

  await page.keyboard.press("KeyR");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.selectedHeroAbility)).toBe("huntersMark");
  const enemyPosition = await page.evaluate((id) => {
    const enemy = window.__GAME_DEBUG__!.enemies.find((candidate) => candidate.id === id)!;
    return enemy.position;
  }, enemyId);
  const enemyPoint = await worldPoint(canvas, enemyPosition.x, enemyPosition.y);
  await page.mouse.click(enemyPoint.x, enemyPoint.y);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.markedTargetId)).toBe(enemyId);

  const healthBefore = await page.evaluate((id) =>
    window.__GAME_DEBUG__!.enemies.find((enemy) => enemy.id === id)!.health, enemyId);
  await page.keyboard.press("KeyQ");
  const refreshedEnemy = await page.evaluate((id) =>
    window.__GAME_DEBUG__!.enemies.find((enemy) => enemy.id === id)!.position, enemyId);
  const rainPoint = await worldPoint(canvas, refreshedEnemy.x, refreshedEnemy.y);
  await page.mouse.click(rainPoint.x, rainPoint.y);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__?.hero?.abilityCooldowns.rainOfArrows ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(({ id, health }) =>
    (window.__GAME_DEBUG__!.enemies.find((enemy) => enemy.id === id)?.health ?? 0) < health,
  { id: enemyId, health: healthBefore })).toBe(true);

  const beforeMove = await page.evaluate(() => window.__GAME_DEBUG__!.hero!.position);
  await page.keyboard.press("KeyE");
  const destination = await cellPoint(canvas, 15, 11);
  await page.mouse.click(destination.x, destination.y);
  await expect.poll(() => page.evaluate((x) => window.__GAME_DEBUG__!.hero!.position.x > x + 10, beforeMove.x)).toBe(true);
  expect(await page.evaluate(() => window.__GAME_DEBUG__!.hero!.abilityCooldowns.windStep)).toBeGreaterThan(0);
});
