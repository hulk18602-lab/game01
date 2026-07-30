import CombatSystem from "./CombatSystem.js";
import TargetingSystem from "./TargetingSystem.js";

/** Uses shared targeting/projectile stages while keeping the hero outside runtimeTowers. */
export class HeroCombatSystem {
  constructor() {
    this.targeting = new TargetingSystem();
    this.combat = new CombatSystem();
    this.attackers = [];
  }

  update(deltaSeconds, hero, enemies, projectileSystem) {
    if (!hero) return;
    hero.targetId = this.targeting.selectTarget(hero, enemies)?.id ?? null;
    this.attackers[0] = hero;
    this.attackers.length = 1;
    this.combat.update(deltaSeconds, this.attackers, enemies, projectileSystem);
  }
}

export default HeroCombatSystem;
