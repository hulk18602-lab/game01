import { getBiomeVisual, terrainMaterial } from "./TerrainVisualCatalog.js";

export const terrainHash = (x, y, salt = 0) => {
  let value = Math.imul(x + 37 + salt, 374761393) ^ Math.imul(y + 91, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

/** Creates immutable, deterministic presentation data; it never enters Grid/pathfinding. */
export function createTerrainRenderPlan({ grid, converter, mapId }) {
  const biome = getBiomeVisual(mapId);
  const cells = [];
  const liquids = [];
  const roads = [];
  const decorations = [];
  let spawn = null;
  let spawnX = -1;
  grid.forEach((tile, position) => {
    const rect = converter.gridRect(position);
    const material = terrainMaterial(tile);
    const cell = Object.freeze({ tile, position, rect, material });
    cells.push(cell);
    if (material === "liquid") liquids.push(cell);
    if (material === "road") {
      roads.push(cell);
      if (position.x > spawnX) {
        spawnX = position.x;
        spawn = converter.gridToWorld(position, { center: true });
      }
      return;
    }
    if (!tile.buildable || material !== "ground" && material !== "sand") return;
    const roll = terrainHash(position.x, position.y, mapId.length * 17);
    if (roll >= biome.density) return;
    const type = biome.decorationTypes[Math.floor(terrainHash(position.x, position.y, 51) * biome.decorationTypes.length)];
    decorations.push(Object.freeze({
      type,
      x: rect.x + rect.width * (0.18 + terrainHash(position.x, position.y, 52) * 0.64),
      y: rect.y + rect.height * (0.2 + terrainHash(position.x, position.y, 53) * 0.58),
      scale: 0.66 + terrainHash(position.x, position.y, 54) * 0.44,
      variant: Math.floor(terrainHash(position.x, position.y, 55) * 4),
    }));
  });
  return Object.freeze({ mapId, biome, width: grid.width * converter.tileSize, height: grid.height * converter.tileSize, cells: Object.freeze(cells), liquids: Object.freeze(liquids), roads: Object.freeze(roads), decorations: Object.freeze(decorations), spawn });
}
