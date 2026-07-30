/** Session-level difficulty modifiers. */
export const difficulties = Object.freeze({
  easy: Object.freeze({
    id: "easy", name: "Ranger", description: "More room to experiment.",
    startingGold: 475, lives: 25, enemyHealth: 0.82, enemySpeed: 0.94,
    enemyReward: 1.12, scoreMultiplier: 0.8, preparationSeconds: 24,
  }),
  normal: Object.freeze({
    id: "normal", name: "Commander", description: "The intended balanced campaign.",
    startingGold: 350, lives: 20, enemyHealth: 1, enemySpeed: 1,
    enemyReward: 1, scoreMultiplier: 1, preparationSeconds: 20,
  }),
  hard: Object.freeze({
    id: "hard", name: "Warlord", description: "Tighter economy and tougher enemies.",
    startingGold: 300, lives: 15, enemyHealth: 1.22, enemySpeed: 1.08,
    enemyReward: 0.92, scoreMultiplier: 1.35, preparationSeconds: 16,
  }),
});

export function getDifficulty(id) {
  const difficulty = difficulties[id];
  if (!difficulty) throw new Error(`Unknown difficulty: ${id}`);
  return difficulty;
}

export default difficulties;
