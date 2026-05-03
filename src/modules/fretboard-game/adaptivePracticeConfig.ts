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
   * 音名定位调度器 V2。
   *
   * 规则文档：docs/product/note-to-position-scheduler-v2-spec.md
   */
  noteToPositionScheduler: {
    staticWeight: {
      baseWeight: 1,
      maxWeaknessBonus: 3,
      maxFinalWeight: 4,
    },
    dynamicWeight: {
      gainPerQuestion: 1,
      maxBonus: 4,
      resetScope: 'same-note',
    },
    masteredRetest: {
      minRate: 0.15,
      maxRate: 0.75,
      fastStreakTarget: 5,
      lowConfidenceAttemptCount: 3,
    },
  },
  /**
   * 音名唱名调度器。
   *
   * 统计粒度是 key + noteName -> solfeggio，不再绑定具体指板位置。
   * 动态权重用于一轮内覆盖不同音名，出过的音名会清空本轮覆盖压力。
   */
  noteToSolfeggioScheduler: {
    staticWeight: {
      baseWeight: 1,
      maxWeaknessBonus: 3,
      maxFinalWeight: 4,
    },
    dynamicWeight: {
      gainPerQuestion: 1,
      maxBonus: 4,
      resetScope: 'same-note',
    },
  },
  /**
   * 弱点地图显示层。
   *
   * 地图颜色不直接使用永久累计的 wrongCount / slowCount，
   * 而是按近期事件计算压力分，再用相对分位决定红黄位置。
   */
  weaknessMapDisplay: {
    recentEventLimit: 50,
    fullWeightEventCount: 20,
    midWeight: 0.5,
    pressureScore: {
      wrong: 3,
      missedPosition: 3,
      extraPosition: 3,
      slowCorrect: 1,
      fastCorrect: -1,
    },
    statusRatio: {
      dangerTopRatio: 0.2,
      slowNextRatio: 0.3,
    },
    mastered: {
      maxPressure: 0,
      minFastCorrectStreak: 2,
    },
  },
} as const;

export type AdaptivePracticeConfig = typeof ADAPTIVE_PRACTICE_CONFIG;
