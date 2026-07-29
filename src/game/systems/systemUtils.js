export function isAlive(entity) {
  return entity != null && entity.health > 0 && entity.dead !== true;
}

export function distanceSquared(a, b) {
  const dx = (a.x ?? 0) - (b.x ?? 0);
  const dy = (a.y ?? 0) - (b.y ?? 0);
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
