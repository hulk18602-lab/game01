const biome = (definition) => Object.freeze({
  ...definition,
  colors: Object.freeze(definition.colors),
  decorationTypes: Object.freeze(definition.decorationTypes),
});

export const BIOME_VISUALS = Object.freeze({
  map01: biome({ id: "river-meadow", name: "River Outpost", colors: { ground: "#4d883f", light: "#7bad50", dark: "#285c38", road: "#b88750", shoulder: "#705037", water: "#287fa2", accent: "#bce8dd", rock: "#596b68" }, decorationTypes: ["flowers", "bush", "willow", "pebbles"], density: 0.24, ambient: "fireflies" }),
  map02: biome({ id: "serpent-crags", name: "Serpent Pass", colors: { ground: "#98744b", light: "#c29a60", dark: "#5b4938", road: "#d09a59", shoulder: "#765037", water: "#347895", accent: "#e5c27c", rock: "#685b50" }, decorationTypes: ["dry-grass", "cactus", "bones", "pebbles"], density: 0.19, ambient: "dust" }),
  map03: biome({ id: "greenwood", name: "Greenwood", colors: { ground: "#397346", light: "#72a452", dark: "#1f4935", road: "#98724c", shoulder: "#544532", water: "#286d7b", accent: "#9fcd78", rock: "#4a6258" }, decorationTypes: ["fern", "mushrooms", "roots", "ancient-tree"], density: 0.29, ambient: "pollen" }),
  map04: biome({ id: "arcane-citadel", name: "Arcane Citadel", colors: { ground: "#596071", light: "#7a8294", dark: "#343747", road: "#776181", shoulder: "#40384e", water: "#315f88", accent: "#ba91e8", rock: "#484c5d" }, decorationTypes: ["rune", "crystal", "column", "mosaic"], density: 0.18, ambient: "mana" }),
  map05: biome({ id: "ashen-highlands", name: "Ashen Highlands", colors: { ground: "#684a3d", light: "#8b6550", dark: "#302c2b", road: "#55443b", shoulder: "#292626", water: "#d54b21", accent: "#ff9a3c", rock: "#3a3533" }, decorationTypes: ["charred-tree", "ember-rock", "bones", "crack"], density: 0.2, ambient: "embers" }),
  map06: biome({ id: "frostbound", name: "Frostbound", colors: { ground: "#abc8d3", light: "#e2f2f3", dark: "#708b99", road: "#8da3ac", shoulder: "#607887", water: "#559dc0", accent: "#c9f6ff", rock: "#536a77" }, decorationTypes: ["ice-crystal", "snow-pine", "frozen-rock", "snowdrift"], density: 0.21, ambient: "snow" }),
  map07: biome({ id: "shadowfen", name: "Shadowfen", colors: { ground: "#405b47", light: "#65795a", dark: "#263a35", road: "#65564e", shoulder: "#343a37", water: "#315d55", accent: "#84a76d", rock: "#394944" }, decorationTypes: ["reeds", "dead-tree", "ruin", "mushrooms"], density: 0.25, ambient: "mist" }),
  map08: biome({ id: "eclipse", name: "Eclipse Throne", colors: { ground: "#3a344c", light: "#5c4d70", dark: "#211e2f", road: "#6a526f", shoulder: "#30273d", water: "#54257c", accent: "#cf67ff", rock: "#2b2938" }, decorationTypes: ["obelisk", "void-crystal", "rune", "crack"], density: 0.2, ambient: "void" }),
});

export const getBiomeVisual = (mapId) => BIOME_VISUALS[mapId] ?? BIOME_VISUALS.map01;

export const terrainMaterial = (tile) => {
  if (tile.id === "road") return "road";
  if (["water", "frozen-water", "bog", "lava", "void-rift"].includes(tile.id)) return "liquid";
  if (["rock", "crag"].includes(tile.id)) return "obstacle";
  if (tile.id === "sand") return "sand";
  return "ground";
};
