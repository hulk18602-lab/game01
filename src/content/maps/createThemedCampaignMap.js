const key = ({ x, y }) => `${x},${y}`;

export function routeFromWaypoints(waypoints) {
  const route = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index];
    const to = waypoints[index + 1];
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    if (dx !== 0 && dy !== 0) throw new Error("Route segments must be orthogonal");
    const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    for (let step = index === 0 ? 0 : 1; step <= distance; step += 1) {
      route.push(Object.freeze({ x: from.x + dx * step, y: from.y + dy * step }));
    }
  }
  const unique = new Set(route.map(key));
  if (unique.size !== route.length) throw new Error("Campaign route cannot intersect itself");
  return Object.freeze(route);
}

export function createThemedLayout({ width, height, route, ground = ".", decorations = [] }) {
  const routeCells = new Set(route.map(key));
  const rows = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "#" : ground,
    ),
  );
  for (const decoration of decorations) {
    for (let y = decoration.y; y < decoration.y + decoration.height; y += 1) {
      for (let x = decoration.x; x < decoration.x + decoration.width; x += 1) {
        if (!routeCells.has(`${x},${y}`) && rows[y]?.[x] !== "#") rows[y][x] = decoration.tile;
      }
    }
  }
  for (const cell of route) rows[cell.y][cell.x] = "=";
  return Object.freeze(rows.map((row) => row.join("")));
}

export function themedLegend({ ground, road, obstacle, accent, accentId }) {
  return Object.freeze({
    ".": Object.freeze({ id: "ground", walkable: true, buildable: true, movementCost: 1, color: ground }),
    "=": Object.freeze({ id: "road", walkable: true, buildable: false, movementCost: 1, color: road }),
    "#": Object.freeze({ id: "rock", walkable: false, buildable: false, movementCost: Infinity, color: obstacle }),
    "!": Object.freeze({ id: accentId, walkable: false, buildable: false, movementCost: Infinity, color: accent }),
    "~": Object.freeze({ id: accentId, walkable: false, buildable: false, movementCost: Infinity, color: accent }),
    "^": Object.freeze({ id: "crag", walkable: false, buildable: false, movementCost: Infinity, color: obstacle }),
  });
}
