import type { MonsterVisualDefinition } from "../../content/visuals/monsterVisuals.js";

export interface LoadedMonsterAsset {
  readonly image: CanvasImageSource;
  readonly loaded: boolean;
  readonly url: string;
}

type ImageFactory = () => HTMLImageElement;

export class MonsterAssetLoader {
  readonly #cache = new Map<string, Promise<LoadedMonsterAsset>>();
  readonly #resolved = new Map<string, LoadedMonsterAsset>();
  readonly #imageFactory: ImageFactory;
  readonly placeholder: CanvasImageSource;
  loadedCount = 0;
  totalCount = 0;

  constructor(options: { readonly imageFactory?: ImageFactory; readonly placeholder?: CanvasImageSource } = {}) {
    this.#imageFactory = options.imageFactory ?? (() => new Image());
    this.placeholder = options.placeholder ?? createPlaceholder();
  }

  get progress(): number {
    return this.totalCount === 0 ? 1 : this.loadedCount / this.totalCount;
  }

  get(url: string): LoadedMonsterAsset | undefined {
    return this.#resolved.get(url);
  }

  load(url: string): Promise<LoadedMonsterAsset> {
    const cached = this.#cache.get(url);
    if (cached) return cached;
    this.totalCount += 1;
    const promise = new Promise<LoadedMonsterAsset>((resolve) => {
      const image = this.#imageFactory();
      const finish = (loaded: boolean): void => {
        const asset = Object.freeze({ image: loaded ? image : this.placeholder, loaded, url });
        this.#resolved.set(url, asset);
        this.loadedCount += 1;
        resolve(asset);
      };
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.decoding = "async";
      image.src = url;
    });
    this.#cache.set(url, promise);
    return promise;
  }

  async preload(definitions: readonly MonsterVisualDefinition[], onProgress?: (progress: number) => void): Promise<void> {
    const uniqueUrls = [...new Set(definitions.map((definition) => definition.atlasUrl))];
    await Promise.all(uniqueUrls.map(async (url) => {
      await this.load(url);
      onProgress?.(this.progress);
    }));
  }
}

function createPlaceholder(): CanvasImageSource {
  if (typeof document === "undefined") return {} as CanvasImageSource;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#312e81";
    context.fillRect(4, 4, 56, 56);
    context.strokeStyle = "#f8fafc";
    context.lineWidth = 4;
    context.strokeRect(4, 4, 56, 56);
    context.beginPath();
    context.moveTo(14, 14);
    context.lineTo(50, 50);
    context.moveTo(50, 14);
    context.lineTo(14, 50);
    context.stroke();
  }
  return canvas;
}
