export class Path {
  constructor(points) {
    if (!Array.isArray(points) || points.length < 2) throw new Error('A path needs at least two points');
    this.points = points.map(({ x, y }) => ({ x, y }));
    this.segments = [];
    this.length = 0;
    for (let i = 1; i < this.points.length; i += 1) {
      const from = this.points[i - 1];
      const to = this.points[i];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      this.length += length;
      this.segments.push({ from, to, length, end: this.length });
    }
    if (this.length === 0) throw new Error('A path must have a positive length');
  }

  getPointAt(progress) {
    const distance = Math.min(1, Math.max(0, progress)) * this.length;
    const segment = this.segments.find((item) => distance <= item.end) ?? this.segments.at(-1);
    const start = segment.end - segment.length;
    const ratio = segment.length === 0 ? 0 : (distance - start) / segment.length;
    return {
      x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
      y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
    };
  }
}

export default Path;
