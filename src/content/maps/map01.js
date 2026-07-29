/**
 * The first playable map. Tiles are stored row-major and deliberately contain
 * data only: importing a map must never create or mutate game objects.
 */
const legend = Object.freeze({
  ".": Object.freeze({ id: "grass", walkable: true, movementCost: 1, color: "#6f9b45" }),
  "~": Object.freeze({ id: "water", walkable: false, movementCost: Infinity, color: "#397aa8" }),
  "#": Object.freeze({ id: "rock", walkable: false, movementCost: Infinity, color: "#59616a" }),
  ":": Object.freeze({ id: "sand", walkable: true, movementCost: 1.5, color: "#c9ad68" }),
});

const layout = Object.freeze([
  "####################",
  "#....~~............#",
  "#....~~.....####...#",
  "#....:::...........#",
  "#.................:#",
  "#..####...........:#",
  "#.............~~..:#",
  "#.............~~...#",
  "#...::::...........#",
  "#..................#",
  "#..................#",
  "####################",
]);

const map01 = Object.freeze({
  id: "map01",
  name: "River Outpost",
  width: 20,
  height: 12,
  tileSize: 48,
  layout,
  legend,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 2, y: 2 }),
    enemies: Object.freeze([
      Object.freeze({ x: 16, y: 3 }),
      Object.freeze({ x: 15, y: 9 }),
    ]),
  }),
});

export { layout, legend };
export default map01;
