const legend = Object.freeze({
  ".": Object.freeze({ id: "grass", walkable: true, buildable: true, movementCost: 1, color: "#6f9b45" }),
  "~": Object.freeze({ id: "water", walkable: false, buildable: false, movementCost: Infinity, color: "#397aa8" }),
  "#": Object.freeze({ id: "rock", walkable: false, buildable: false, movementCost: Infinity, color: "#59616a" }),
  ":": Object.freeze({ id: "sand", walkable: true, buildable: true, movementCost: 1.5, color: "#c9ad68" }),
  "=": Object.freeze({ id: "road", walkable: true, buildable: false, movementCost: 1, color: "#9a7147" }),
});

const layout = Object.freeze([
  "######################",
  "#....~~..............#",
  "#.....==============.#",
  "#..~~.=.....####.....#",
  "#..~~.=..............#",
  "#.....===========....#",
  "#...####........=....#",
  "#............~..=....#",
  "#.........=======....#",
  "#..::::..............#",
  "#....................#",
  "######################",
]);

const route = [];
for (let x = 19; x >= 6; x -= 1) route.push(Object.freeze({ x, y: 2 }));
for (let y = 3; y <= 5; y += 1) route.push(Object.freeze({ x: 6, y }));
for (let x = 7; x <= 16; x += 1) route.push(Object.freeze({ x, y: 5 }));
for (let y = 6; y <= 8; y += 1) route.push(Object.freeze({ x: 16, y }));
for (let x = 15; x >= 10; x -= 1) route.push(Object.freeze({ x, y: 8 }));

export const enemyRoute = Object.freeze(route);

const map02 = Object.freeze({
  id: "map02",
  name: "Serpent Pass",
  width: 22,
  height: 12,
  tileSize: 48,
  layout,
  legend,
  enemyRoute,
  spawnPoints: Object.freeze({
    player: Object.freeze({ x: 10, y: 8 }),
    enemies: Object.freeze([Object.freeze({ x: 19, y: 2 })]),
  }),
});

export { layout, legend };
export default map02;
