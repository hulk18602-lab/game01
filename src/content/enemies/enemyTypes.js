/** Declarative enemy catalogue. Values are expressed in world units/second. */
export const enemyTypes = Object.freeze({
  grunt: Object.freeze({
    id: 'grunt',
    health: 100,
    speed: 60,
    reward: 10,
    baseDamage: 1,
  }),
  runner: Object.freeze({
    id: 'runner',
    health: 60,
    speed: 100,
    reward: 14,
    baseDamage: 1,
  }),
  tank: Object.freeze({
    id: 'tank',
    health: 300,
    speed: 35,
    reward: 30,
    baseDamage: 3,
  }),
});

export default enemyTypes;
