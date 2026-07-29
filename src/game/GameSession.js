'use strict';

/** Resources belonging to precisely one play-through. */
class GameSession {
  constructor(initialState) {
    this.state = initialState;
    this.timers = new Set();
    this.listeners = new Set();
    this.entities = new Set();
    this.disposed = false;
  }

  addTimer(handle, cancel = clearTimeout) {
    const resource = { handle, cancel };
    this.timers.add(resource);
    return handle;
  }

  addInputListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.listeners.add({ target, type, listener, options });
    return listener;
  }

  addEntity(entity) {
    this.entities.add(entity);
    return entity;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    for (const { handle, cancel } of this.timers) cancel(handle);
    for (const registration of this.listeners) {
      const { target, type, listener, options } = registration;
      target.removeEventListener(type, listener, options);
    }
    for (const entity of this.entities) {
      if (entity && typeof entity.dispose === 'function') entity.dispose();
      else if (entity && typeof entity.destroy === 'function') entity.destroy();
    }

    this.timers.clear();
    this.listeners.clear();
    this.entities.clear();
  }
}

module.exports = { GameSession };
