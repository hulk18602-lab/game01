import MovementSystem from "../../systems/MovementSystem.js";
import CleanupSystem from "./CleanupSystem.js";
import CombatSystem from "./CombatSystem.js";
import EnemyAbilitySystem from "./EnemyAbilitySystem.js";
import HeroCombatSystem from "./HeroCombatSystem.js";
import ProjectileSystem from "./ProjectileSystem.js";
import StatusEffectSystem from "./StatusEffectSystem.js";
import TargetingSystem from "./TargetingSystem.js";

/**
 * Coordinates the existing combat stages. It owns no UI, wave or economy rules.
 * Returned deltas are committed by the session/application layer.
 */
export class BattleSimulation {
  constructor(path, { createEnemy } = {}) {
    this.movement = new MovementSystem(path);
    this.createEnemy = createEnemy;
    this.targeting = new TargetingSystem();
    this.combat = new CombatSystem();
    this.heroCombat = new HeroCombatSystem();
    this.projectiles = new ProjectileSystem();
    this.statusEffects = new StatusEffectSystem();
    this.abilities = new EnemyAbilitySystem({ createEnemy });
    this.cleanup = new CleanupSystem();
  }

  update(deltaSeconds, towers, enemies, hero = null) {
    this.statusEffects.update(deltaSeconds, enemies);
    this.abilities.update(deltaSeconds, enemies, towers);
    const reached = this.movement.update(enemies, deltaSeconds);
    let baseDamage = 0;
    this.movement.handleBaseReached(reached, (enemy) => {
      baseDamage += enemy.baseDamage;
    });
    this.targeting.update(towers, enemies);
    this.combat.update(deltaSeconds, towers, enemies, this.projectiles);
    this.heroCombat.update(deltaSeconds, hero, enemies, this.projectiles);
    this.projectiles.update(deltaSeconds, enemies, this.statusEffects);
    const projectileEvents = this.projectiles.drainEvents();
    const recordedDeaths = new Set(
      projectileEvents
        .filter((event) => event.type === "enemy-death")
        .map((event) => event.targetId),
    );
    for (const enemy of enemies) {
      if (enemy.health > 0 || enemy.removalReason === "reached-base" || recordedDeaths.has(enemy.id)) {
        continue;
      }
      projectileEvents.push({
        type: "enemy-death",
        sourceId: enemy.lastDamageSourceId ?? "",
        targetId: enemy.id,
        position: { ...enemy.position },
        damageType: "status",
        reward: enemy.reward ?? 0,
        contributions: [...(enemy.damageContributors ?? new Map())].map(
          ([sourceId, damage]) => ({ sourceId, damage }),
        ),
      });
    }
    const splitChildren = this.abilities.spawnOnDeath(enemies);
    if (splitChildren.length > 0) enemies.push(...splitChildren);
    const wallet = { currency: 0 };
    this.cleanup.update(enemies, wallet);
    return {
      baseDamage,
      reward: wallet.currency,
      events: [
        ...projectileEvents,
        ...this.abilities.drainEvents(),
      ],
    };
  }

  reset() {
    this.projectiles = new ProjectileSystem();
    this.heroCombat = new HeroCombatSystem();
    this.abilities = new EnemyAbilitySystem({ createEnemy: this.createEnemy });
  }
}

export default BattleSimulation;
