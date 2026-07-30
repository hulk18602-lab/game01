const group = (type, count, at, interval) => Object.freeze({ type, count, at, interval });
const wave = (id, title, groups) => Object.freeze({ id, title, groups: Object.freeze(groups) });

/** Arcane Citadel campaign: sixteen waves culminating in the Astral Archon. */
export const level04WaveDefinitions = Object.freeze([
  wave("citadel-1", "Arcane vanguard", [
    group("grunt", 8, 0, 0.9),
    group("stormLancer", 3, 2, 1.4),
  ]),
  wave("citadel-2", "Blink assault", [
    group("eliteRunner", 7, 0, 0.7),
    group("runner", 16, 2, 0.35),
  ]),
  wave("citadel-3", "Sentinel watch", [
    group("arcaneSentinel", 5, 0, 1.3),
    group("swarm", 24, 2, 0.26),
  ]),
  wave("citadel-4", "Conductive host", [
    group("stormLancer", 8, 0, 0.82),
    group("shielded", 10, 1, 0.72),
  ]),
  wave("citadel-5", "Fractured guard", [
    group("splitter", 10, 0, 0.7),
    group("eliteRunner", 12, 1, 0.42),
  ]),
  wave("citadel-6", "Runic armor", [
    group("arcaneSentinel", 9, 0, 0.88),
    group("armored", 12, 1, 0.62),
  ]),
  wave("citadel-7", "Mana flood", [
    group("regenerator", 14, 0, 0.58),
    group("stormLancer", 12, 1, 0.5),
    group("swarm", 30, 2, 0.2),
  ]),
  wave("citadel-8", "Boss: Gate Magus", [
    group("boss", 1, 0, 0),
    group("arcaneSentinel", 10, 2, 0.66),
    group("eliteRunner", 18, 3, 0.3),
  ]),
  wave("citadel-9", "Afterimage legion", [
    group("eliteRunner", 24, 0, 0.25),
    group("shielded", 14, 1, 0.52),
  ]),
  wave("citadel-10", "Crystal phalanx", [
    group("arcaneSentinel", 14, 0, 0.55),
    group("tank", 12, 1, 0.72),
  ]),
  wave("citadel-11", "Lightning choir", [
    group("stormLancer", 20, 0, 0.36),
    group("splitter", 14, 1, 0.5),
  ]),
  wave("citadel-12", "Unstable convergence", [
    group("swarm", 54, 0, 0.13),
    group("eliteRunner", 28, 1, 0.22),
    group("regenerator", 16, 2, 0.44),
  ]),
  wave("citadel-13", "Astral bulwark", [
    group("arcaneSentinel", 18, 0, 0.45),
    group("shielded", 20, 1, 0.4),
    group("armored", 16, 2, 0.48),
  ]),
  wave("citadel-14", "Storm engine", [
    group("stormLancer", 26, 0, 0.28),
    group("tank", 16, 1, 0.52),
    group("eliteRunner", 32, 2, 0.18),
  ]),
  wave("citadel-15", "Citadel collapse", [
    group("arcaneSentinel", 22, 0, 0.38),
    group("splitter", 20, 1, 0.38),
    group("regenerator", 20, 2, 0.38),
    group("swarm", 60, 3, 0.11),
  ]),
  wave("citadel-16", "Final Boss: Astral Archon", [
    group("archonBoss", 1, 0, 0),
    group("arcaneSentinel", 24, 3, 0.32),
    group("stormLancer", 28, 4, 0.25),
    group("eliteRunner", 36, 5, 0.16),
  ]),
]);

export default level04WaveDefinitions;
