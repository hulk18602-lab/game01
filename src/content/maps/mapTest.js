const legend = Object.freeze({
  ".": Object.freeze({ id: "grass", walkable: true, buildable: true, movementCost: 1, color: "#6f9b45" }),
  "~": Object.freeze({ id: "water", walkable: false, buildable: false, movementCost: Infinity, color: "#397aa8" }),
  "#": Object.freeze({ id: "rock", walkable: false, buildable: false, movementCost: Infinity, color: "#59616a" }),
  "=": Object.freeze({ id: "road", walkable: true, buildable: false, movementCost: 1, color: "#9a7147" }),
});

const layout = Object.freeze([
  "############",
  "#..........#",
  "#..........#",
  "#==========#",
  "#..........#",
  "#..~~......#",
  "#..........#",
  "############",
]);

const enemyRoute = Object.freeze(
  Array.from({ length: 10 }, (_, index) => Object.freeze({ x: 10 - index, y: 3 })),
);

/** Small deterministic browser-only scenario used by Playwright happy-path coverage. */
const mapTest = Object.freeze({
  id: "map-test",
  name: "Training Ford",
  width: 12,
  height: 8,
  tileSize: 48,
  layout,
  legend,
  enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 1, y: 3 }),
    enemies: Object.freeze([Object.freeze({ x: 10, y: 3 })]),
  }),
});

export default mapTest;
