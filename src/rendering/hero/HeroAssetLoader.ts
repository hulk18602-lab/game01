import type { HeroVisualDefinition } from "../../content/visuals/heroVisuals.js";

export interface HeroImagePort {
  src: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  onload: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

export type HeroImageFactory = () => HeroImagePort;

export interface HeroAsset {
  readonly image: HeroImagePort | null;
  readonly usingPlaceholder: boolean;
}

/** Browser image cache with a one-time fallback load for a missing atlas. */
export class HeroAssetLoader {
  readonly #factory: HeroImageFactory;
  readonly #assets = new Map<string, HeroAsset>();
  readonly #loads = new Map<string, Promise<HeroAsset>>();

  constructor(factory: HeroImageFactory = () => new Image()) {
    this.#factory = factory;
  }

  load(definition: HeroVisualDefinition): Promise<HeroAsset> {
    const cached = this.#assets.get(definition.id);
    if (cached) return Promise.resolve(cached);
    const pending = this.#loads.get(definition.id);
    if (pending) return pending;
    const request = this.#loadImage(definition.atlasUrl)
      .then((image) => ({ image, usingPlaceholder: definition.placeholder }))
      .catch(() => this.#loadImage(definition.fallbackAtlasUrl)
        .then((image) => ({ image, usingPlaceholder: true }))
        .catch(() => ({ image: null, usingPlaceholder: true })))
      .then((asset) => {
        this.#assets.set(definition.id, asset);
        this.#loads.delete(definition.id);
        return asset;
      });
    this.#loads.set(definition.id, request);
    return request;
  }

  peek(definition: HeroVisualDefinition): HeroAsset | null {
    return this.#assets.get(definition.id) ?? null;
  }

  #loadImage(url: string): Promise<HeroImagePort> {
    return new Promise((resolve, reject) => {
      const image = this.#factory();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load hero asset: ${url}`));
      image.src = url;
      if (image.complete && image.naturalWidth > 0) resolve(image);
    });
  }
}

export default HeroAssetLoader;
