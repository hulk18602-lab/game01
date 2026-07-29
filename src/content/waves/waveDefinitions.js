/**
 * Wave data contains no runtime state. `at` is seconds after the wave starts.
 */
export const waveDefinitions = Object.freeze([
  Object.freeze({
    id: 'wave-1',
    groups: Object.freeze([
      Object.freeze({ type: 'grunt', count: 6, at: 0, interval: 0.8 }),
    ]),
  }),
  Object.freeze({
    id: 'wave-2',
    groups: Object.freeze([
      Object.freeze({ type: 'grunt', count: 6, at: 0, interval: 0.65 }),
      Object.freeze({ type: 'runner', count: 4, at: 2, interval: 0.5 }),
    ]),
  }),
  Object.freeze({
    id: 'wave-3',
    groups: Object.freeze([
      Object.freeze({ type: 'tank', count: 3, at: 0, interval: 1.5 }),
      Object.freeze({ type: 'runner', count: 8, at: 1, interval: 0.4 }),
    ]),
  }),
]);

export default waveDefinitions;
