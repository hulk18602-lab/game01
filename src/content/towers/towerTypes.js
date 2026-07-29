/**
 * The single source of truth for tower balance values.
 *
 * Systems only consume these values; no tower-specific combat rules should be
 * hidden in a system.  This makes adding a tower a content change rather than
 * a change to the combat pipeline.
 */
export const towerTypes = Object.freeze({
  basic: Object.freeze({
    id: 'basic',
    name: 'Basic tower',
    cost: 100,
    range: 160,
    fireRate: 1,
    damage: 20,
    projectileSpeed: 360,
    targeting: 'first',
  }),
  rapid: Object.freeze({
    id: 'rapid',
    name: 'Rapid tower',
    cost: 175,
    range: 135,
    fireRate: 4,
    damage: 7,
    projectileSpeed: 480,
    targeting: 'nearest',
  }),
  frost: Object.freeze({
    id: 'frost',
    name: 'Frost tower',
    cost: 225,
    range: 145,
    fireRate: 0.75,
    damage: 12,
    projectileSpeed: 300,
    targeting: 'first',
    statusEffect: Object.freeze({
      type: 'slow',
      duration: 2,
      multiplier: 0.55,
    }),
  }),
});

export function getTowerType(type) {
  const definition = towerTypes[type];
  if (!definition) throw new Error(`Unknown tower type: ${type}`);
  return definition;
}

export default towerTypes;
