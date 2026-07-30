const testWaveDefinitions = Object.freeze([
  Object.freeze({
    id: "test-wave-1",
    title: "Training scouts",
    groups: Object.freeze([
      Object.freeze({ type: "runner", count: 2, at: 0, interval: 3 }),
    ]),
  }),
  Object.freeze({
    id: "test-wave-2",
    title: "Training rush",
    groups: Object.freeze([
      Object.freeze({ type: "runner", count: 3, at: 0, interval: 2.5 }),
    ]),
  }),
]);

export default testWaveDefinitions;
