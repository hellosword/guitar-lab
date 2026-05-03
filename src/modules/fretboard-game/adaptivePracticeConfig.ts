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
   * 目前策略是“多数题从弱位置反推音名，少数题保留普通覆盖”。
   * 例如 cycleSize=5、broadCoverageRemainder=4 表示：
   * index % 5 === 4 的题不强行选择弱位置，用来保持普通覆盖面。
   */
  noteToPositionTargeting: {
    weakFocusCycleSize: 5,
    broadCoverageRemainder: 4,
  },
} as const;

export type AdaptivePracticeConfig = typeof ADAPTIVE_PRACTICE_CONFIG;
