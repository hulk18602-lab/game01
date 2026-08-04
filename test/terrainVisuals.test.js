import test from "node:test";
import assert from "node:assert/strict";
import map01 from "../src/content/maps/map01.js";
import map02 from "../src/content/maps/map02.js";
import map03 from "../src/content/maps/map03.js";
import map04 from "../src/content/maps/map04.js";
import map05 from "../src/content/maps/map05.js";
import map06 from "../src/content/maps/map06.js";
import map07 from "../src/content/maps/map07.js";
import map08 from "../src/content/maps/map08.js";
import { Grid } from "../src/game/map/Grid.js";
import { CoordinateConverter } from "../src/game/map/CoordinateConverter.js";
import { BIOME_VISUALS, getBiomeVisual } from "../src/rendering/terrain/TerrainVisualCatalog.js";
import { createTerrainRenderPlan } from "../src/rendering/terrain/TerrainRenderPlan.js";

const maps = [map01, map02, map03, map04, map05, map06, map07, map08];

test("every campaign map has a distinct biome visual definition", () => {
  const definitions = maps.map((map) => getBiomeVisual(map.id));
  assert.equal(definitions.length, 8);
  assert.equal(new Set(definitions.map((item) => item.id)).size, 8);
  assert.deepEqual(Object.keys(BIOME_VISUALS), ["map01", "map02", "map03", "map04", "map05", "map06", "map07", "map08"]);
});

test("terrain plans are deterministic and retain route/build readability", () => {
  for (const map of maps) {
    const grid = new Grid(map);
    const converter = new CoordinateConverter(map.tileSize);
    const first = createTerrainRenderPlan({ grid, converter, mapId: map.id });
    const second = createTerrainRenderPlan({ grid, converter, mapId: map.id });
    assert.deepEqual(first.decorations, second.decorations, `${map.id} decor must be stable`);
    assert.equal(first.roads.length, map.enemyRoute.length, `${map.id} route must remain explicit`);
    assert.ok(first.cells.some((cell) => cell.tile.buildable), `${map.id} needs readable buildable terrain`);
    assert.ok(first.decorations.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y)));
  }
});

test("terrain plan classifies every map cell exactly once", () => {
  for (const map of maps) {
    const grid = new Grid(map);
    const plan = createTerrainRenderPlan({ grid, converter: new CoordinateConverter(map.tileSize), mapId: map.id });
    assert.equal(plan.cells.length, map.width * map.height);
    assert.ok(plan.liquids.every((cell) => cell.material === "liquid"));
    assert.ok(plan.roads.every((cell) => cell.material === "road"));
  }
});
