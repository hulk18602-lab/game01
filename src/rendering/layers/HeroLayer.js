/** Presentation-only renderer for the independently simulated archer hero. */
export class HeroLayer {
  render(context, state) {
    const hero = state.hero;
    if (!hero) return;
    const target = (state.enemies ?? []).find((enemy) => enemy.id === hero.targetId);
    const facing = target
      ? Math.atan2(target.position.y - hero.position.y, target.position.x - hero.position.x)
      : hero.heading;
    const selected = state.selectedHeroId === hero.id;
    const time = state.visualTime ?? 0;
    const reducedMotion = state.reducedMotion === true;

    if (selected) {
      context.save();
      context.globalAlpha = 0.12;
      context.fillStyle = "#dcfce7";
      context.beginPath();
      context.arc(hero.position.x, hero.position.y, hero.range, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.62;
      context.strokeStyle = "#bbf7d0";
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }

    if (hero.moveTarget) this.drawDestination(context, hero.moveTarget, time, reducedMotion);

    const run = hero.moving && !reducedMotion ? Math.sin(time * 13) : 0;
    context.save();
    context.translate(hero.position.x, hero.position.y);
    context.rotate(facing);
    context.fillStyle = "rgba(15, 23, 42, .36)";
    context.beginPath();
    context.ellipse(1, 11, 17, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#3f2d20";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-5, 8);
    context.lineTo(-10, 16 + run * 2);
    context.moveTo(4, 8);
    context.lineTo(9, 16 - run * 2);
    context.stroke();

    context.fillStyle = "#276749";
    context.beginPath();
    context.moveTo(-12, 8);
    context.lineTo(-8, -11);
    context.lineTo(7, -13);
    context.lineTo(13, 8);
    context.closePath();
    context.fill();
    context.strokeStyle = "#153e2c";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#f0c69d";
    context.beginPath();
    context.arc(0, -16, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#3f6212";
    context.beginPath();
    context.arc(-1, -18, 8.5, Math.PI, Math.PI * 2);
    context.fill();

    const draw = hero.shotAnimation * 7;
    context.strokeStyle = "#6b4423";
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(9, -5, 13 + draw * 0.15, -Math.PI / 2, Math.PI / 2);
    context.stroke();
    context.strokeStyle = "#f8fafc";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(9, -18);
    context.lineTo(9 - draw, -5);
    context.lineTo(9, 8);
    context.stroke();
    context.restore();

    context.save();
    context.fillStyle = "#dcfce7";
    context.font = "800 11px system-ui";
    context.textAlign = "center";
    context.fillText(`Lv ${hero.level}`, hero.position.x, hero.position.y - 31);
    context.restore();
  }

  drawDestination(context, destination, time, reducedMotion) {
    const pulse = reducedMotion ? 0 : Math.sin(time * 5) * 3;
    context.save();
    context.strokeStyle = "#bbf7d0";
    context.fillStyle = "rgba(187, 247, 208, .18)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(destination.x, destination.y, 8 + pulse, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(destination.x - 13, destination.y);
    context.lineTo(destination.x + 13, destination.y);
    context.moveTo(destination.x, destination.y - 13);
    context.lineTo(destination.x, destination.y + 13);
    context.stroke();
    context.restore();
  }
}

export default HeroLayer;
