import type { HeroVisualDefinition } from "../../content/visuals/heroVisuals.js";
import type { HeroEntity } from "../../entities/HeroEntity.js";
import type { HeroVisualState } from "./HeroVisualState.js";
import HeroAssetLoader from "./HeroAssetLoader.js";

/** Draws the cached atlas (or a clear procedural fallback) at a stable feet anchor. */
export class HeroSpriteRenderer {
  readonly #assets: HeroAssetLoader;

  constructor(assets = new HeroAssetLoader()) {
    this.#assets = assets;
  }

  render(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    definition: HeroVisualDefinition,
  ): void {
    void this.#assets.load(definition);
    const asset = this.#assets.peek(definition);
    this.#shadow(context, hero, definition);
    if (asset?.image) {
      this.#image(context, hero, visual, definition, asset.usingPlaceholder, asset.image);
    } else {
      this.#fallback(context, hero, visual, definition);
    }
  }

  #shadow(context: CanvasRenderingContext2D, hero: HeroEntity, definition: HeroVisualDefinition): void {
    context.save();
    context.fillStyle = "rgba(8, 15, 25, .36)";
    context.beginPath();
    context.ellipse(hero.position.x, hero.position.y + 4, 21 * definition.shadowScale, 8 * definition.shadowScale, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  #image(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    definition: HeroVisualDefinition,
    placeholder: boolean,
    image: { readonly naturalWidth: number; readonly naturalHeight: number },
  ): void {
    const tierScale = visual.visualTier === "legendary" ? 1.12 : visual.visualTier === "elite" ? 1.07 : visual.visualTier === "warden" ? 1.03 : 1;
    const width = definition.displayWidth * tierScale;
    const height = definition.displayHeight * tierScale;
    const x = hero.position.x - width * definition.anchorX;
    const y = hero.position.y - height * definition.anchorY;
    context.save();
    if (visual.direction === "west" || visual.direction === "north-west" || visual.direction === "south-west") {
      context.translate(hero.position.x, 0);
      context.scale(-1, 1);
      context.translate(-hero.position.x, 0);
    }
    if (placeholder) {
      context.drawImage(image as CanvasImageSource, x, y, width, height);
    } else {
      const sourceX = (visual.frame % definition.atlasColumns) * definition.frameWidth;
      const sourceY = Math.floor(visual.frame / definition.atlasColumns) * definition.frameHeight;
      context.drawImage(
        image as CanvasImageSource,
        sourceX,
        sourceY,
        definition.frameWidth,
        definition.frameHeight,
        x,
        y,
        width,
        height,
      );
    }
    this.#runes(context, hero, visual, width, height);
    context.restore();
  }

  #runes(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    width: number,
    height: number,
  ): void {
    const intensity = visual.visualTier === "legendary" ? 0.85 : visual.visualTier === "elite" ? 0.58 : visual.visualTier === "warden" ? 0.36 : 0.2;
    context.save();
    context.globalAlpha = intensity;
    context.strokeStyle = "#d9f99d";
    context.shadowBlur = 8 * intensity;
    context.shadowColor = "#a3e635";
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(hero.position.x + width * 0.19, hero.position.y - height * 0.46, Math.max(5, width * 0.09), -1.05, 1.05);
    context.stroke();
    context.restore();
  }

  #fallback(
    context: CanvasRenderingContext2D,
    hero: HeroEntity,
    visual: HeroVisualState,
    definition: HeroVisualDefinition,
  ): void {
    const x = hero.position.x;
    const y = hero.position.y;
    context.save();
    context.translate(x, y);
    context.fillStyle = "#214e34";
    context.beginPath();
    context.moveTo(-18, 8);
    context.lineTo(-12, -24);
    context.lineTo(14, -24);
    context.lineTo(22, 11);
    context.closePath();
    context.fill();
    context.fillStyle = "#6b4423";
    context.fillRect(-10, -12, 20, 23);
    context.fillStyle = "#d4a373";
    context.beginPath();
    context.arc(0, -31, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#183c2a";
    context.beginPath();
    context.arc(0, -33, 11, Math.PI, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#9a6b35";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(14, -9, 15, -Math.PI / 2, Math.PI / 2);
    context.stroke();
    context.restore();
  }
}

export default HeroSpriteRenderer;
