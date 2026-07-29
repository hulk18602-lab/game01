import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CleanupSystem, CombatSystem, ProjectileSystem, StatusEffectSystem, TargetingSystem,
} from '../src/game/systems/index.js';

test('targeting, projectile damage and death rewards are separate stages', () => {
  const tower = { id: 't1', position: { x: 0, y: 0 }, range: 100, targeting: 'first', damage: 10,
    fireRate: 1, projectileSpeed: 100 };
  const enemies = [
    { id: 'near', x: 5, y: 0, health: 10, progress: 1, reward: 3 },
    { id: 'first', x: 10, y: 0, health: 10, progress: 2, reward: 7 },
  ];
  const projectiles = new ProjectileSystem();
  const player = { currency: 0 };

  new TargetingSystem().update([tower], enemies);
  assert.equal(tower.targetId, 'first');
  assert.equal(enemies[1].health, 10, 'target selection does not deal damage');

  new CombatSystem().update(0, [tower], enemies, projectiles);
  assert.equal(enemies[1].health, 10, 'firing only creates a projectile');
  projectiles.update(1, enemies);
  assert.equal(enemies[1].health, 0);
  assert.equal(player.currency, 0, 'projectile hits do not grant rewards');

  new CleanupSystem().update(enemies, player);
  assert.equal(player.currency, 7);
  assert.deepEqual(enemies.map(({ id }) => id), ['near']);
});

test('status effects expire and damage over time is rewarded only by cleanup', () => {
  const enemy = { id: 'e1', health: 5, reward: 4 };
  const effects = new StatusEffectSystem();
  effects.apply(enemy, { type: 'slow', duration: 1, multiplier: 0.5 });
  effects.apply(enemy, { type: 'damageOverTime', duration: 1, damagePerSecond: 5 });
  assert.equal(enemy.speedMultiplier, 0.5);
  effects.update(1, [enemy]);
  assert.equal(enemy.health, 0);
  assert.equal(enemy.speedMultiplier, 1);

  const player = { currency: 0 };
  new CleanupSystem().update([enemy], player);
  assert.equal(player.currency, 4);
});
