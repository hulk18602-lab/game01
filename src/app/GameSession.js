export const GameState = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

const TERMINAL = new Set([GameState.WON, GameState.LOST]);

/** Domain state for one play-through. It has no DOM, Canvas or timing APIs. */
export class GameSession {
  constructor({ simulation = null } = {}) {
    this.simulation = simulation;
    this.state = GameState.LOADING;
    this.listeners = new Set();
  }

  get isTerminal() { return TERMINAL.has(this.state); }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transition(nextState) {
    const allowed = {
      [GameState.LOADING]: [GameState.READY],
      [GameState.READY]: [GameState.RUNNING, GameState.LOADING],
      [GameState.RUNNING]: [GameState.PAUSED, GameState.WON, GameState.LOST],
      [GameState.PAUSED]: [GameState.RUNNING, GameState.READY],
      [GameState.WON]: [GameState.READY, GameState.LOADING],
      [GameState.LOST]: [GameState.READY, GameState.LOADING],
    };
    if (!Object.values(GameState).includes(nextState)) throw new RangeError(`unknown state: ${nextState}`);
    if (nextState === this.state) return false;
    if (!allowed[this.state].includes(nextState)) {
      throw new Error(`invalid game state transition: ${this.state} -> ${nextState}`);
    }
    const previousState = this.state;
    this.state = nextState;
    for (const listener of this.listeners) listener(nextState, previousState);
    return true;
  }

  ready() { return this.transition(GameState.READY); }
  start() { return this.transition(GameState.RUNNING); }
  pause() { return this.transition(GameState.PAUSED); }
  resume() { return this.transition(GameState.RUNNING); }
  win() { return this.transition(GameState.WON); }
  lose() { return this.transition(GameState.LOST); }

  reset(simulation = this.simulation) {
    if (this.state === GameState.RUNNING) throw new Error('cannot reset a running session');
    this.simulation = simulation;
    if (this.state !== GameState.READY) this.transition(GameState.READY);
  }

  update(deltaSeconds) {
    if (this.state !== GameState.RUNNING) return false;
    if (this.simulation && typeof this.simulation.update === 'function') {
      this.simulation.update(deltaSeconds, this);
    }
    return true;
  }
}

export default GameSession;
