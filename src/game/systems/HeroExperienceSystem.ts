import type { HeroEntity } from "../../entities/HeroEntity.js";
import type { CombatEffectEvent } from "../../rendering/CombatEffectPool.js";

export interface HeroExperienceResult {
  readonly xpAwarded: number;
  readonly levelsGained: number;
}

/**
 * Awards kill participation XP without duplicating a full reward.
 *
 * A sole contributor receives 100%. With multiple contributors, the final blow
 * receives 70% and the remaining 30% is divided among assists by damage dealt.
 */
export class HeroExperienceSystem {
  award(event: CombatEffectEvent, hero: HeroEntity): HeroExperienceResult {
    if (event.type !== "enemy-death") return { xpAwarded: 0, levelsGained: 0 };
    const reward = Math.max(1, Math.floor(event.reward ?? 1));
    const contributions = (event.contributions ?? [])
      .filter((entry) => Number.isFinite(entry.damage) && entry.damage > 0);
    const heroDamage = contributions
      .filter((entry) => entry.sourceId === hero.id)
      .reduce((total, entry) => total + entry.damage, 0);
    if (heroDamage <= 0) return { xpAwarded: 0, levelsGained: 0 };

    let xpAwarded = reward;
    if (contributions.some((entry) => entry.sourceId !== hero.id)) {
      if (event.sourceId === hero.id) {
        xpAwarded = Math.max(1, Math.floor(reward * 0.7));
      } else {
        const assistDamage = contributions
          .filter((entry) => entry.sourceId !== event.sourceId)
          .reduce((total, entry) => total + entry.damage, 0);
        xpAwarded = Math.max(1, Math.floor(
          reward * 0.3 * (heroDamage / Math.max(heroDamage, assistDamage)),
        ));
      }
    }
    return { xpAwarded, levelsGained: hero.gainXp(xpAwarded) };
  }
}

export default HeroExperienceSystem;
