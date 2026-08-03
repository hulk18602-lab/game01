import {
  type CampaignRuntime,
  type CampaignSession,
} from "../game/CampaignSession.js";
import {
  heroSkillDefinitions,
  heroSkillIds,
} from "../content/heroes/heroSkills.js";
import { eldrinVisual, visualTierForHeroLevel } from "../content/visuals/heroVisuals.js";
import { getTowerVisual } from "../content/visuals/towerVisuals.js";
import type {
  OverlayView,
  UiSelectors,
} from "../ui/index.js";

export const isGameplayPhase = (phase: string): boolean =>
  phase === "preparing" || phase === "wave" || phase === "paused";

/** Builds read-only UI projections; DOM components never inspect game entities directly. */
export function createUiSelectors(session: CampaignSession): UiSelectors<CampaignRuntime> {
  return {
    hud: (state) => {
      const composition = session.nextWaveComposition();
      return {
        visible: isGameplayPhase(session.phase),
        lives: state.lives,
        money: state.players.get("player")!.balance,
        score: state.score,
        wave: session.currentWaveNumber,
        totalWaves: session.totalWaves,
        enemiesRemaining: session.enemiesRemaining,
        waveInProgress: session.waveInProgress,
        countdown: session.countdown,
        canStartWave: session.canStartWave,
        earlyStartBonus: session.earlyStartBonus,
        nextWaveTitle: session.waveInProgress
          ? `Next: ${session.nextWaveTitle}`
          : `Incoming: ${session.nextWaveTitle}`,
        nextWaveComposition: composition.length > 0
          ? composition.map((enemy) => `${enemy.name} ×${enemy.count}`).join(" · ")
          : "Final encounter underway",
        speed: session.speed,
        paused: session.phase === "paused",
      };
    },
    audio: () => session.audioSettings,
    buildOptions: (state) => session.towerOptions.map((tower) => {
      const level = tower.levels[0]!;
      const visual = getTowerVisual(tower.id);
      return {
        type: tower.id,
        name: tower.name,
        description: visual.description,
        role: `${visual.name} · ${visual.role}`,
        icon: visual.rune,
        hotkey: tower.hotkey,
        cost: level.cost,
        damage: level.damage,
        range: level.range,
        fireRate: level.fireRate,
        available: state.players.get("player")!.balance >= level.cost,
      };
    }),
    selectedTower: (state) => {
      const tower = state.towers.get(state.selectedTowerId ?? "");
      if (!tower || !isGameplayPhase(session.phase)) return null;
      const definition = session.towerOptions.find((option) => option.id === tower.type);
      if (!definition) return null;
      const current = definition.levels[tower.level]!;
      const next = definition.levels[tower.level + 1];
      const runtime = state.runtimeTowers.find((candidate) => candidate.id === tower.id);
      const money = state.players.get("player")!.balance;
      const visual = getTowerVisual(tower.type);
      return {
        id: tower.id,
        type: tower.type,
        name: visual.name,
        role: visual.role,
        description: visual.description,
        level: tower.level + 1,
        damage: current.damage,
        range: current.range,
        fireRate: current.fireRate,
        effectiveDamage: runtime?.effectiveDamage ?? current.damage,
        effectiveFireRate: runtime?.effectiveFireRate ?? current.fireRate,
        auraBuffed: runtime?.auraBuffed ?? false,
        targeting: tower.targeting,
        upgradeCost: next?.cost ?? null,
        upgradeAffordable: next ? money >= next.cost : false,
        upgradeDelta: next ? {
          damage: next.damage - current.damage,
          range: next.range - current.range,
          fireRate: next.fireRate - current.fireRate,
        } : null,
        sellValue: current.sellValue,
      };
    },
    enemyTooltip: () => {
      const enemy = session.selectedEnemy();
      if (!enemy || !isGameplayPhase(session.phase)) return null;
      const activeEffects: string[] = enemy.statusEffects.map((effect) => {
        if (effect.type === "slow") return `Slowed ${Math.ceil(effect.remaining)}s`;
        return `${effect.type} ${Math.ceil(effect.remaining)}s`;
      });
      if (enemy.regeneration > 0) activeEffects.push(`Regenerating ${enemy.regeneration}/s`);
      if (enemy.shield > 0) {
        activeEffects.push(`Shield ${Math.ceil(enemy.shield)}/${enemy.maxShield}`);
      }
      if (enemy.boss) activeEffects.push(`Boss phase ${enemy.bossPhase}`);
      return {
        name: enemy.name,
        type: enemy.type,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        reward: enemy.reward,
        baseDamage: enemy.baseDamage,
        armorPercent: Math.round(enemy.armor * 100),
        effects: activeEffects.join(", ") || "None",
      };
    },
    hero: (state) => {
      const hero = state.hero;
      if (!hero || !isGameplayPhase(session.phase)) return null;
      const target = state.enemies.find((enemy) => enemy.id === hero.targetId);
      return {
        id: hero.id,
        name: hero.name,
        level: hero.level,
        maximumLevel: hero.maximumLevel,
        xp: hero.xp,
        xpToNextLevel: hero.xpToNextLevel,
        damage: hero.damage,
        range: hero.range,
        fireRate: hero.fireRate,
        speed: hero.speed,
        target: target?.name ?? null,
        skillPoints: hero.skillPoints,
        auraRadius: hero.auraRadius,
        portraitUrl: eldrinVisual.portraitUrl,
        visualTier: visualTierForHeroLevel(hero.level),
        activeSkills: heroSkillIds
          .filter((skillId) => hero.skills[skillId] > 0)
          .map((skillId) => `${heroSkillDefinitions[skillId].name} ${hero.skills[skillId]}`),
        description: "A watchful ranger whose rune-bound arrows defend the Greenwood.",
      };
    },
    heroSkills: (state) => {
      const hero = state.hero;
      if (!hero || !isGameplayPhase(session.phase)) return null;
      return {
        skillPoints: hero.skillPoints,
        skills: heroSkillIds.map((skillId) => {
          const definition = heroSkillDefinitions[skillId];
          const level = hero.skills[skillId];
          const next = definition.levels[level];
          const blockedReason = hero.skillUpgradeError(skillId);
          return {
            id: skillId,
            name: definition.name,
            description: definition.description,
            level,
            maximumLevel: definition.levels.length,
            nextBonus: next?.bonusText ?? "Maximum level reached",
            upgradeAvailable: blockedReason === null,
            blockedReason,
          };
        }),
      };
    },
    overlay: (state): OverlayView => {
      if (session.phase === "menu") {
        return {
          kind: "menu",
          continueAvailable: session.savedGameAvailable,
          bestScore: session.bestScore,
        };
      }
      if (session.phase === "level-select") {
        return {
          kind: "level-select",
          options: session.levelOptions,
        };
      }
      if (session.phase === "difficulty") {
        return {
          kind: "difficulty",
          options: session.difficultyOptions.map((option) => ({
            id: option.id,
            name: option.name,
            description: option.description,
            startingGold: option.startingGold,
            lives: option.lives,
          })),
        };
      }
      if (session.phase === "tutorial") return { kind: "tutorial" };
      if (session.phase === "paused") return { kind: "paused" };
      if (session.phase === "victory") {
        return {
          kind: "victory",
          score: state.score,
          bestScore: session.bestScore,
          levelName: session.levelName,
          totalWaves: session.totalWaves,
          nextLevelId: session.nextLevelId,
        };
      }
      if (session.phase === "defeat") {
        return { kind: "defeat", wave: session.currentWaveNumber, score: state.score };
      }
      return { kind: "none" };
    },
    selectedBuildType: (state) => state.selectedBuildType,
    message: (state) => isGameplayPhase(session.phase) ? state.message : null,
  };
}
