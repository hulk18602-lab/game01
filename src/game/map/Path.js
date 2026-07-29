const key = ({ x, y }) => `${x},${y}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Immutable ordered grid positions, with an A* constructor for game systems. */
export class Path {
  constructor(points = []) {
    this.points = Object.freeze(points.map(({ x, y }) => Object.freeze({ x, y })));
    Object.freeze(this);
  }

  get length() { return this.points.length; }
  get start() { return this.points[0]; }
  get end() { return this.points.at(-1); }
  at(index) { return this.points.at(index); }
  [Symbol.iterator]() { return this.points[Symbol.iterator](); }

  static find(grid, start, goal, options = {}) {
    if (!grid.isWalkable(start) || !grid.isWalkable(goal)) return null;
    const startKey = key(start);
    const goalKey = key(goal);
    const open = new Map([[startKey, { ...start, score: distance(start, goal) }]]);
    const previous = new Map();
    const costs = new Map([[startKey, 0]]);

    while (open.size) {
      const current = [...open.values()].reduce((best, item) => item.score < best.score ? item : best);
      const currentKey = key(current);
      open.delete(currentKey);
      if (currentKey === goalKey) {
        const result = [{ x: goal.x, y: goal.y }];
        let cursor = goalKey;
        while (cursor !== startKey) {
          const parent = previous.get(cursor);
          if (!parent) return null;
          result.push(parent.point);
          cursor = parent.key;
        }
        return new Path(result.reverse());
      }

      for (const neighbor of grid.neighbors(current, options)) {
        const neighborKey = key(neighbor);
        const diagonal = neighbor.x !== current.x && neighbor.y !== current.y;
        const tentative = costs.get(currentKey) + grid.movementCost(neighbor) * (diagonal ? Math.SQRT2 : 1);
        if (tentative >= (costs.get(neighborKey) ?? Infinity)) continue;
        previous.set(neighborKey, { key: currentKey, point: { x: current.x, y: current.y } });
        costs.set(neighborKey, tentative);
        open.set(neighborKey, { ...neighbor, score: tentative + distance(neighbor, goal) });
      }
    }
    return null;
  }
}

export default Path;
