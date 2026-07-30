export class EffectLayer {
  render(context, state) {
    for (const effect of state.effects ?? []) {
      const position = effect.position;
      if (!position || effect.opacity <= 0) continue;
      context.save();
      context.globalAlpha = effect.opacity;
      context.translate(position.x, position.y);
      context.rotate(effect.rotation ?? 0);
      context.strokeStyle = effect.color ?? "#fff";
      context.fillStyle = effect.color ?? "#fff";
      context.lineWidth = effect.lineWidth ?? 2;

      if (effect.text) {
        context.font = effect.font ?? "bold 14px system-ui";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowBlur = 5;
        context.shadowColor = "rgba(15, 23, 42, .85)";
        context.fillText(effect.text, 0, 0);
      } else if (effect.shape === "spark") {
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(-effect.radius * 2.4, 0);
        context.lineTo(effect.radius * 2.4, 0);
        context.stroke();
      } else if (effect.shape === "snow") {
        context.beginPath();
        for (let arm = 0; arm < 3; arm += 1) {
          const angle = arm * Math.PI / 3;
          context.moveTo(Math.cos(angle) * -effect.radius, Math.sin(angle) * -effect.radius);
          context.lineTo(Math.cos(angle) * effect.radius, Math.sin(angle) * effect.radius);
        }
        context.stroke();
      } else {
        if (effect.shape === "smoke") {
          context.shadowBlur = effect.radius * 1.4;
          context.shadowColor = effect.color;
        }
        context.beginPath();
        context.arc(0, 0, effect.radius ?? 8, 0, Math.PI * 2);
        if (effect.fill === true) context.fill();
        else context.stroke();
      }
      context.restore();
    }
  }
}

export default EffectLayer;
