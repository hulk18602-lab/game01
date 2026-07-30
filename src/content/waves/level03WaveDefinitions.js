const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (id, title, groups) => Object.freeze({ id, title, groups: Object.freeze(groups) });

/** Greenwood Siege introduces the archer alongside a fifteen-wave mixed assault. */
export const level03WaveDefinitions = Object.freeze([
  wave("greenwood-1", "Forest scouts", [group("grunt", 4, 0, 1.4)]),
  wave("greenwood-2", "Thorn runners", [
    group("runner", 10, 0, 0.65),
    group("grunt", 6, 2, 1.1),
  ]),
  wave("greenwood-3", "Beetle cloud", [
    group("swarm", 24, 0, 0.3),
    group("grunt", 8, 2, 0.9),
  ]),
  wave("greenwood-4", "Bark shields", [
    group("shielded", 6, 0, 1.25),
    group("runner", 14, 2, 0.48),
  ]),
  wave("greenwood-5", "Splinter march", [
    group("splitter", 7, 0, 1.1),
    group("armored", 7, 2, 0.9),
  ]),
  wave("greenwood-6", "Old growth", [
    group("regenerator", 9, 0, 0.9),
    group("tank", 6, 2, 1.25),
    group("swarm", 20, 3, 0.28),
  ]),
  wave("greenwood-7", "Hunting party", [
    group("runner", 22, 0, 0.32),
    group("shielded", 10, 2, 0.7),
  ]),
  wave("greenwood-8", "Boss: Moss Giant", [
    group("boss", 1, 0, 0),
    group("splitter", 8, 2, 0.8),
    group("swarm", 28, 3, 0.24),
  ]),
  wave("greenwood-9", "Broken canopy", [
    group("armored", 12, 0, 0.68),
    group("runner", 24, 2, 0.3),
  ]),
  wave("greenwood-10", "Rootbound column", [
    group("tank", 10, 0, 0.9),
    group("regenerator", 12, 1, 0.72),
  ]),
  wave("greenwood-11", "Shield wall", [
    group("shielded", 16, 0, 0.58),
    group("splitter", 12, 1, 0.62),
  ]),
  wave("greenwood-12", "Green tide", [
    group("swarm", 42, 0, 0.17),
    group("runner", 30, 1, 0.24),
    group("regenerator", 10, 3, 0.65),
  ]),
  wave("greenwood-13", "Ironwood legion", [
    group("armored", 18, 0, 0.52),
    group("tank", 13, 1, 0.68),
    group("shielded", 16, 2, 0.5),
  ]),
  wave("greenwood-14", "Siege breakers", [
    group("splitter", 18, 0, 0.45),
    group("regenerator", 16, 1, 0.5),
    group("runner", 34, 2, 0.2),
  ]),
  wave("greenwood-15", "Boss: Heart of Greenwood", [
    group("boss", 2, 0, 7),
    group("shielded", 20, 1, 0.42),
    group("armored", 18, 2, 0.48),
    group("swarm", 48, 3, 0.15),
  ]),
]);

export default level03WaveDefinitions;
