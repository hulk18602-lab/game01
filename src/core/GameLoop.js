import { GameClock } from './GameClock.js';

/**
 * Coordinates frame scheduling, fixed updates and one render per display frame.
 * Scheduling is an injected port: this module contains no Browser API calls.
 */
export class GameLoop {
  constructor({ clock = new GameClock(), schedule, cancel = () => {}, update, render = () => {} } = {}) {
    if (typeof schedule !== 'function') throw new TypeError('schedule must be a function');
    if (typeof cancel !== 'function') throw new TypeError('cancel must be a function');
    if (typeof update !== 'function') throw new TypeError('update must be a function');
    if (typeof render !== 'function') throw new TypeError('render must be a function');

    this.clock = clock;
    this.schedule = schedule;
    this.cancel = cancel;
    this.update = update;
    this.render = render;
    this.running = false;
    this.frameHandle = null;
    this.previousTimeMs = null;
    this.onFrame = this.onFrame.bind(this);
  }

  start() {
    if (this.running) return false;
    this.running = true;
    this.previousTimeMs = null;
    this.clock.reset();
    this.frameHandle = this.schedule(this.onFrame);
    return true;
  }

  stop() {
    if (!this.running) return false;
    this.running = false;
    if (this.frameHandle !== null) this.cancel(this.frameHandle);
    this.frameHandle = null;
    this.previousTimeMs = null;
    return true;
  }

  onFrame(timeMs) {
    if (!this.running) return;
    if (!Number.isFinite(timeMs)) throw new TypeError('frame timestamp must be finite');

    const frameMs = this.previousTimeMs === null ? 0 : Math.max(0, timeMs - this.previousTimeMs);
    this.previousTimeMs = timeMs;
    const frame = this.clock.advance(frameMs, this.update);

    // Canvas work belongs behind the render callback and happens once, after
    // every simulation update for this display frame has completed.
    this.render(frame.alpha, frame);
    if (this.running) this.frameHandle = this.schedule(this.onFrame);
  }
}

export default GameLoop;
