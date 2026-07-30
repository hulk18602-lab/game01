/** Economy rewards kept separate from waves and application orchestration. */
export const rewards = Object.freeze({
  waveCompletionBase: 28,
  waveCompletionStep: 7,
  earlyStartPerSecond: 2,
  maximumEarlyStartBonus: 32,
  flawlessWaveBonus: 12,
  victoryBonus: 500,
});

export function waveCompletionReward(waveNumber, flawless = false) {
  return rewards.waveCompletionBase
    + rewards.waveCompletionStep * waveNumber
    + (flawless ? rewards.flawlessWaveBonus : 0);
}

export function earlyStartReward(secondsRemaining) {
  return Math.min(
    rewards.maximumEarlyStartBonus,
    Math.max(0, Math.ceil(secondsRemaining) * rewards.earlyStartPerSecond),
  );
}

export default rewards;
