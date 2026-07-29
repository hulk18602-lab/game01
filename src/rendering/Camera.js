/** View transform. Movement is controlled by the application, never by Renderer. */
export class Camera {
  constructor({ x = 0, y = 0, zoom = 1, viewportWidth = 0, viewportHeight = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  worldToScreen({ x, y }) {
    return { x: (x - this.x) * this.zoom, y: (y - this.y) * this.zoom };
  }

  screenToWorld({ x, y }) {
    return { x: x / this.zoom + this.x, y: y / this.zoom + this.y };
  }

  visibleBounds() {
    return { x: this.x, y: this.y, width: this.viewportWidth / this.zoom, height: this.viewportHeight / this.zoom };
  }

  apply(context) {
    context.scale(this.zoom, this.zoom);
    context.translate(-this.x, -this.y);
  }
}

export default Camera;
