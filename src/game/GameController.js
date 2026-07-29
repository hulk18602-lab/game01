import { Outcome, OutcomeSystem } from './OutcomeSystem.js';
import { GameSession } from './GameSession.js';

export const GameState = Object.freeze({
  PLAYING: Outcome.RUNNING,
  VICTORY: Outcome.VICTORY,
  DEFEAT: Outcome.DEFEAT,
});

export class GameController {
  /**
   * @param {{baseHealth?:number, createInitialState?:function, onStateChange?:function}} options
   */
  constructor(options = {}) {
    this.createInitialState = options.createInitialState || (() => ({
      baseHealth: options.baseHealth ?? 100,
      allWavesReleased: false,
      activeEnemyCount: 0,
    }));
    this.onStateChange = options.onStateChange || (() => {});
    this.session = null;
    this.outcomeSystem = null;
    this.restart();
  }

  get state() {
    return this.session.state;
  }

  get gameState() {
    return this.outcomeSystem.outcome;
  }

  update() {
    return this.outcomeSystem.update(this.session.state);
  }

  transitionTo(nextState) {
    if (this.gameState !== GameState.PLAYING || nextState === GameState.PLAYING) return false;
    if (nextState !== GameState.VICTORY && nextState !== GameState.DEFEAT) {
      throw new RangeError(`Unknown game state: ${nextState}`);
    }
    this.outcomeSystem.outcome = nextState;
    this.onStateChange(nextState);
    return true;
  }

  restart() {
    if (this.outcomeSystem) this.outcomeSystem.dispose();
    if (this.session) this.session.dispose();

    const initialState = this.createInitialState();
    if (!initialState || typeof initialState !== 'object') {
      throw new TypeError('createInitialState must return a new state object');
    }
    this.session = new GameSession(initialState);
    // OutcomeSystem has already committed its result before notifying us.
    this.outcomeSystem = new OutcomeSystem((outcome) => this.onStateChange(outcome));
    this.onStateChange(GameState.PLAYING);
    return this.session;
  }

  dispose() {
    this.outcomeSystem.dispose();
    this.session.dispose();
  }
}

export default GameController;
