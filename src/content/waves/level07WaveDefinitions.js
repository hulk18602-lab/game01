const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (number, title, groups) => Object.freeze({ id: `shadowfen-${number}`, title, groups: Object.freeze(groups) });

export const level07WaveDefinitions = Object.freeze(Array.from({ length: 19 }, (_, index) => {
  const number = index + 1;
  if (number === 10) return wave(number, "Boss: Drowned Regent", [
    group("archonBoss", 1, 0, 0), group("necromancer", 3, 3, 2.5), group("shadowAssassin", 16, 5, 0.42),
  ]);
  if (number === 19) return wave(number, "March of the dead", [
    group("necromancer", 7, 0, 2), group("shadowAssassin", 28, 2, 0.3),
    group("frostboundKnight", 18, 6, 0.5), group("warBannerCaptain", 5, 9, 2.1),
  ]);
  const heavy = 5 + Math.floor(number * .72);
  const light = 11 + number;
  return wave(number, number < 7 ? "Fen stalkers" : number < 14 ? "Ruined procession" : "Shadow host", [
    group(number < 3 ? "runner" : "shadowAssassin", light, 0, Math.max(.28, .55 - number * .01)),
    group(number < 5 ? "regenerator" : "necromancer", number < 5 ? heavy : Math.max(1, Math.floor(number / 3)), 3.5, number < 5 ? .65 : 2.3),
    group(number % 2 === 0 ? "frostboundKnight" : "berserker", heavy, 7, .62),
  ]);
}));

export default level07WaveDefinitions;
