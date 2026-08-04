import type { Position } from "../game/types.js";

export interface CombatEffectEvent {
  readonly type: "shot" | "hit" | "enemy-death" | "boss-phase" | "enemy-heal" | "enemy-enrage" | "enemy-summon";
  readonly position: Position;
  readonly damage?: number;
  readonly damageType?: string;
  readonly areaRadius?: number;
  readonly phase?: number;
  readonly sourceId?: string;
  readonly targetId?: string;
  readonly reward?: number;
  readonly contributions?: readonly {
    readonly sourceId: string;
    readonly damage: number;
  }[];
}

export interface VisualEffect {
  type: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  color: string;
  fill: boolean;
  lineWidth: number;
  text: string;
  font: string;
  duration: number;
  remaining: number;
  growth: number;
  gravity: number;
  damping: number;
  opacity: number;
  rotation: number;
  spin: number;
  shape: "circle" | "spark" | "snow" | "smoke";
}

const createEffect = (): VisualEffect => ({
  type: "",
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  radius: 0,
  color: "#fff",
  fill: false,
  lineWidth: 2,
  text: "",
  font: "bold 14px system-ui",
  duration: 0,
  remaining: 0,
  growth: 0,
  gravity: 0,
  damping: 1,
  opacity: 0,
  rotation: 0,
  spin: 0,
  shape: "circle",
});

/** Fixed-capacity presentation pool for particles, flashes and floating labels. */
export class CombatEffectPool {
  readonly effects: VisualEffect[] = [];
  readonly #free: VisualEffect[];
  #reducedMotion = false;
  #seed = 0x1f2e3d4c;
  shakeIntensity = 0;

  constructor(readonly capacity = 420) {
    this.#free = Array.from({ length: capacity }, createEffect);
  }

  setReducedMotion(reduced: boolean): void {
    this.#reducedMotion = reduced;
    if (reduced) this.shakeIntensity = 0;
  }

  clear(): void {
    while (this.effects.length > 0) this.#releaseAt(this.effects.length - 1);
    this.shakeIntensity = 0;
  }

