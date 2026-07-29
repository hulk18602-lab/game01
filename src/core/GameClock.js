/**
 * Turns variable wall-clock time into deterministic, fixed simulation steps.
 *
 * The clock deliberately knows nothing about requestAnimationFrame (or any other
 * browser API).  Time is supplied by the caller, which also makes the class
 * straightforward to drive in tests and on a server.
 */
export class GameClock {
  constructor({ fixedStepMs = 1000 / 60, maxFrameMs = 250, maxSteps = 15 } = {}) {
    if (!Number.isFinite(fixedStepMs) || fixedStepMs <= 0) {
      throw new RangeError('fixedStepMs must be a positive finite number');
    }
    if (!Number.isFinite(maxFrameMs) || maxFrameMs <= 0) {
      throw new RangeError('maxFrameMs must be a positive finite number');
    }
    if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
      throw new RangeError('maxSteps must be a positive integer');
    }

    this.fixedStepMs = fixedStepMs;
    this.maxFrameMs = maxFrameMs;
    this.maxSteps = maxSteps;
    this.reset();
  }

  reset() {
    this.accumulatorMs = 0;
    this.elapsedMs = 0;
    this.droppedMs = 0;
  }

  /**
   * Consume a frame duration and call update once per complete fixed step.
   * Returns interpolation information for a renderer; rendering is never done
   * by this class.
   */
  advance(frameMs, update) {
    if (!Number.isFinite(frameMs) || frameMs < 0) {
      throw new RangeError('frameMs must be a non-negative finite number');
    }
    if (typeof update !== 'function') {
      throw new TypeError('update must be a function');
    }

    const acceptedMs = Math.min(frameMs, this.maxFrameMs);
    this.droppedMs += frameMs - acceptedMs;
    this.accumulatorMs += acceptedMs;

    let steps = 0;
    while (this.accumulatorMs >= this.fixedStepMs && steps < this.maxSteps) {
      update(this.fixedStepMs / 1000, this.fixedStepMs);
      this.accumulatorMs -= this.fixedStepMs;
      this.elapsedMs += this.fixedStepMs;
      steps += 1;
    }

    // Avoid a permanent spiral of death when maxSteps is configured below the
    // number of steps admitted by maxFrameMs.
    if (this.accumulatorMs >= this.fixedStepMs) {
      const retainedMs = this.accumulatorMs % this.fixedStepMs;
      this.droppedMs += this.accumulatorMs - retainedMs;
      this.accumulatorMs = retainedMs;
    }

    return {
      steps,
      alpha: this.accumulatorMs / this.fixedStepMs,
      elapsedMs: this.elapsedMs,
      droppedMs: this.droppedMs,
    };
  }
}

export default GameClock;
