const legend = Object.freeze({
  ".": Object.freeze({ id: "grass", walkable: true, buildable: true, movementCost: 1, color: "#5f984b" }),
  "~": Object.freeze({ id: "water", walkable: false, buildable: false, movementCost: Infinity, color: "#347fa2" }),
  "#": Object.freeze({ id: "rock", walkable: false, buildable: false, movementCost: Infinity, color: "#53636a" }),
  ":": Object.freeze({ id: "sand", walkable: true, buildable: true, movementCost: 1.5, color: "#cdb36e" }),
  "=": Object.freeze({ id: "road", walkable: true, buildable: false, movementCost: 1, color: "#92734d" }),
});

const layout = Object.freeze([
  "########################",
  "#....~~................#",
  "#....=================.#",
  "#....=......~~~........#",
  "#....=..###............#",
  "#....=........~~~~.....#",
  "#....==============....#",
  "#..~~~............=....#",
  "#.......####......=....#",
  "#...::::......=====....#",
  "#............~~~.......#",
  "#..####................#",
  "#......................#",
  "########################",
]);

const route = [];
for (let x = 21; x >= 5; x -= 1) route.push(Object.freeze({ x, y: 2 }));
for (let y = 3; y <= 6; y += 1) route.push(Object.freeze({ x: 5, y }));
for (let x = 6; x <= 18; x += 1) route.push(Object.freeze({ x, y: 6 }));
for (let y = 7; y <= 9; y += 1) route.push(Object.freeze({ x: 18, y }));
for (let x = 17; x >= 14; x -= 1) route.push(Object.freeze({ x, y: 9 }));

export const enemyRoute = Object.freeze(route);

const map03 = Object.freeze({
  id: "map03",
  name: "Greenwood Siege",
  width: 24,
  height: 14,
  tileSize: 48,
  layout,
  legend,
  enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 11, y: 10 }),
    enemies: Object.freeze([Object.freeze({ x: 21, y: 2 })]),
  }),
});

export { layout, legend };
export default map03;
