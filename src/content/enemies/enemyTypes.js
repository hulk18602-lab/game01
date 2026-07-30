const defineEnemy = (definition) => Object.freeze(definition);

/** Complete enemy balance. Ability systems consume these declarative traits. */
export const enemyTypes = Object.freeze({
  grunt: defineEnemy({
    id: "grunt", name: "Grunt", shortLabel: "G", health: 100, speed: 60,
    reward: 10, baseDamage: 1, armor: 0, color: "#fb7185", radius: 12,
  }),
  runner: defineEnemy({
    id: "runner", name: "Runner", shortLabel: "R", health: 60, speed: 100,
    reward: 14, baseDamage: 1, armor: 0, color: "#fbbf24", radius: 10,
  }),
  tank: defineEnemy({
    id: "tank", name: "Tank", shortLabel: "T", health: 300, speed: 35,
    reward: 30, baseDamage: 3, armor: 0, color: "#ef4444", radius: 17,
  }),
  armored: defineEnemy({
    id: "armored", name: "Armored", shortLabel: "A", health: 240, speed: 48,
    reward: 28, baseDamage: 2, armor: 0.45, color: "#94a3b8", radius: 15,
  }),
  regenerator: defineEnemy({
    id: "regenerator", name: "Regenerator", shortLabel: "+", health: 190, speed: 55,
    reward: 26, baseDamage: 2, armor: 0, regeneration: 7, color: "#4ade80", radius: 14,
  }),
  boss: defineEnemy({
    id: "boss", name: "River Colossus", shortLabel: "B", health: 1800, speed: 28,
    reward: 180, baseDamage: 8, armor: 0.2, boss: true, color: "#c084fc", radius: 23,
  }),
  swarm: defineEnemy({
    id: "swarm", name: "Swarm", shortLabel: "S", health: 35, speed: 88,
    reward: 5, baseDamage: 1, armor: 0, color: "#fda4af", radius: 7,
  }),
  shielded: defineEnemy({
    id: "shielded", name: "Shielded", shortLabel: "D", health: 220, shield: 120, speed: 44,
    reward: 32, baseDamage: 2, armor: 0.1, color: "#38bdf8", radius: 15,
  }),
  splitter: defineEnemy({
    id: "splitter", name: "Splitter", shortLabel: "2", health: 260, speed: 46,
    reward: 38, baseDamage: 2, armor: 0, splitInto: "swarm", splitCount: 2,
    color: "#f0abfc", radius: 16,
  }),
  eliteRunner: defineEnemy({
    id: "eliteRunner", name: "Phase Strider", shortLabel: "E", elite: true,
    health: 320, speed: 115, reward: 52, baseDamage: 3, armor: 0.1,
    color: "#a78bfa", radius: 13,
  }),
  arcaneSentinel: defineEnemy({
    id: "arcaneSentinel", name: "Arcane Sentinel", shortLabel: "S", elite: true,
    health: 720, shield: 260, speed: 38, reward: 85, baseDamage: 5, armor: 0.3,
    color: "#818cf8", radius: 19,
  }),
  stormLancer: defineEnemy({
    id: "stormLancer", name: "Storm Lancer", shortLabel: "L", elite: true,
    health: 420, shield: 90, speed: 70, reward: 64, baseDamage: 4, armor: 0.15,
    color: "#22d3ee", radius: 15,
  }),
  archonBoss: defineEnemy({
    id: "archonBoss", name: "Astral Archon", shortLabel: "Ω", elite: true, boss: true,
    health: 6200, shield: 1500, speed: 25, reward: 600, baseDamage: 12, armor: 0.25,
    color: "#e879f9", radius: 28,
  }),
});

export default enemyTypes;
