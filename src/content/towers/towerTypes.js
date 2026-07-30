const freezeLevel = (level) => Object.freeze(level);

const defineTower = (definition) => {
  const levels = Object.freeze(definition.levels.map(freezeLevel));
  const first = levels[0];
  return Object.freeze({
    ...definition,
    levels,
    cost: first.cost,
    range: first.range,
    fireRate: first.fireRate,
    damage: first.damage,
    projectileSpeed: first.projectileSpeed,
    statusEffect: first.statusEffect,
  });
};

/** Complete tower balance. Rendering and orchestration must not contain stats. */
export const towerTypes = Object.freeze({
  basic: defineTower({
    id: "basic",
    name: "Basic tower",
    description: "Reliable single-target damage for every stage.",
    hotkey: "1",
    targeting: "first",
    damageType: "physical",
    color: "#60a5fa",
    levels: [
      { cost: 100, sellValue: 50, damage: 20, range: 160, fireRate: 1, projectileSpeed: 360 },
      { cost: 100, sellValue: 125, damage: 32, range: 172, fireRate: 1.15, projectileSpeed: 390 },
      { cost: 160, sellValue: 245, damage: 50, range: 185, fireRate: 1.35, projectileSpeed: 420 },
    ],
  }),
  rapid: defineTower({
    id: "rapid",
    name: "Rapid tower",
    description: "Fast low-damage fire that excels against runners.",
    hotkey: "2",
    targeting: "nearest",
    damageType: "physical",
    color: "#a78bfa",
    levels: [
      { cost: 175, sellValue: 88, damage: 7, range: 135, fireRate: 4, projectileSpeed: 480 },
      { cost: 130, sellValue: 198, damage: 11, range: 145, fireRate: 4.7, projectileSpeed: 520 },
      { cost: 220, sellValue: 360, damage: 17, range: 155, fireRate: 5.5, projectileSpeed: 560 },
    ],
  }),
  frost: defineTower({
    id: "frost",
    name: "Frost tower",
    description: "Cold damage and a slow that controls dangerous targets.",
    hotkey: "3",
    targeting: "first",
    damageType: "cold",
    color: "#67e8f9",
    levels: [
      {
        cost: 225, sellValue: 113, damage: 12, range: 145, fireRate: 0.75, projectileSpeed: 300,
        statusEffect: Object.freeze({ type: "slow", duration: 2, multiplier: 0.55 }),
      },
      {
        cost: 160, sellValue: 260, damage: 21, range: 158, fireRate: 0.9, projectileSpeed: 330,
        statusEffect: Object.freeze({ type: "slow", duration: 2.4, multiplier: 0.48 }),
      },
      {
        cost: 250, sellValue: 450, damage: 34, range: 172, fireRate: 1.05, projectileSpeed: 360,
        statusEffect: Object.freeze({ type: "slow", duration: 2.8, multiplier: 0.4 }),
      },
    ],
  }),
  cannon: defineTower({
    id: "cannon",
    name: "Cannon tower",
    description: "Slow explosive shells damage tightly packed groups.",
    hotkey: "4",
    targeting: "first",
    damageType: "explosive",
    color: "#fb923c",
    levels: [
      { cost: 260, sellValue: 130, damage: 42, range: 145, fireRate: 0.55, projectileSpeed: 260, areaRadius: 58 },
      { cost: 190, sellValue: 305, damage: 68, range: 155, fireRate: 0.62, projectileSpeed: 280, areaRadius: 68 },
      { cost: 300, sellValue: 525, damage: 105, range: 168, fireRate: 0.72, projectileSpeed: 305, areaRadius: 82 },
    ],
  }),
  sniper: defineTower({
    id: "sniper",
    name: "Sniper tower",
    description: "Extreme range and heavy single-target physical damage.",
    hotkey: "5",
    targeting: "strongest",
    damageType: "physical",
    color: "#f472b6",
    levels: [
      { cost: 300, sellValue: 150, damage: 95, range: 285, fireRate: 0.38, projectileSpeed: 700 },
      { cost: 225, sellValue: 355, damage: 155, range: 310, fireRate: 0.43, projectileSpeed: 760 },
      { cost: 350, sellValue: 610, damage: 245, range: 340, fireRate: 0.5, projectileSpeed: 820 },
    ],
  }),
  tesla: defineTower({
    id: "tesla",
    name: "Tesla tower",
    description: "Chain lightning strikes up to three clustered enemies.",
    hotkey: "6",
    targeting: "nearest",
    damageType: "electric",
    color: "#fde047",
    levels: [
      {
        cost: 280, sellValue: 140, damage: 34, range: 155, fireRate: 0.72, projectileSpeed: 620,
        chainCount: 3, chainFalloff: 0.68, chainRange: 105,
      },
      {
        cost: 210, sellValue: 350, damage: 52, range: 168, fireRate: 0.82, projectileSpeed: 680,
        chainCount: 3, chainFalloff: 0.72, chainRange: 116,
      },
      {
        cost: 330, sellValue: 590, damage: 78, range: 182, fireRate: 0.95, projectileSpeed: 740,
        chainCount: 3, chainFalloff: 0.76, chainRange: 128,
      },
    ],
  }),
  poison: defineTower({
    id: "poison",
    name: "Poison tower",
    description: "Low direct damage refreshes a lingering poison effect.",
    hotkey: "7",
    targeting: "strongest",
    damageType: "poison",
    color: "#4ade80",
    levels: [
      {
        cost: 210, sellValue: 105, damage: 8, range: 150, fireRate: 0.75, projectileSpeed: 330,
        statusEffect: Object.freeze({
          type: "damageOverTime", duration: 4, damagePerSecond: 13, damageType: "poison",
        }),
      },
      {
        cost: 160, sellValue: 265, damage: 13, range: 162, fireRate: 0.86, projectileSpeed: 360,
        statusEffect: Object.freeze({
          type: "damageOverTime", duration: 4.6, damagePerSecond: 20, damageType: "poison",
        }),
      },
      {
        cost: 260, sellValue: 465, damage: 20, range: 176, fireRate: 1, projectileSpeed: 390,
        statusEffect: Object.freeze({
          type: "damageOverTime", duration: 5.2, damagePerSecond: 30, damageType: "poison",
        }),
      },
    ],
  }),
});

export function getTowerType(type) {
  const definition = towerTypes[type];
  if (!definition) throw new Error(`Unknown tower type: ${type}`);
  return definition;
}

export default towerTypes;
