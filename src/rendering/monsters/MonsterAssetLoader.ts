import {
  type MonsterAnimationState,
  type MonsterAtlasMetadata,
  type MonsterVisualDefinition,
} from "../../content/visuals/monsterVisuals.js";

export interface MonsterAtlasDiagnostic {
  readonly id: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly padding: number;
  readonly valid: boolean;
  readonly fallbackUsed: boolean;
}

export interface LoadedMonsterAsset {
  readonly image: CanvasImageSource;
  readonly loaded: boolean;
  readonly valid: boolean;
  readonly fallbackUsed: boolean;
  readonly url: string;
  readonly metadata: MonsterAtlasMetadata;
}

type ImageFactory = () => HTMLImageElement;
type MetadataLoader = (url: string) => Promise<unknown>;

const animationStates: readonly MonsterAnimationState[] = ["idle", "walk", "attack", "hit", "death"];

export class MonsterAssetLoader {
  readonly #cache = new Map<string, Promise<LoadedMonsterAsset>>();
  readonly #resolved = new Map<string, LoadedMonsterAsset>();
  readonly #diagnostics = new Map<string, MonsterAtlasDiagnostic>();
  readonly #imageFactory: ImageFactory;
  readonly #metadataLoader: MetadataLoader;
  readonly placeholder: CanvasImageSource;
  loadedCount = 0;
  totalCount = 0;

  constructor(options: {
    readonly imageFactory?: ImageFactory;
    readonly metadataLoader?: MetadataLoader;
    readonly placeholder?: CanvasImageSource;
  } = {}) {
    this.#imageFactory = options.imageFactory ?? (() => new Image());
    this.#metadataLoader = options.metadataLoader ?? (async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
    this.placeholder = options.placeholder ?? createPlaceholder();
  }

  get progress(): number {
    return this.totalCount === 0 ? 1 : this.loadedCount / this.totalCount;
  }

  get diagnostics(): readonly MonsterAtlasDiagnostic[] {
    return [...this.#diagnostics.values()];
  }

  get allValid(): boolean {
    return this.totalCount > 0
      && this.loadedCount === this.totalCount
      && this.diagnostics.every((diagnostic) => diagnostic.valid && !diagnostic.fallbackUsed);
  }

  get(url: string): LoadedMonsterAsset | undefined {
    return this.#resolved.get(url);
  }

  load(definition: MonsterVisualDefinition): Promise<LoadedMonsterAsset> {
    const cached = this.#cache.get(definition.atlasUrl);
    if (cached) return cached;
    this.totalCount += 1;
    const promise = this.#loadAndValidate(definition);
    this.#cache.set(definition.atlasUrl, promise);
    return promise;
  }

  async preload(definitions: readonly MonsterVisualDefinition[], onProgress?: (progress: number) => void): Promise<void> {
    const unique = [...new Map(definitions.map((definition) => [definition.atlasUrl, definition])).values()];
    await Promise.all(unique.map(async (definition) => {
      await this.load(definition);
      onProgress?.(this.progress);
    }));
  }

  async #loadAndValidate(definition: MonsterVisualDefinition): Promise<LoadedMonsterAsset> {
    const image = this.#imageFactory();
    const imagePromise = new Promise<{ loaded: boolean; width: number; height: number }>((resolve) => {
      image.onload = () => resolve({
        loaded: true,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      image.onerror = () => resolve({ loaded: false, width: 0, height: 0 });
      image.decoding = "async";
      image.src = definition.atlasUrl;
    });
    const [metadataResult, imageResult] = await Promise.all([
      this.#metadataLoader(definition.metadataUrl)
        .then((metadata) => ({ metadata, error: "" }))
        .catch((error: unknown) => ({ metadata: null, error: error instanceof Error ? error.message : String(error) })),
      imagePromise,
    ]);
    const validation = validateMetadata(metadataResult.metadata, definition, imageResult.width, imageResult.height);
    const valid = imageResult.loaded && validation.valid;
    const metadata = valid ? validation.metadata! : fallbackMetadata(definition.id);
    const asset: LoadedMonsterAsset = Object.freeze({
      image: valid ? image : this.placeholder,
      loaded: valid,
      valid,
      fallbackUsed: !valid,
      url: definition.atlasUrl,
      metadata,
    });
    const source = validation.metadata?.atlas;
    this.#diagnostics.set(definition.id, Object.freeze({
      id: definition.id,
      imageWidth: imageResult.width,
      imageHeight: imageResult.height,
      columns: source?.columns ?? 0,
      rows: source?.rows ?? 0,
      frameWidth: source?.frameWidth ?? 0,
      frameHeight: source?.frameHeight ?? 0,
      padding: source?.padding ?? 0,
      valid,
      fallbackUsed: !valid,
    }));
    if (!valid) {
      const reason = metadataResult.error || validation.reason || "image failed to load";
      warnDevelopment(`[MonsterAssetLoader] ${definition.id}: invalid atlas; safe placeholder used (${reason}).`);
    }
    this.#resolved.set(definition.atlasUrl, asset);
    this.loadedCount += 1;
    return asset;
  }
}

