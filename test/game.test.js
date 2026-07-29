import test from 'node:test';
import assert from 'node:assert/strict';
import { GameController, GameState, OutcomeSystem } from '../src/index.js';

test('victory requires the final wave and no active enemies', () => {
  const outcomes = [];
  const system = new OutcomeSystem((result) => outcomes.push(result));
  assert.equal(system.update({ baseHealth: 10, allWavesReleased: false, activeEnemyCount: 0 }), 'running');
  assert.equal(system.update({ baseHealth: 10, allWavesReleased: true, activeEnemyCount: 1 }), 'running');
  assert.equal(system.update({ baseHealth: 10, allWavesReleased: true, activeEnemyCount: 0 }), 'victory');
  system.update({ baseHealth: 0, allWavesReleased: true, activeEnemyCount: 0 });
  assert.deepEqual(outcomes, ['victory']);
});

test('depleted base health causes defeat and takes precedence', () => {
  const system = new OutcomeSystem();
  assert.equal(system.update({ baseHealth: 0, allWavesReleased: true, activeEnemyCount: 0 }), 'defeat');
});

test('controller publishes a single terminal transition', () => {
  const transitions = [];
  const controller = new GameController({ onStateChange: (state) => transitions.push(state) });
  controller.state.allWavesReleased = true;
  controller.update();
  controller.update();
  assert.equal(controller.gameState, GameState.VICTORY);
  assert.deepEqual(transitions, ['running', 'victory']);
});

test('restart disposes old session resources and creates fresh state', () => {
  const states = [];
  let cancelled = 0;
  let removed = 0;
  let destroyed = 0;
  const controller = new GameController({
    createInitialState: () => ({ baseHealth: 20, allWavesReleased: false, activeEnemyCount: 0 }),
    onStateChange: (state) => states.push(state),
  });
  const oldSession = controller.session;
  const oldState = controller.state;
  oldSession.addTimer(123, () => cancelled++);
  oldSession.addInputListener({
    addEventListener() {},
    removeEventListener() { removed++; },
  }, 'click', () => {});
  oldSession.addEntity({ destroy() { destroyed++; } });

  controller.restart();
  assert.notEqual(controller.session, oldSession);
  assert.notEqual(controller.state, oldState);
  assert.equal(oldSession.disposed, true);
  assert.deepEqual([cancelled, removed, destroyed], [1, 1, 1]);
  assert.equal(controller.gameState, GameState.PLAYING);
  assert.deepEqual(states, ['running', 'running']);
});
