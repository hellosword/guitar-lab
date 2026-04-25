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

/** 音名 */
export type NoteName = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

/** 唱名（首调唱名法） */
export type Solfeggio = 'Do' | 'Re' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

/** 调式 */
export type Key = string;

/** 音程类型 */
export type IntervalType = string;

/** 和弦类型 */
export type ChordType = string;

/** 和弦内音级数 */
export type Degree = 'root' | '3' | '5' | '7' | '9' | '11' | '13';
