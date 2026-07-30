import {
  type CampaignRuntime,
  type CampaignSession,
} from "../game/CampaignSession.js";
import type {
  OverlayView,
  UiSelectors,
} from "../ui/index.js";

const icons: Readonly<Record<string, string>> = {
  basic: "◆",
  rapid: "⚡",
  frost: "❄",
  cannon: "●",
  sniper: "⌖",
};

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
      return {
        type: tower.id,
        name: tower.name,
        description: tower.description,
        icon: icons[tower.id] ?? "◆",
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
      const money = state.players.get("player")!.balance;
      return {
        id: tower.id,
        name: definition.name,
        level: tower.level + 1,
        damage: current.damage,
        range: current.range,
        fireRate: current.fireRate,
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
    overlay: (state): OverlayView => {
      if (session.phase === "menu") {
        return {
          kind: "menu",
          continueAvailable: session.savedGameAvailable,
          bestScore: session.bestScore,
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
        return { kind: "victory", score: state.score, bestScore: session.bestScore };
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
