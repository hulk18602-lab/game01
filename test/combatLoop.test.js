import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../src/entities/Enemy.js';
import {
  CleanupSystem, CombatSystem, ProjectileSystem, TargetingSystem,
} from '../src/game/systems/index.js';

const tower = (overrides = {}) => ({
  id: 'tower-1',
  position: { x: 100, y: 100 },
  range: 160,
  targeting: 'first',
  damage: 20,
  fireRate: 1,
  projectileSpeed: 360,
  ...overrides,
});

test('RuntimeTower world position is used for in-range targeting', () => {
  const system = new TargetingSystem();
  const runtimeTower = tower();
  const outside = new Enemy('grunt', { id: 'outside', position: { x: 261, y: 100 } });
  const inside = new Enemy('grunt', { id: 'inside', position: { x: 260, y: 100 } });

  system.update([runtimeTower], [outside]);
  assert.equal(runtimeTower.targetId, null);

  system.update([runtimeTower], [outside, inside]);
  assert.equal(runtimeTower.targetId, 'inside');
});

test('targeting drops invalid targets and honors first, nearest and strongest priorities', () => {
  const system = new TargetingSystem();
  const enemies = [
    new Enemy('grunt', { id: 'near', position: { x: 110, y: 100 }, progress: 0.2, health: 40 }),
    new Enemy('grunt', { id: 'first', position: { x: 130, y: 100 }, progress: 0.8, health: 30 }),
    new Enemy('tank', { id: 'strong', position: { x: 150, y: 100 }, progress: 0.4, health: 200 }),
  ];

  const first = tower({ targeting: 'first' });
  system.update([first], enemies);
  assert.equal(first.targetId, 'first');

  const nearest = tower({ targeting: 'nearest' });
  system.update([nearest], enemies);
  assert.equal(nearest.targetId, 'near');

  const strongest = tower({ targeting: 'strongest' });
  system.update([strongest], enemies);
  assert.equal(strongest.targetId, 'strong');

  enemies[1].markForRemoval('destroyed');
  system.update([first], enemies);
  assert.equal(first.targetId, 'strong');
});

test('combat spawns from the tower position and projectile applies canonical damage', () => {
  const runtimeTower = tower({ position: { x: 0, y: 0 } });
  const enemy = new Enemy('grunt', { id: 'target', position: { x: 20, y: 0 } });
  const projectiles = new ProjectileSystem();

  new TargetingSystem().update([runtimeTower], [enemy]);
  new CombatSystem().update(0, [runtimeTower], [enemy], projectiles);
  assert.equal(projectiles.projectiles.length, 1);
  assert.deepEqual(projectiles.projectiles[0].position, { x: 0, y: 0 });
  assert.equal(runtimeTower.cooldown, 1);

  projectiles.update(0.1, [enemy]);
  assert.equal(enemy.health, 80);
  assert.equal(projectiles.projectiles.length, 0);
  assert.deepEqual(
    projectiles.drainEvents().map(({ type }) => type),
    ['shot', 'hit'],
  );
});

test('projectiles disappear when their target is already dead', () => {
  const enemy = new Enemy('grunt', { id: 'target', position: { x: 20, y: 0 } });
  const projectiles = new ProjectileSystem();
  projectiles.spawn({
    sourceId: 'tower-1',
    targetId: enemy.id,
    position: { x: 0, y: 0 },
    damage: 20,
    speed: 100,
  });
  enemy.takeDamage(100);

  projectiles.update(0.1, [enemy]);
  assert.equal(projectiles.projectiles.length, 0);
});

test('destroyed enemies are removed and rewarded exactly once', () => {
  for (const [type, reward] of [['grunt', 10], ['runner', 14], ['tank', 30]]) {
    const enemy = new Enemy(type, { id: type });
    const cleanup = new CleanupSystem();
    const player = { currency: 0 };
    enemy.takeDamage(enemy.maxHealth);

    const enemies = [enemy];
    cleanup.update(enemies, player);
    assert.deepEqual(enemies, []);
    assert.equal(player.currency, reward);

    cleanup.update([enemy], player);
    assert.equal(player.currency, reward);
  }
});
