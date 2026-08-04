const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (number, title, groups) => Object.freeze({ id: `eclipse-${number}`, title, groups: Object.freeze(groups) });

export const level08WaveDefinitions = Object.freeze(Array.from({ length: 20 }, (_, index) => {
  const number = index + 1;
  if (number === 10) return wave(number, "Boss: Eclipse Herald", [
    group("archonBoss", 1, 0, 0), group("dreadPaladin", 8, 3, .8), group("voidWarlock", 3, 5, 2.6),
  ]);
  if (number === 20) return wave(number, "Final Boss: The Eclipse King", [
    group("eclipseKing", 1, 0, 0), group("dreadPaladin", 16, 4, .58),
    group("voidWarlock", 6, 7, 2.1), group("shadowAssassin", 28, 10, .28),
  ]);
  const heavy = 6 + Math.floor(number * .75);
  const light = 12 + number;
  return wave(number, number < 7 ? "Citadel outriders" : number < 15 ? "Eclipse guard" : "Throne legion", [
    group(number < 3 ? "armored" : "dreadPaladin", heavy, 0, .64),
    group(number < 5 ? "stormLancer" : "voidWarlock", number < 5 ? light : Math.max(1, Math.floor(number / 3)), 3.5, number < 5 ? .42 : 2.4),
    group(number % 2 === 0 ? "shadowAssassin" : "necromancer", light, 7.5, Math.max(.27, .52 - number * .008)),
  ]);
}));

export default level08WaveDefinitions;
