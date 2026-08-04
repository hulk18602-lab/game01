# Eldrin, Warden of the Greenwood — art guide

Eldrin is an adult humanoid forest ranger and archer for a three-quarter top-down medieval fantasy Tower Defense. He wears a deep-green hood and short cloak over brown leather armour, light steel pauldrons and bracers, belt pouches and boots. His long wooden bow carries restrained green-gold runes; a quiver must remain readable above the shoulder. The current WebP assets are original generated **placeholders**, not final production artwork.

## Camera, scale and anchor

- Camera: three-quarter top-down, approximately 35–50° downward angle.
- Source frame: 384×384 (512×512 is also acceptable if metadata changes together).
- Transparent background only; no baked ground shadow.
- Display size: 88×88 world units, roughly 64–100 units depending on the level camera.
- Anchor: `(0.5, 0.9)` — the feet must sit on `hero.position` in every frame.
- Keep head, torso, arms, legs, cloak, bow and facing readable at display scale.

## Atlas contract

`public/assets/hero/archer/archer-atlas.webp` and `archer-atlas.json` are the replacement targets. Atlas rows/metadata must supply these eight directions:

`north`, `north-east`, `east`, `south-east`, `south`, `south-west`, `west`, `north-west`.

Required animation names are `idle`, `walk`, `run`, `aim`, `shoot`, `hit`, `level-up`, `cast`, `aura`, `victory`, and `defeat`. Recommended frame counts: idle 6–10; walk/run 8–12; aim 4–8; shoot 6–10; hit 4–6; level-up 8–16; cast 8–12. Keep a logical release marker near the bow-string release in `shoot`; gameplay timing is independent from this frame marker.

Use names such as `eldrin_idle_south_00.png`, `eldrin_shoot_north-east_04.png`; preserve the same anchor in every export. Update `src/content/visuals/heroVisuals.ts` and `archer-atlas.json` when packing the final atlas.

## Layering and tiers

The preferred source layering order is shadow, lower cloak, legs, body/armour, head/hood, rear bow arm, bow, arrow, rune glow and foreground particles. For west-facing directions, bow/arm layering may sit behind the torso; it must not always be forced on top.

Levels 1–3 are the ranger/scout tier with restrained runes. Levels 4–6 add richer armour and cloak treatment. Levels 7–9 add elite steel and stronger runes. Level 10 adds the legendary green-gold aura and a distinctive bow. Aura particles remain soft and outside the hero silhouette; no opaque effect may conceal the map or hero.

## Licensing

Deliver only original work or assets with explicit compatible licenses. Do not trace, copy, or include copyrighted game characters, branded motifs, watermarks, or unlicensed stock/game atlases.
