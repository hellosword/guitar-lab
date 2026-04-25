/**
 * 音频相关类型定义
 */

/** 节拍器音色类型 */
export type MetronomeSound = 'click' | 'woodblock' | 'hihat' | 'drum';

/** 节奏型配置 */
export interface RhythmPattern {
  name: string;
  timeSignature: [number, number];
  bpm: number;
  beats: {
    subdivision: string[];
    accent: boolean;
    velocity: number;
  }[];
}

/** 打分结果 */
export interface ScoringResult {
  totalBeats: number;
  hits: number;
  misses: number;
  earlyCount: number;
  lateCount: number;
  meanOffset: number;
  stdDev: number;
  score: number;
  feedback: string[];
}
