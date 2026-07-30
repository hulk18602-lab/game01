const legend = Object.freeze({
  ".": Object.freeze({ id: "grass", walkable: true, buildable: true, movementCost: 1, color: "#587d57" }),
  "~": Object.freeze({ id: "water", walkable: false, buildable: false, movementCost: Infinity, color: "#315e8d" }),
  "#": Object.freeze({ id: "rock", walkable: false, buildable: false, movementCost: Infinity, color: "#4d5266" }),
  ":": Object.freeze({ id: "sand", walkable: true, buildable: true, movementCost: 1.4, color: "#b9a46f" }),
  "=": Object.freeze({ id: "road", walkable: true, buildable: false, movementCost: 1, color: "#826990" }),
});

const layout = Object.freeze([
  "##########################",
  "#....~~..................#",
  "#....===================.#",
  "#....=......~~~..........#",
  "#....=..###..............#",
  "#....=.........~~~~......#",
  "#....================....#",
  "#...~~~.............=....#",
  "#........####.......=....#",
  "#..::::.............=....#",
  "#.............=======....#",
  "#......~~~...............#",
  "#..####..................#",
  "#........................#",
  "##########################",
]);

const route = [];
for (let x = 23; x >= 5; x -= 1) route.push(Object.freeze({ x, y: 2 }));
for (let y = 3; y <= 6; y += 1) route.push(Object.freeze({ x: 5, y }));
for (let x = 6; x <= 20; x += 1) route.push(Object.freeze({ x, y: 6 }));
for (let y = 7; y <= 10; y += 1) route.push(Object.freeze({ x: 20, y }));
for (let x = 19; x >= 14; x -= 1) route.push(Object.freeze({ x, y: 10 }));

export const enemyRoute = Object.freeze(route);

const map04 = Object.freeze({
  id: "map04",
  name: "Arcane Citadel",
  width: 26,
  height: 15,
  tileSize: 48,
  layout,
  legend,
  enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 12, y: 11 }),
    enemies: Object.freeze([Object.freeze({ x: 23, y: 2 })]),
  }),
});

export { layout, legend };
export default map04;