  emit(event: CombatEffectEvent): void {
    if (event.type === "enemy-heal") {
      this.#activate("enemy-heal", event.position, 18, "#86efac", 0.45, false, "circle", 28, 2);
      this.#burst(event.position, "#bbf7d0", this.#reducedMotion ? 2 : 8, 48, "spark");
      return;
    }
    if (event.type === "enemy-enrage") {
      this.#activate("enemy-enrage", event.position, 22, "#ef4444", 0.55, false, "circle", 34, 3);
      return;
    }
    if (event.type === "shot") {
      this.#activate("muzzle", event.position, 7, "#fff1a8", 0.1, true, "circle");
      this.#burst(event.position, "#fde68a", this.#reducedMotion ? 1 : 3, 45, "spark");
      return;
    }
    if (event.type === "hit") {
      const cold = event.damageType === "cold";
      const explosive = (event.areaRadius ?? 0) > 0;
      const electric = event.damageType === "electric";
      const poison = event.damageType === "poison";
      const hitColor = cold
        ? "#a5f3fc"
        : explosive
          ? "#fb923c"
          : electric
            ? "#fde047"
            : poison
              ? "#4ade80"
              : "#f8fafc";
      this.#activate(
        cold ? "frost-hit" : explosive ? "explosion-ring" : electric ? "arc-hit" : poison ? "poison-cloud" : "hit-ring",
        event.position,
        cold ? 12 : explosive ? Math.max(18, (event.areaRadius ?? 0) * 0.4) : poison ? 14 : 9,
        hitColor,
        explosive ? 0.34 : poison ? .48 : 0.2,
        poison,
        poison ? "smoke" : "circle",
        explosive ? 52 : poison ? 12 : 18,
        explosive ? 4 : 2,
      );
      this.#floatingDamage(event.position, Math.round(event.damage ?? 0), cold);
      this.#burst(
        event.position,
        cold ? "#67e8f9" : explosive ? "#fdba74" : electric ? "#fef08a" : poison ? "#86efac" : "#fef3c7",
        this.#reducedMotion ? 2 : explosive ? 14 : cold ? 8 : electric ? 10 : poison ? 7 : 5,
        explosive ? 105 : 68,
        cold ? "snow" : poison ? "smoke" : "spark",
      );
      if (electric && !this.#reducedMotion) {
        this.#activate("arc-core", event.position, 4, "#fff7ad", .13, true, "circle", 25, 2);
      }
      if (!this.#reducedMotion && ((event.damage ?? 0) >= 80 || (event.areaRadius ?? 0) >= 60)) {
        this.shakeIntensity = Math.max(
          this.shakeIntensity,
          (event.damage ?? 0) >= 150 ? 6 : 3.5,
        );
      }
      return;
    }
    if (event.type === "enemy-death") {
      this.#activate("death-ring", event.position, 12, "#fb7185", 0.48, false, "circle", 48, 3);
      this.#burst(event.position, "#fb7185", this.#reducedMotion ? 3 : 12, 92, "spark");
      this.#burst(event.position, "#64748b", this.#reducedMotion ? 1 : 5, 34, "smoke");
      return;
    }
    this.#activate("boss-phase", event.position, 24, "#d8b4fe", 0.72, false, "circle", 84, 4);
    this.#burst(event.position, "#c084fc", this.#reducedMotion ? 4 : 18, 118, "spark");
    if (!this.#reducedMotion) this.shakeIntensity = Math.max(this.shakeIntensity, 5);
  }

  update(deltaSeconds: number): void {
    this.shakeIntensity = Math.max(0, this.shakeIntensity - deltaSeconds * 16);
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.remaining -= deltaSeconds;
      if (effect.remaining <= 0) {
        this.#releaseAt(index);
        continue;
      }
      effect.opacity = Math.max(0, effect.remaining / effect.duration);
      effect.velocity.y += effect.gravity * deltaSeconds;
      effect.position.x += effect.velocity.x * deltaSeconds;
      effect.position.y += effect.velocity.y * deltaSeconds;
      const drag = Math.pow(effect.damping, deltaSeconds * 60);
      effect.velocity.x *= drag;
      effect.velocity.y *= drag;
      effect.radius += effect.growth * deltaSeconds;
      effect.rotation += effect.spin * deltaSeconds;
    }
  }

  #floatingDamage(position: Position, damage: number, cold: boolean): void {
    const effect = this.#activate(
      "damage",
      { x: position.x, y: position.y - 18 },
      0,
      cold ? "#cffafe" : "#fff7ed",
      0.62,
      false,
      "circle",
    );
    effect.text = `-${damage}`;
    effect.font = damage >= 80 ? "800 17px system-ui" : "800 14px system-ui";
    effect.velocity.y = this.#reducedMotion ? -8 : -25;
  }

  #burst(
    position: Position,
    color: string,
    count: number,
    speed: number,
    shape: VisualEffect["shape"],
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.#random() * Math.PI * 2;
      const velocity = speed * (0.45 + this.#random() * 0.65);
      const effect = this.#activate(
        shape === "smoke" ? "smoke" : "particle",
        position,
        shape === "smoke" ? 4 + this.#random() * 3 : 1.5 + this.#random() * 2.5,
        color,
        shape === "smoke" ? 0.65 : 0.38 + this.#random() * 0.24,
        true,
        shape,
        shape === "smoke" ? 9 : -1.5,
      );
      effect.velocity.x = Math.cos(angle) * velocity;
      effect.velocity.y = Math.sin(angle) * velocity - (shape === "smoke" ? 18 : 0);
      effect.gravity = shape === "spark" ? 85 : shape === "snow" ? 24 : -4;
      effect.damping = shape === "smoke" ? 0.96 : 0.985;
      effect.rotation = angle;
      effect.spin = (this.#random() - 0.5) * 9;
    }
  }

  #activate(
    type: string,
    position: Position,
    radius: number,
    color: string,
    duration: number,
    fill: boolean,
    shape: VisualEffect["shape"],
    growth = 0,
    lineWidth = 2,
  ): VisualEffect {
    if (this.#free.length === 0) this.#releaseAt(0);
    const effect = this.#free.pop()!;
    effect.type = type;
    effect.position.x = position.x;
    effect.position.y = position.y;
    effect.velocity.x = 0;
    effect.velocity.y = 0;
    effect.radius = radius;
    effect.color = color;
    effect.fill = fill;
    effect.lineWidth = lineWidth;
    effect.text = "";
    effect.font = "bold 14px system-ui";
    effect.duration = duration;
    effect.remaining = duration;
    effect.growth = growth;
    effect.gravity = 0;
    effect.damping = 1;
    effect.opacity = 1;
    effect.rotation = 0;
    effect.spin = 0;
    effect.shape = shape;
    this.effects.push(effect);
    return effect;
  }

  #releaseAt(index: number): void {
    const effect = this.effects[index];
    if (!effect) return;
    this.effects.splice(index, 1);
    if (this.#free.length < this.capacity) this.#free.push(effect);
  }

  #random(): number {
    this.#seed = (Math.imul(this.#seed, 1664525) + 1013904223) >>> 0;
    return this.#seed / 0x100000000;
  }
}

export default CombatEffectPool;
