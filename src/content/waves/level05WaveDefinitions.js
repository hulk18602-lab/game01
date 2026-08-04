const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (number, title, groups) => Object.freeze({
  id: `highlands-${number}`,
  title,
  groups: Object.freeze(groups),
});

/** Seventeen mixed Ashen Highlands waves. Heavy troops replace part of each advancing host. */
export const level05WaveDefinitions = Object.freeze(Array.from({ length: 17 }, (_, index) => {
  const number = index + 1;
  if (number === 9) return wave(number, "Boss: Cinder Colossus", [
    group("boss", 1, 0, 0), group("warBannerCaptain", 2, 3, 2.2), group("berserker", 12, 4, 0.62),
  ]);
  if (number === 17) return wave(number, "Highlands warhost", [
    group("warBannerCaptain", 4, 0, 2.1), group("berserker", 22, 1, 0.42),
    group("armored", 14, 4, 0.58), group("runner", 22, 7, 0.3),
  ]);
  const heavy = 4 + Math.floor(number * 0.65);
  const light = 9 + number;
  return wave(number, number < 6 ? "Ash raiders" : number < 12 ? "Banner advance" : "Burning legion", [
    group(number < 3 ? "grunt" : "berserker", light, 0, Math.max(0.34, 0.72 - number * 0.015)),
    group(number < 5 ? "runner" : "warBannerCaptain", number < 5 ? heavy + 3 : Math.max(1, Math.floor(heavy / 4)), 2.5, number < 5 ? 0.5 : 2.1),
    group(number % 2 === 0 ? "armored" : "regenerator", heavy, 5.5, 0.72),
  ]);
}));

export default level05WaveDefinitions;
