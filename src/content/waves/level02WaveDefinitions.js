const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (id, title, groups) => Object.freeze({ id, title, groups: Object.freeze(groups) });

/** Serpent Pass campaign. New enemy mechanics are introduced gradually across fourteen waves. */
export const level02WaveDefinitions = Object.freeze([
  wave("serpent-1", "Scouting swarm", [
    group("swarm", 18, 0, 0.38),
  ]),
  wave("serpent-2", "Rushing column", [
    group("grunt", 8, 0, 0.75),
    group("runner", 12, 2, 0.48),
  ]),
  wave("serpent-3", "Raised shields", [
    group("shielded", 4, 0, 1.5),
    group("swarm", 20, 1, 0.34),
  ]),
  wave("serpent-4", "Fission line", [
    group("splitter", 5, 0, 1.35),
    group("runner", 12, 2, 0.5),
  ]),
  wave("serpent-5", "Armored escort", [
    group("armored", 7, 0, 1.1),
    group("shielded", 6, 1, 1.2),
    group("swarm", 18, 2, 0.3),
  ]),
  wave("serpent-6", "Living tide", [
    group("regenerator", 8, 0, 1),
    group("splitter", 7, 1.5, 1),
  ]),
  wave("serpent-7", "Pass guardian", [
    group("boss", 1, 0, 0),
    group("shielded", 8, 2, 0.85),
    group("swarm", 24, 3, 0.28),
  ]),
  wave("serpent-8", "Aftershock", [
    group("runner", 24, 0, 0.32),
    group("tank", 7, 1, 1.15),
  ]),
  wave("serpent-9", "Toxic procession", [
    group("shielded", 10, 0, 0.8),
    group("regenerator", 10, 1, 0.8),
    group("swarm", 24, 2, 0.26),
  ]),
  wave("serpent-10", "Fracture storm", [
    group("splitter", 12, 0, 0.72),
    group("armored", 9, 1, 0.9),
  ]),
  wave("serpent-11", "Heavy scales", [
    group("tank", 12, 0, 0.85),
    group("shielded", 14, 1, 0.65),
  ]),
  wave("serpent-12", "Unbroken current", [
    group("regenerator", 14, 0, 0.6),
    group("runner", 28, 1, 0.24),
    group("swarm", 30, 2, 0.2),
  ]),
  wave("serpent-13", "Coiled legion", [
    group("armored", 14, 0, 0.55),
    group("splitter", 14, 1, 0.55),
    group("shielded", 14, 2, 0.55),
  ]),
  wave("serpent-14", "Twin colossi", [
    group("boss", 2, 0, 6),
    group("tank", 12, 1, 0.75),
    group("shielded", 18, 2, 0.48),
    group("swarm", 36, 3, 0.18),
  ]),
]);

export default level02WaveDefinitions;
