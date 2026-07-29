import Enemy from '../entities/Enemy.js';

export class WaveSystem {
  constructor(definitions, { createEnemy = (type) => new Enemy(type) } = {}) {
    this.definitions = definitions;
    this.createEnemy = createEnemy;
    this.waveIndex = -1;
    this.elapsed = 0;
    this.queue = [];
    this.active = false;
  }

  start(index = this.waveIndex + 1) {
    const wave = this.definitions[index];
    if (!wave) return false;
    this.waveIndex = index;
    this.elapsed = 0;
    this.queue = wave.groups.flatMap((group) =>
      Array.from({ length: group.count }, (_, number) => ({
        at: (group.at ?? 0) + number * (group.interval ?? 0),
        type: group.type,
      })),
    ).sort((a, b) => a.at - b.at);
    this.active = true;
    return true;
  }

  /** Returns enemies whose scheduled spawn time was crossed by this tick. */
  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('Delta time must be non-negative');
    if (!this.active) return [];
    this.elapsed += deltaSeconds;
    const spawned = [];
    while (this.queue.length && this.queue[0].at <= this.elapsed) {
      spawned.push(this.createEnemy(this.queue.shift().type));
    }
    if (this.queue.length === 0) this.active = false;
    return spawned;
  }

  get currentWave() {
    return this.definitions[this.waveIndex] ?? null;
  }
}

export default WaveSystem;
