import { createThemedLayout, routeFromWaypoints, themedLegend } from "./createThemedCampaignMap.js";

export const enemyRoute = routeFromWaypoints([
  { x: 27, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 5 },
  { x: 26, y: 5 }, { x: 26, y: 8 }, { x: 5, y: 8 },
  { x: 5, y: 11 }, { x: 9, y: 11 },
]);
export const legend = themedLegend({
  ground: "#405b48", road: "#584d49", obstacle: "#293833", accent: "#315f57", accentId: "bog",
});
export const layout = createThemedLayout({
  width: 30, height: 18, route: enemyRoute,
  decorations: [
    { x: 8, y: 3, width: 5, height: 1, tile: "^" },
    { x: 17, y: 9, width: 6, height: 3, tile: "~" },
    { x: 2, y: 12, width: 4, height: 3, tile: "~" },
    { x: 11, y: 13, width: 5, height: 2, tile: "^" },
    { x: 25, y: 12, width: 2, height: 3, tile: "^" },
  ],
});
export default Object.freeze({
  id: "map07", name: "Shadowfen March", width: 30, height: 18, tileSize: 48,
  layout, legend, enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 14, y: 12 }),
    enemies: Object.freeze([Object.freeze({ x: 27, y: 2 })]),
  }),
});
