import MovementSystem from "../../systems/MovementSystem.js";
import CleanupSystem from "./CleanupSystem.js";
import CombatSystem from "./CombatSystem.js";
import EnemyAbilitySystem from "./EnemyAbilitySystem.js";
import ProjectileSystem from "./ProjectileSystem.js";
import StatusEffectSystem from "./StatusEffectSystem.js";
import TargetingSystem from "./TargetingSystem.js";

/**
 * Coordinates the existing combat stages. It owns no UI, wave or economy rules.
 * Returned deltas are committed by the session/application layer.
 */
export class BattleSimulation {
  constructor(path) {
    this.movement = new MovementSystem(path);
    this.targeting = new TargetingSystem();
    this.combat = new CombatSystem();
    this.projectiles = new ProjectileSystem();
    this.statusEffects = new StatusEffectSystem();
    this.abilities = new EnemyAbilitySystem();
    this.cleanup = new CleanupSystem();
  }

  update(deltaSeconds, towers, enemies) {
    this.statusEffects.update(deltaSeconds, enemies);
    this.abilities.update(deltaSeconds, enemies);
    const reached = this.movement.update(enemies, deltaSeconds);
    let baseDamage = 0;
    this.movement.handleBaseReached(reached, (enemy) => {
      baseDamage += enemy.baseDamage;
    });
    this.targeting.update(towers, enemies);
    this.combat.update(deltaSeconds, towers, enemies, this.projectiles);
    this.projectiles.update(deltaSeconds, enemies, this.statusEffects);
    const wallet = { currency: 0 };
    this.cleanup.update(enemies, wallet);
    return {
      baseDamage,
      reward: wallet.currency,
      events: [
        ...this.projectiles.drainEvents(),
        ...this.abilities.drainEvents(),
      ],
    };
  }

  reset() {
    this.projectiles = new ProjectileSystem();
    this.abilities = new EnemyAbilitySystem();
  }
}

export default BattleSimulation;
