const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (number, title, groups) => Object.freeze({
  id: `labyrinth-${number}`,
  title,
  groups: Object.freeze(groups),
});

/** Eighteen Frostbound Labyrinth waves with spaced support groups. */
export const level06WaveDefinitions = Object.freeze(Array.from({ length: 18 }, (_, index) => {
  const number = index + 1;
  if (number === 9) return wave(number, "Boss: Glacier Warden", [
    group("boss", 1, 0, 0), group("frostboundKnight", 8, 3, 0.82), group("iceShaman", 3, 5, 2.4),
  ]);
  if (number === 18) return wave(number, "Heart of the blizzard", [
    group("frostboundKnight", 20, 0, 0.52), group("iceShaman", 6, 2, 2),
    group("shielded", 18, 5, 0.48), group("eliteRunner", 24, 8, 0.3),
  ]);
  const heavy = 5 + Math.floor(number * 0.7);
  const light = 10 + number;
  return wave(number, number < 6 ? "Snowbound patrol" : number < 13 ? "Frozen phalanx" : "Whiteout siege", [
    group(number < 3 ? "grunt" : "frostboundKnight", heavy, 0, 0.68),
    group(number < 4 ? "runner" : "iceShaman", number < 4 ? light : Math.max(1, Math.floor(number / 3)), 3, number < 4 ? 0.4 : 2.2),
    group(number % 2 === 0 ? "shielded" : "berserker", light, 6, Math.max(0.3, 0.58 - number * 0.01)),
  ]);
}));

export default level06WaveDefinitions;
