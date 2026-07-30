export class EffectLayer {
  render(context, state) {
    for (const effect of state.effects ?? []) {
      const position = effect.position;
      if (!position || effect.visible === false) continue;
      context.globalAlpha = effect.opacity ?? 1;
      if (effect.text) {
        context.fillStyle = effect.color ?? "#fff";
        context.font = effect.font ?? "bold 14px system-ui";
        context.textAlign = "center";
        context.fillText(effect.text, position.x, position.y);
      } else {
        context.strokeStyle = effect.color ?? "#fff";
        context.fillStyle = effect.color ?? "#fff";
        context.lineWidth = effect.lineWidth ?? 2;
        context.beginPath();
        context.arc(position.x, position.y, effect.radius ?? 8, 0, Math.PI * 2);
        if (effect.fill === true) context.fill();
        else context.stroke();
      }
      context.globalAlpha = 1;
    }
  }
}

export default EffectLayer;
