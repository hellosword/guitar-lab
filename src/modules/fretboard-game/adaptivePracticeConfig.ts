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
} as const;

export type AdaptivePracticeConfig = typeof ADAPTIVE_PRACTICE_CONFIG;
