export function isAlive(entity) {
  return entity != null && entity.health > 0 && entity.dead !== true;
}

export function entityPosition(entity) {
  return entity?.position ?? entity;
}

export function distanceSquared(a, b) {
  const first = entityPosition(a);
  const second = entityPosition(b);
  const dx = (first?.x ?? 0) - (second?.x ?? 0);
  const dy = (first?.y ?? 0) - (second?.y ?? 0);
  return dx * dx + dy * dy;
}

export function removeInPlace(items, predicate) {
  let writeIndex = 0;
  for (const item of items) {
    if (!predicate(item)) items[writeIndex++] = item;
  }
  items.length = writeIndex;
  return items;
}
