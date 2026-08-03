# Monster art guide

The files currently named `*-placeholder.png` are temporary original AI-generated placeholders, not final production artwork. Gameplay code reads only the declarative manifest in `src/content/visuals/monsterVisuals.ts`.

## Atlas contract

- Use a transparent PNG or WebP atlas. The repository placeholders use a 4-column × 5-row grid.
- Rows, in order: `idle`, `walk`, `attack`, `hit`, `death`.
- The current compact placeholder set has 4 frames per animation. Final art should use 4–8 idle frames, 6–12 walk frames, 4–8 attack/hit frames, and 8–16 death frames.
- Author each source frame at 256×256 or larger. Keep every frame cell the same size and the background fully transparent.
- Provide four directions (`up`, `down`, `left`, `right`); eight directions can be added by extending `MonsterDirection` and the manifest without changing renderer frame selection.
- Put the character's foot contact at the same normalized anchor in every cell. The default is `(0.5, 0.9)`.
- Do not bake cast shadows into the atlas. The renderer supplies one soft elliptical world-space shadow.
- Avoid color fringes in transparent pixels. Export straight-alpha sRGB.

Each monster directory contains:

```text
atlas-placeholder.png          # runtime placeholder atlas
atlas-source-placeholder.png   # chroma-key generation source
atlas.json                     # artist/tool metadata
portrait-placeholder.png       # UI portrait placeholder
```

Optional final files are `shadow.png` and `weapon.png`. Declare new optional layers in `MonsterVisualDefinition`; do not hard-code paths in `EntityLayer`.

`atlas.json` records the grid, frame dimensions, animation rows, direction policy, anchor, and placeholder status. Runtime clip order and speed live in the TypeScript manifest so metadata can be validated without coupling the renderer to a packing tool.

## Replacing art without gameplay changes

1. Export the replacement atlas at the dimensions recorded by its `atlas.json`, or update only that monster's `frameWidth`, `frameHeight`, `atlasColumns`, display size, and clips in `monsterVisuals.ts`.
2. Replace `atlas-placeholder.png` and `portrait-placeholder.png` in the same directory. Keep the URL stable if dimensions and layout are unchanged.
3. Set `placeholder` to `false` in both the manifest and metadata.
4. Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.

Use only artwork owned by the project or assets with an explicit license compatible with redistribution and commercial use (for example CC0 or a project-specific commercial license). Record author, source, and license in `atlas.json`. Do not add unlicensed or scraped imagery.

## Adding a monster

Create `public/assets/monsters/<id>/`, add its atlas, portrait, and metadata, then add one `visual(...)` entry to `monsterVisuals.ts`. If the gameplay type should reuse another visual, add an alias instead. The loader automatically de-duplicates atlas URLs and falls back to a cached placeholder when an image is missing or corrupt.
