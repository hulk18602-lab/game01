const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (number, groups, title = `Wave ${number}`) => Object.freeze({
  id: `wave-${number}`,
  title,
  groups: Object.freeze(groups),
});

/** Twelve-wave campaign. Boss encounters are explicit content, not system rules. */
export const waveDefinitions = Object.freeze([
  wave(1, [group("grunt", 7, 0, 2.5)], "First contact"),
  wave(2, [group("grunt", 8, 0, 2.5), group("runner", 4, 9, 3)], "Scouts"),
  wave(3, [group("grunt", 10, 0, 2.7), group("runner", 7, 8, 3.2)], "Quick march"),
  wave(4, [group("tank", 3, 0, 12), group("armored", 5, 6, 7), group("grunt", 7, 14, 4)], "Steel line"),
  wave(5, [group("regenerator", 4, 0, 12), group("runner", 10, 5, 4.5), group("armored", 5, 15, 8)], "Recovery"),
  wave(6, [group("boss", 1, 0, 1), group("grunt", 10, 5, 5), group("runner", 8, 16, 5.5)], "Boss: Gatebreaker"),
  wave(7, [group("tank", 5, 0, 12), group("armored", 8, 7, 7), group("runner", 12, 15, 4.5)], "Counterattack"),
  wave(8, [group("regenerator", 8, 0, 9), group("armored", 10, 5, 6.8), group("grunt", 12, 12, 5)], "Endurance"),
  wave(9, [group("runner", 20, 0, 2.6), group("tank", 7, 5, 8), group("regenerator", 7, 10, 6.5)], "Flood"),
  wave(10, [group("armored", 14, 0, 5), group("tank", 9, 4, 8), group("regenerator", 9, 10, 7)], "Iron tide"),
  wave(11, [group("runner", 24, 0, 2.8), group("tank", 10, 5, 7.4), group("regenerator", 10, 12, 6.5)], "Last warning"),
  wave(12, [
    group("boss", 1, 0, 1),
    group("armored", 14, 8, 5.5),
    group("regenerator", 10, 15, 7),
    group("tank", 8, 22, 8),
  ], "Boss: River Colossus"),
]);

export default waveDefinitions;
