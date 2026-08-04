import { createThemedLayout, routeFromWaypoints, themedLegend } from "./createThemedCampaignMap.js";

export const enemyRoute = routeFromWaypoints([
  { x: 29, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 5 },
  { x: 28, y: 5 }, { x: 28, y: 8 }, { x: 4, y: 8 },
  { x: 4, y: 11 }, { x: 13, y: 11 },
]);
export const legend = themedLegend({
  ground: "#3d3650", road: "#64506c", obstacle: "#252234", accent: "#6d28a8", accentId: "void-rift",
});
export const layout = createThemedLayout({
  width: 32, height: 18, route: enemyRoute,
  decorations: [
    { x: 9, y: 3, width: 6, height: 1, tile: "^" },
    { x: 18, y: 9, width: 6, height: 2, tile: "!" },
    { x: 7, y: 12, width: 4, height: 3, tile: "^" },
    { x: 14, y: 12, width: 4, height: 2, tile: "!" },
    { x: 26, y: 12, width: 3, height: 3, tile: "^" },
  ],
});
export default Object.freeze({
  id: "map08", name: "Eclipse Throne", width: 32, height: 18, tileSize: 48,
  layout, legend, enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 16, y: 12 }),
    enemies: Object.freeze([Object.freeze({ x: 29, y: 2 })]),
  }),
});
