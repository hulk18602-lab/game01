'use strict';

const Outcome = Object.freeze({
  RUNNING: 'running',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
});

/**
 * Determines the result of a game session.  The system deliberately owns no
 * timers and mutates no world data, which makes it safe to replace on restart.
 */
class OutcomeSystem {
  constructor(onOutcome = () => {}) {
    if (typeof onOutcome !== 'function') {
      throw new TypeError('onOutcome must be a function');
    }
    this.onOutcome = onOutcome;
    this.outcome = Outcome.RUNNING;
  }

  /**
   * @param {{baseHealth:number, allWavesReleased:boolean, activeEnemyCount:number}} snapshot
   */
  update(snapshot) {
    if (this.outcome !== Outcome.RUNNING) return this.outcome;
    if (!snapshot) throw new TypeError('A game snapshot is required');

    let next = Outcome.RUNNING;
    // Defeat has priority in the (possible) frame where both conditions hold.
    if (snapshot.baseHealth <= 0) {
      next = Outcome.DEFEAT;
    } else if (snapshot.allWavesReleased && snapshot.activeEnemyCount === 0) {
      next = Outcome.VICTORY;
    }

    if (next !== Outcome.RUNNING) {
      this.outcome = next;
      this.onOutcome(next);
    }
    return this.outcome;
  }

  dispose() {
    this.onOutcome = () => {};
  }
}

module.exports = { Outcome, OutcomeSystem };
