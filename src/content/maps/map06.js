import { createThemedLayout, routeFromWaypoints, themedLegend } from "./createThemedCampaignMap.js";

export const enemyRoute = routeFromWaypoints([
  { x: 27, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 5 },
  { x: 26, y: 5 }, { x: 26, y: 8 }, { x: 9, y: 8 }, { x: 9, y: 9 },
]);

export const legend = themedLegend({
  ground: "#b7ced8", road: "#8297a3", obstacle: "#526774", accent: "#5aa6c8", accentId: "frozen-water",
});
export const layout = createThemedLayout({
  width: 30, height: 17, route: enemyRoute,
  decorations: [
    { x: 8, y: 3, width: 5, height: 1, tile: "^" },
    { x: 18, y: 9, width: 6, height: 2, tile: "~" },
    { x: 2, y: 10, width: 4, height: 3, tile: "~" },
    { x: 12, y: 12, width: 4, height: 2, tile: "^" },
  ],
});

export default Object.freeze({
  id: "map06", name: "Frostbound Labyrinth", width: 30, height: 17, tileSize: 48,
  layout, legend, enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 14, y: 11 }),
    enemies: Object.freeze([Object.freeze({ x: 27, y: 2 })]),
  }),
});
