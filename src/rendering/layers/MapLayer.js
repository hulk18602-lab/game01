import { RoadRenderer } from "../terrain/RoadRenderer.js";
import { AmbientTerrainRenderer } from "../terrain/AmbientTerrainRenderer.js";
import { TerrainDecorationRenderer } from "../terrain/TerrainDecorationRenderer.js";
import { createTerrainRenderPlan } from "../terrain/TerrainRenderPlan.js";
import { TerrainTileRenderer } from "../terrain/TerrainTileRenderer.js";
import { TerrainTransitionRenderer } from "../terrain/TerrainTransitionRenderer.js";
import { WaterRenderer } from "../terrain/WaterRenderer.js";

/** Cached, presentation-only landscape orchestrator. Gameplay remains owned by Grid. */
export class MapLayer {
  constructor({ grid, converter, mapId = "map01" }) {
    this.grid = grid;
    this.converter = converter;
    this.tileSize = converter.tileSize;
    this.plan = createTerrainRenderPlan({ grid, converter, mapId });
    this.tileRenderer = new TerrainTileRenderer();
    this.waterRenderer = new WaterRenderer();
    this.roadRenderer = new RoadRenderer();
    this.transitionRenderer = new TerrainTransitionRenderer();
    this.decorationRenderer = new TerrainDecorationRenderer();
    this.ambientRenderer = new AmbientTerrainRenderer();
    this.surface = this.#createSurface();
    this.diagnostics = Object.freeze({
      mapId,
      biomeId: this.plan.biome.id,
      cacheReady: this.surface !== null || typeof document === "undefined",
      decorationCount: this.plan.decorations.length,
      routeCellCount: this.plan.roads.length,
      buildableCellCount: this.plan.cells.filter((cell) => cell.tile.buildable).length,
    });
  }

  #canvas() {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas"); canvas.width = this.grid.width * this.tileSize; canvas.height = this.grid.height * this.tileSize;
    return canvas;
  }

  #drawStatic(context) {
    this.tileRenderer.draw(context, this.plan);
    this.waterRenderer.drawStatic(context, this.plan);
    this.roadRenderer.draw(context, this.plan, this.grid, this.tileSize);
    this.transitionRenderer.draw(context, this.plan, this.grid, this.tileSize);
    this.decorationRenderer.draw(context, this.plan);
  }

  #createSurface() {
    const canvas = this.#canvas(); const context = canvas?.getContext("2d");
    if (!canvas || !context) return null;
    this.#drawStatic(context); return canvas;
  }

  render(context, state) {
    if (this.surface) context.drawImage(this.surface, 0, 0); else this.#drawStatic(context);
    this.waterRenderer.drawAmbient(context, this.plan, state.reducedMotion ? 0 : (state.visualTime ?? 0));
    this.ambientRenderer.draw(context, this.plan, state.visualTime ?? 0, state.reducedMotion === true);
  }
}

export default MapLayer;
