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

  get pendingCount() {
    return this.queue.length;
  }

  snapshot() {
    return {
      waveIndex: this.waveIndex,
      elapsed: this.elapsed,
      active: this.active,
      queue: this.queue.map((entry) => ({ ...entry })),
    };
  }

  restore(snapshot) {
    if (!Number.isInteger(snapshot?.waveIndex) || snapshot.waveIndex < -1) {
      throw new Error('Save has an invalid wave index');
    }
    if (!Number.isFinite(snapshot.elapsed) || snapshot.elapsed < 0 || !Array.isArray(snapshot.queue)) {
      throw new Error('Save has invalid wave runtime data');
    }
    if (snapshot.waveIndex >= this.definitions.length
      || snapshot.queue.some((entry) =>
        !Number.isFinite(entry?.at)
        || entry.at < 0
        || typeof entry.type !== 'string')) {
      throw new Error('Save has an invalid wave queue');
    }
    this.waveIndex = snapshot.waveIndex;
    this.elapsed = snapshot.elapsed;
    this.active = snapshot.active === true;
    this.queue = snapshot.queue.map((entry) => ({ at: entry.at, type: entry.type }));
  }
}

export default WaveSystem;
