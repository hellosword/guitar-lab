/**
 * 乐理相关类型定义
 */

/** 吉他弦编号（1~6弦，1弦为最细的高音弦） */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

/** 品格位置 */
export interface FretPosition {
  /** 弦编号 */
  string: GuitarString;
  /** 品格号（0 表示空弦） */
  fret: number;
}

/** MVP 阶段统一使用升号记法，避免等音干扰 */
export type SharpNoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/** 音名 */
export type NoteName = SharpNoteName | 'Db' | 'Eb' | 'Gb' | 'Ab' | 'Bb';

/** 唱名（首调唱名法） */
export type Solfeggio = 'Do' | 'Re' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

/** MVP 支持的调性 */
export type PracticeKey = 'C major' | 'G major';

/** 调式 */
export type Key = PracticeKey | string;

/** 音程类型 */
export type IntervalType = string;

/** 和弦类型 */
export type ChordType = string;

/** 和弦内音级数 */
export type Degree = 'root' | '3' | '5' | '7' | '9' | '11' | '13';
