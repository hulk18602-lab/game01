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
});

export default enemyTypes;
