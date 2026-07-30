import { heroSkillDefinitions } from "../../content/heroes/heroSkills.js";
import type { HeroEntity } from "../../entities/HeroEntity.js";
import type { RuntimeTower } from "../runtime.js";

/** Derives temporary tower stats from base values. No multiplier is ever applied cumulatively. */
export class TowerAuraSystem {
  update(hero: HeroEntity | null, towers: readonly RuntimeTower[]): void {
    const auraLevel = hero?.skills.rallyAura ?? 0;
    const effect = auraLevel > 0
      ? heroSkillDefinitions.rallyAura.levels[auraLevel - 1] ?? null
      : null;
    const radius = effect?.auraRadius ?? 0;
    const radiusSquared = radius * radius;
    for (const tower of towers) {
      const dx = hero ? tower.position.x - hero.position.x : 0;
      const dy = hero ? tower.position.y - hero.position.y : 0;
      const buffed = effect !== null && dx * dx + dy * dy <= radiusSquared;
      tower.auraBuffed = buffed;
      tower.effectiveDamage = buffed
        ? tower.baseDamage * (1 + (effect.auraDamageBonus ?? 0))
        : tower.baseDamage;
      tower.effectiveFireRate = buffed
        ? tower.baseFireRate * (1 + (effect.auraFireRateBonus ?? 0))
        : tower.baseFireRate;
    }
  }
}

export default TowerAuraSystem;
