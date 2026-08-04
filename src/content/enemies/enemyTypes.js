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
  berserker: defineEnemy({
    id: "berserker", name: "Berserker", shortLabel: "Br", health: 430, speed: 66,
    reward: 48, baseDamage: 4, armor: 0.08, enrageThreshold: 0.4, enrageSpeed: 1.3,
    color: "#dc2626", radius: 16,
  }),
  warBannerCaptain: defineEnemy({
    id: "warBannerCaptain", name: "War Banner Captain", shortLabel: "C", health: 680, speed: 45,
    reward: 76, baseDamage: 5, armor: 0.22, speedAura: 1.15, auraRadius: 130,
    color: "#b45309", radius: 19,
  }),
  frostboundKnight: defineEnemy({
    id: "frostboundKnight", name: "Frostbound Knight", shortLabel: "K", health: 820, shield: 280,
    speed: 34, reward: 92, baseDamage: 6, armor: 0.34, coldResistance: 0.55,
    color: "#60a5fa", radius: 20,
  }),
  iceShaman: defineEnemy({
    id: "iceShaman", name: "Ice Shaman", shortLabel: "I", health: 390, speed: 48,
    reward: 70, baseDamage: 3, armor: 0.05, healAmount: 85, healCooldown: 5.5, healRadius: 165,
    color: "#22d3ee", radius: 16,
  }),
  shadowAssassin: defineEnemy({
    id: "shadowAssassin", name: "Shadow Assassin", shortLabel: "Sa", health: 360, speed: 108,
    reward: 72, baseDamage: 5, armor: 0.08, phaseInterval: 5.5, phaseDuration: 1.1,
    color: "#7c3aed", radius: 14,
  }),
  shadowMinion: defineEnemy({
    id: "shadowMinion", name: "Bound Shade", shortLabel: "M", health: 95, speed: 82,
    reward: 6, baseDamage: 1, armor: 0, minion: true, color: "#64748b", radius: 11,
  }),
  necromancer: defineEnemy({
    id: "necromancer", name: "Necromancer", shortLabel: "N", health: 620, speed: 42,
    reward: 96, baseDamage: 4, armor: 0.12, summonInto: "shadowMinion", summonCount: 4, summonDelay: 4.5,
    color: "#6d28d9", radius: 18,
  }),
  dreadPaladin: defineEnemy({
    id: "dreadPaladin", name: "Dread Paladin", shortLabel: "P", health: 1450, shield: 520,
    speed: 29, reward: 145, baseDamage: 9, armor: 0.42, regeneration: 5,
    color: "#4c1d95", radius: 22,
  }),
  voidWarlock: defineEnemy({
    id: "voidWarlock", name: "Void Warlock", shortLabel: "V", health: 720, speed: 40,
    reward: 108, baseDamage: 5, armor: 0.1, towerDebuff: 0.72, debuffDuration: 4.5,
    debuffCooldown: 7, debuffRadius: 190, color: "#a855f7", radius: 18,
  }),
  eclipseKing: defineEnemy({
    id: "eclipseKing", name: "The Eclipse King", shortLabel: "EK", elite: true, boss: true,
    health: 12800, shield: 3200, speed: 22, reward: 1400, baseDamage: 20, armor: 0.36,
    summonInto: "shadowMinion", summonCount: 8, summonThreshold: 0.66,
    enrageThreshold: 0.33, enrageSpeed: 1.5, color: "#c026d3", radius: 34,
  }),
});

export default enemyTypes;
