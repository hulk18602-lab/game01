import { createThemedLayout, routeFromWaypoints, themedLegend } from "./createThemedCampaignMap.js";

export const enemyRoute = routeFromWaypoints([
  { x: 25, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 5 },
  { x: 24, y: 5 }, { x: 24, y: 8 }, { x: 13, y: 8 }, { x: 13, y: 9 },
]);

export const legend = themedLegend({
  ground: "#76533f", road: "#3f3530", obstacle: "#342d2b", accent: "#e85d24", accentId: "lava",
});
export const layout = createThemedLayout({
  width: 28, height: 16, route: enemyRoute,
  decorations: [
    { x: 7, y: 3, width: 4, height: 1, tile: "^" },
    { x: 18, y: 9, width: 4, height: 2, tile: "!" },
    { x: 3, y: 10, width: 5, height: 2, tile: "^" },
    { x: 22, y: 12, width: 3, height: 2, tile: "!" },
  ],
});

export default Object.freeze({
  id: "map05", name: "Ashen Highlands", width: 28, height: 16, tileSize: 48,
  layout, legend, enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 14, y: 11 }),
    enemies: Object.freeze([Object.freeze({ x: 25, y: 2 })]),
  }),
});
