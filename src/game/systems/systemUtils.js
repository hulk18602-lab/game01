export function isAlive(entity) {
  return entity != null
    && entity.health > 0
    && entity.dead !== true
    && entity.pendingRemoval !== true
    && entity.reachedBase !== true;
}

export function entityPosition(entity) {
  const position = entity?.position;
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new TypeError('Entity requires a finite world position');
  }
  return position;
}

export function distanceSquared(a, b) {
  const first = entityPosition(a);
  const second = entityPosition(b);
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

export function applyDamage(enemy, amount) {
  if (!enemy || typeof enemy.takeDamage !== 'function') {
    throw new TypeError('Damage targets must implement takeDamage(amount)');
  }
  return enemy.takeDamage(amount);
}

export function removeInPlace(items, predicate) {
  let writeIndex = 0;
  for (const item of items) {
    if (!predicate(item)) items[writeIndex++] = item;
  }
  items.length = writeIndex;
  return items;
}
