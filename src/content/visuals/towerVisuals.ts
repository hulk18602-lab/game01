export type TowerVisualId = "basic" | "rapid" | "frost" | "cannon" | "sniper" | "tesla" | "poison";

export interface TowerVisualDefinition {
  readonly id: TowerVisualId;
  readonly name: string;
  readonly role: string;
  readonly description: string;
  readonly material: string;
  readonly baseColor: string;
  readonly stoneLight: string;
  readonly stoneDark: string;
  readonly metal: string;
  readonly accent: string;
  readonly glow: string;
  readonly rune: string;
  readonly silhouette: "keep" | "workshop" | "obelisk" | "bastion" | "spire" | "reliquary" | "laboratory";
}

const define = (definition: TowerVisualDefinition): TowerVisualDefinition => Object.freeze(definition);

export const towerVisualCatalog = Object.freeze({
  basic: define({
    id: "basic", name: "Warden's Ballista", role: "Versatile watchtower",
    description: "An oak-and-stone watchtower whose compact ballista protects every road into the outpost.",
    material: "Stone, oak and wrought iron", baseColor: "#7c6650", stoneLight: "#b7aa91",
    stoneDark: "#40382f", metal: "#8c9698", accent: "#d6a84f", glow: "#ffe5a0", rune: "◆",
    silhouette: "keep",
  }),
  rapid: define({
    id: "rapid", name: "Stormwind Repeater", role: "High-rate bolt workshop",
    description: "Twin rune-tension repeaters cycle above a geared timber platform, overwhelming swift attackers.",
    material: "Ashwood, brass gears and violet cord", baseColor: "#66506f", stoneLight: "#aaa0b5",
    stoneDark: "#39303f", metal: "#c09a56", accent: "#a78bfa", glow: "#ddd6fe", rune: "✦",
    silhouette: "workshop",
  }),
  frost: define({
    id: "frost", name: "Winterglass Obelisk", role: "Cryomantic control tower",
    description: "An ancient ice prism draws warmth from the road and brands enemies with slowing winter runes.",
    material: "Frosted stone, silver and winterglass", baseColor: "#477485", stoneLight: "#b8d8d9",
    stoneDark: "#263f4d", metal: "#cbd5e1", accent: "#67e8f9", glow: "#cffafe", rune: "❄",
    silhouette: "obelisk",
  }),
  cannon: define({
    id: "cannon", name: "Ironkeep Bombard", role: "Heavy siege bastion",
    description: "A bronze bombard locked into a braced stone bastion; each discharge shakes the battlements.",
    material: "Basalt, iron braces and aged bronze", baseColor: "#70513d", stoneLight: "#a8957c",
    stoneDark: "#352f2c", metal: "#a56b35", accent: "#fb923c", glow: "#fed7aa", rune: "●",
    silhouette: "bastion",
  }),
  sniper: define({
    id: "sniper", name: "Farwatch Spire", role: "Runic precision tower",
    description: "A narrow ranger spire aligns a moon-silver arbalest through an enchanted long-range lens.",
    material: "Slate, moon-silver and rose quartz", baseColor: "#6b4d65", stoneLight: "#b7a5b6",
    stoneDark: "#352d3a", metal: "#cbd5e1", accent: "#f472b6", glow: "#fce7f3", rune: "⌖",
    silhouette: "spire",
  }),
  tesla: define({
    id: "tesla", name: "Tempest Reliquary", role: "Arcane chain-lightning tower",
    description: "Copper vanes and storm runes bind a captive spark that leaps between clustered foes.",
    material: "Dark stone, copper coils and storm crystal", baseColor: "#5d5944", stoneLight: "#aaa88c",
    stoneDark: "#302f2b", metal: "#b77a43", accent: "#fde047", glow: "#fef9c3", rune: "ϟ",
    silhouette: "reliquary",
  }),
  poison: define({
    id: "poison", name: "Verdigris Crucible", role: "Alchemical attrition tower",
    description: "A sealed alchemical vat distils venom into glass globes and lingering corrosive vapour.",
    material: "Mossy stone, copper pipe and green glass", baseColor: "#46634a", stoneLight: "#9bad91",
    stoneDark: "#29382c", metal: "#9b7145", accent: "#4ade80", glow: "#bbf7d0", rune: "☠",
    silhouette: "laboratory",
  }),
} satisfies Record<TowerVisualId, TowerVisualDefinition>);

export function getTowerVisual(type: string): TowerVisualDefinition {
  return towerVisualCatalog[type as TowerVisualId] ?? towerVisualCatalog.basic;
}

/** Stable data used by tests/debug tooling to prove that upgrades are visually distinct. */
export function towerVisualSignature(type: string, level: number): string {
  const definition = getTowerVisual(type);
  const clamped = Math.max(0, Math.min(2, Math.floor(level)));
  return `${definition.id}:${definition.silhouette}:tier-${clamped + 1}:rings-${clamped + 2}:ornaments-${clamped * 2 + 2}`;
}
