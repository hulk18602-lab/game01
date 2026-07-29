import { GameLoop } from '../core/GameLoop.js';
import { GameSession, GameState } from './GameSession.js';

/** Application boundary connecting the domain session to scheduler and renderer ports. */
export class GameController {
  constructor({
    session = new GameSession(),
    renderer,
    schedule,
    cancel,
    clock,
    loader = null,
  } = {}) {
    if (!renderer || typeof renderer.render !== 'function') {
      throw new TypeError('renderer.render must be a function');
    }
    if (loader !== null && typeof loader !== 'function') throw new TypeError('loader must be a function');

    this.session = session;
    this.renderer = renderer;
    this.loader = loader;
    this.loop = new GameLoop({
      clock,
      schedule,
      cancel,
      update: (deltaSeconds) => this.session.update(deltaSeconds),
      render: (alpha, frame) => this.renderer.render(this.session, alpha, frame),
    });
    this.unsubscribe = this.session.subscribe((state) => {
      if (state === GameState.PAUSED || state === GameState.WON || state === GameState.LOST) {
        this.loop.stop();
        this.renderer.render(this.session, 0, { steps: 0, alpha: 0 });
      }
    });
  }

  async load() {
    if (this.session.state !== GameState.LOADING) return this.session;
    if (this.loader) await this.loader(this.session);
    this.session.ready();
    this.renderer.render(this.session, 0, { steps: 0, alpha: 0 });
    return this.session;
  }

  start() {
    if (this.session.state === GameState.READY) this.session.start();
    else if (this.session.state === GameState.PAUSED) this.session.resume();
    else return false;
    this.loop.start();
    return true;
  }

  pause() {
    if (this.session.state !== GameState.RUNNING) return false;
    this.session.pause();
    return true;
  }

  resume() { return this.start(); }
  win() { if (this.session.state !== GameState.RUNNING) return false; this.session.win(); return true; }
  lose() { if (this.session.state !== GameState.RUNNING) return false; this.session.lose(); return true; }

  destroy() {
    this.loop.stop();
    this.unsubscribe();
  }
}

export default GameController;
