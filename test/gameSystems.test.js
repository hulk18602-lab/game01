import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../src/entities/Enemy.js';
import Path from '../src/path/Path.js';
import MovementSystem from '../src/systems/MovementSystem.js';
import WaveSystem from '../src/systems/WaveSystem.js';

test('movement follows path distance using normalized progress', () => {
  const path = new Path([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  const enemy = new Enemy('grunt', { speed: 100 });
  const movement = new MovementSystem(path);

  assert.deepEqual(movement.update([enemy], 1), []);
  assert.equal(enemy.progress, 0.5);
  assert.deepEqual(enemy.position, { x: 100, y: 0 });

  assert.deepEqual(movement.update([enemy], 1), [enemy]);
  assert.equal(enemy.reachedBase, true);
  assert.equal(enemy.pendingRemoval, false);
});

test('base handling and entity removal are separate operations', () => {
  const enemy = new Enemy('runner');
  enemy.reachedBase = true;
  const movement = new MovementSystem(new Path([{ x: 0, y: 0 }, { x: 1, y: 0 }]));
  let damage = 0;

  movement.handleBaseReached([enemy], (reached) => { damage += reached.baseDamage; });
  assert.equal(damage, 1);
  assert.equal(enemy.removalReason, 'reached-base');
  assert.deepEqual(movement.removeMarked([enemy]), []);
});

test('wave system creates enemies according to declarative schedule', () => {
  const waves = [{ id: 'test', groups: [{ type: 'grunt', count: 3, at: 0, interval: 1 }] }];
  const system = new WaveSystem(waves);
  assert.equal(system.start(), true);
  assert.equal(system.update(0).length, 1);
  assert.equal(system.update(0.9).length, 0);
  assert.equal(system.update(0.1).length, 1);
  assert.equal(system.update(1).length, 1);
  assert.equal(system.active, false);
});
