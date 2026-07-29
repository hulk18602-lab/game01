export class EffectLayer {
  render(context, state) {
    for (const effect of state.effects ?? []) {
      const position = effect.renderPosition ?? effect.position;
      if (!position || effect.visible === false) continue;
      context.globalAlpha = effect.opacity ?? 1;
      context.strokeStyle = effect.color ?? "#fff";
      context.lineWidth = effect.lineWidth ?? 2;
      context.beginPath();
      context.arc(position.x, position.y, effect.radius ?? 8, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }
}

export default EffectLayer;