function validateMetadata(
  value: unknown,
  definition: MonsterVisualDefinition,
  imageWidth: number,
  imageHeight: number,
): { readonly valid: boolean; readonly metadata: MonsterAtlasMetadata | null; readonly reason: string } {
  if (!isRecord(value) || !isRecord(value.atlas) || !isRecord(value.animations) || !isRecord(value.anchor)) {
    return { valid: false, metadata: null, reason: "metadata contract is incomplete" };
  }
  const metadata = value as unknown as MonsterAtlasMetadata;
  const atlas = metadata.atlas;
  const integers = [
    metadata.schemaVersion, atlas.width, atlas.height, atlas.columns, atlas.rows,
    atlas.frameWidth, atlas.frameHeight, atlas.contentWidth, atlas.contentHeight, atlas.padding,
  ];
  if (!integers.every(Number.isInteger)) return { valid: false, metadata, reason: "atlas geometry must use integers" };
  if (metadata.schemaVersion < 2 || metadata.id !== definition.id) {
    return { valid: false, metadata, reason: "metadata schema or id mismatch" };
  }
  if (typeof atlas.file !== "string" || !definition.atlasUrl.endsWith(`/${atlas.file}`)) {
    return { valid: false, metadata, reason: "metadata atlas filename does not match the requested image" };
  }
  if (atlas.columns <= 0 || atlas.rows <= 0 || atlas.frameWidth <= 0 || atlas.frameHeight <= 0
    || atlas.contentWidth <= 0 || atlas.contentHeight <= 0 || atlas.padding < 0) {
    return { valid: false, metadata, reason: "atlas geometry must be positive" };
  }
  if (atlas.width !== atlas.columns * atlas.frameWidth
    || atlas.height !== atlas.rows * atlas.frameHeight) {
    return { valid: false, metadata, reason: "atlas dimensions do not match its cell grid" };
  }
  if (atlas.contentWidth + atlas.padding * 2 > atlas.frameWidth
    || atlas.contentHeight + atlas.padding * 2 > atlas.frameHeight) {
    return { valid: false, metadata, reason: "content rectangle exceeds padded cell" };
  }
  if (imageWidth !== atlas.width || imageHeight !== atlas.height) {
    return { valid: false, metadata, reason: `image ${imageWidth}x${imageHeight} does not match metadata ${atlas.width}x${atlas.height}` };
  }
  const frameCount = atlas.columns * atlas.rows;
  for (const state of animationStates) {
    const frames = metadata.animations[state];
    if (!Array.isArray(frames) || frames.length === 0
      || !frames.every((frame) => Number.isInteger(frame) && frame >= 0 && frame < frameCount)) {
      return { valid: false, metadata, reason: `animation ${state} contains an invalid frame` };
    }
  }
  if (!Number.isFinite(metadata.anchor.x) || !Number.isFinite(metadata.anchor.y)
    || metadata.anchor.x < 0 || metadata.anchor.x > 1
    || metadata.anchor.y < 0 || metadata.anchor.y > 1) {
    return { valid: false, metadata, reason: "anchor must be normalized" };
  }
  return { valid: true, metadata, reason: "" };
}

function fallbackMetadata(id: string): MonsterAtlasMetadata {
  const frames = Object.freeze([0]);
  return Object.freeze({
    schemaVersion: 2,
    id,
    atlas: Object.freeze({
      file: "safe-placeholder", width: 64, height: 64, columns: 1, rows: 1,
      frameWidth: 64, frameHeight: 64, contentWidth: 64, contentHeight: 64, padding: 0,
    }),
    animations: Object.freeze({ idle: frames, walk: frames, attack: frames, hit: frames, death: frames }),
    anchor: Object.freeze({ x: 0.5, y: 0.9 }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function warnDevelopment(message: string): void {
  const environment = (import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }).env;
  if (environment?.DEV) console.warn(message);
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
