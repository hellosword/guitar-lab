export const ADAPTIVE_PRACTICE_CONFIG = {
  schemaVersion: 1,
  recentWindowSize: 50,
  maxRecentEvents: 300,
  minSamplesForRelativeSlow: 10,
  slowPercentile: 0.7,
  slowMedianMultiplier: 1.35,
  maxValidResponseMs: 60_000,
  weaknessScore: {
    wrong: 3,
    missedPosition: 3,
    extraPosition: 3,
    slow: 1,
    fastCorrect: -1,
    repeatedFastCorrectBonus: -1,
  },
  weighting: {
    baseWeight: 1,
    maxWeaknessBonus: 3,
    maxFinalWeight: 4,
  },
  /**
   * 音名定位题的弱位置强化节奏。
   *
   * 策略：
   * - 先把弱位置汇总到题面音名，再从音名层面出题，避免多个 E 弱位置连续生成多道 E 题。
   * - 保留普通覆盖题，让练习不退化成“只刷弱点”。
   * - 最近出现过的音名进入短冷却期，优先换一个音名。
   *
   * 当前 cycleSize=2、broadCoverageRemainder=1 表示：
   * - index % 2 === 0：尝试弱位置强化。
   * - index % 2 === 1：普通覆盖。
   */
  noteToPositionTargeting: {
    weakFocusCycleSize: 2,
    broadCoverageRemainder: 1,
    noteCooldownCount: 2,
  },
} as const;

export type AdaptivePracticeConfig = typeof ADAPTIVE_PRACTICE_CONFIG;
