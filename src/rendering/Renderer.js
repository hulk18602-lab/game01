/**
 * Canvas renderer for already-derived presentation state.
 * Layers receive state as input and must not advance simulation or apply rules.
 */
export class Renderer {
  constructor({ context, camera, layers = [], clearColor = "#111" }) {
    if (!context || !camera) throw new TypeError("Renderer needs a context and camera");
    this.context = context;
    this.camera = camera;
    this.layers = Object.freeze([...layers]);
    this.clearColor = clearColor;
  }

  render(state) {
    const { context, camera } = this;
    const width = camera.viewportWidth || context.canvas.width;
    const height = camera.viewportHeight || context.canvas.height;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = this.clearColor;
    context.fillRect(0, 0, width, height);
    context.restore();

    for (const layer of this.layers) {
      context.save();
      camera.apply(context);
      layer.render(context, state, camera);
      context.restore();
    }
  }
}

export default Renderer;
