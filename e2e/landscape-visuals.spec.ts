import { expect, test, type Locator, type Page } from "@playwright/test";

const levels = Array.from({ length: 8 }, (_, index) => `level-${index + 1}`);
const biomeIds = ["river-meadow", "serpent-crags", "greenwood", "arcane-citadel", "ashen-highlands", "frostbound", "shadowfen", "eclipse"];
const buildCells = [[4, 4], [18, 3], [12, 12], [16, 11], [14, 12], [20, 13], [20, 14], [20, 14]];

const settings = (level: number) => ({
  version: 3, tutorialSeen: true, difficulty: "normal", speed: 1,
  soundEnabled: false, musicVolume: 0, sfxVolume: 0,
  selectedLevelId: `level-${level}`, unlockedLevelIds: levels,
  completedLevelIds: levels.slice(0, level - 1), bestScoreByLevel: {}, bestDifficultyByLevel: {},
  heroLevel: 20, heroXp: 0, heroSkillPoints: 0,
  heroSkills: { keenEye: 2, rapidVolley: 1, piercingArrow: 0, rallyAura: 1, multishot: 1, venomArrows: 0, frostArrows: 1, rainOfArrows: 1, windStep: 1, huntersMark: 1 },
  heroAbilityCooldowns: { rainOfArrows: 0, windStep: 0, huntersMark: 0 },
});

async function cellPoint(canvas: Locator, x: number, y: number) {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvas has no layout box");
  const world = await canvas.evaluate((node: HTMLCanvasElement) => ({ width: window.__GAME_DEBUG__?.worldWidth ?? node.width, height: window.__GAME_DEBUG__?.worldHeight ?? node.height }));
  return { x: bounds.x + (x + .5) * 48 / world.width * bounds.width, y: bounds.y + (y + .5) * 48 / world.height * bounds.height };
}

async function dispatchPointer(canvas: Locator, type: "pointermove" | "pointerdown", point: { x: number; y: number }, button = 0) {
  await canvas.dispatchEvent(type, { clientX: point.x, clientY: point.y, button, buttons: type === "pointerdown" ? 1 << button : 0, pointerId: 1, pointerType: "mouse" });
}

async function openLevel(page: Page, level: number) {
  await page.addInitScript((seed) => localStorage.setItem("river-outpost.settings", JSON.stringify(seed)), settings(level));
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: new RegExp(`Play Level ${level}`) }).click();
  await page.getByRole("button", { name: /Commander/ }).click();
  return page.locator("canvas.game-canvas");
}

test.describe("campaign landscape architecture", () => {
  test.use({ reducedMotion: "reduce" });

  for (let level = 1; level <= 8; level += 1) {
    test(`Level ${level} renders its biome, route and cosmetic layer without gameplay regressions`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      const canvas = await openLevel(page, level);
      await expect(canvas).toHaveAttribute("data-map-id", `map0${level}`);
      await expect(canvas).toHaveAttribute("data-biome-id", biomeIds[level - 1]!);
      await expect(canvas).toHaveAttribute("data-terrain-cache", "ready");
      await expect(canvas).toHaveAttribute("data-route-visual", "readable");
      const diagnostics = await page.evaluate(() => window.__GAME_DEBUG__!.mapRenderer);
      expect(diagnostics.cacheReady).toBe(true);
      expect((diagnostics.routeCellCount - 1) * 48).toBe(await page.evaluate(() => window.__GAME_DEBUG__!.pathLength));
      expect(diagnostics.buildableCellCount).toBeGreaterThan(0);

      if ([1, 4, 8].includes(level)) {
        const visualOnly = await page.addStyleTag({ content: ".game-ui { display: none !important; }" });
        await expect(canvas).toHaveScreenshot(`level-${level}-map-visual.png`, { animations: "disabled", maxDiffPixelRatio: 0.01 });
        await visualOnly.evaluate((node) => node.remove());
      }

      await page.evaluate(() => window.__GAME_DEBUG__!.setGold(2_000));
      await page.getByRole("button", { name: /^Basic tower/ }).click();
      const [buildX, buildY] = buildCells[level - 1]!;
      const build = await cellPoint(canvas, buildX!, buildY!);
      await dispatchPointer(canvas, "pointermove", build);
      await expect(canvas).toHaveAttribute("data-tower-preview", "basic:valid");
      await dispatchPointer(canvas, "pointerdown", build);
      await page.getByRole("button", { name: /Start wave/ }).click();
      const enemyId = await page.evaluate(() => window.__GAME_DEBUG__!.spawnEnemy("grunt", .15));
      await expect.poll(() => page.evaluate((id) => window.__GAME_DEBUG__!.enemies.some((enemy) => enemy.id === id), enemyId)).toBe(true);
      await expect.poll(() => canvas.getAttribute("data-monster-visual-states")).toContain(enemyId);
      if (level >= 3) {
        await expect(canvas).toHaveAttribute("data-hero-rendered", "true");
        const before = await page.evaluate(() => window.__GAME_DEBUG__!.hero!.position.x);
        await page.keyboard.down("KeyD");
        await page.waitForTimeout(180);
        await page.keyboard.up("KeyD");
        await expect.poll(() => page.evaluate((x) => Math.abs(window.__GAME_DEBUG__!.hero!.position.x - x) > 1, before)).toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }
});
