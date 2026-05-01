/**
 * Tonal.js 封装层
 * 提供项目专用的乐理计算接口，隔离底层库依赖
 */

import type { FretPosition, GuitarString, PracticeKey, SharpNoteName, Solfeggio } from '../types/theory';

const SHARP_NOTES: SharpNoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const OPEN_STRING_MIDI: Record<GuitarString, number> = {
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

const KEY_SCALE_NOTES: Record<PracticeKey, SharpNoteName[]> = {
  'C major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
};

const SOLFEGGIO_BY_INDEX: Solfeggio[] = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export const MVP_KEYS: PracticeKey[] = ['G major', 'C major'];

export interface FretRange {
  min: number;
  max: number;
}

export interface StringRange {
  min: GuitarString;
  max: GuitarString;
}

/** 判断两个位置是否完全相同 */
export function isSamePosition(a: FretPosition, b: FretPosition): boolean {
  return a.string === b.string && a.fret === b.fret;
}

/** 生成稳定的位置 ID，用于 React key、统计与错题队列 */
export function getPositionId(position: FretPosition): string {
  return `${position.string}-${position.fret}`;
}

/** 将标准调弦下的指板位置转换为升号音名 */
export function getNoteAtPosition(position: FretPosition): SharpNoteName {
  const pitchClass = getMidiAtPosition(position) % SHARP_NOTES.length;
  return SHARP_NOTES[pitchClass];
}

/** 获取标准调弦下指定位置的 MIDI 音高 */
export function getMidiAtPosition(position: FretPosition): number {
  const openMidi = OPEN_STRING_MIDI[position.string];
  return openMidi + position.fret;
}

/** 获取标准调弦下指定位置的频率 */
export function getFrequencyAtPosition(position: FretPosition): number {
  const midi = getMidiAtPosition(position);
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 获取指定调内的首调唱名 */
export function getSolfeggioInKey(noteName: SharpNoteName, key: PracticeKey): Solfeggio | null {
  const scaleNotes = KEY_SCALE_NOTES[key];
  const scaleIndex = scaleNotes.indexOf(noteName);

  if (scaleIndex < 0) {
    return null;
  }

  return SOLFEGGIO_BY_INDEX[scaleIndex];
}

/** 判断音名是否属于指定大调音阶 */
export function isNoteInKey(noteName: SharpNoteName, key: PracticeKey): boolean {
  return KEY_SCALE_NOTES[key].includes(noteName);
}

/** 获取范围内所有物理位置 */
export function getPositionsInRange(fretRange: FretRange, stringRange: StringRange): FretPosition[] {
  const positions: FretPosition[] = [];

  for (let string = stringRange.min; string <= stringRange.max; string += 1) {
    for (let fret = fretRange.min; fret <= fretRange.max; fret += 1) {
      positions.push({ string: string as GuitarString, fret });
    }
  }

  return positions;
}

/** 获取指定调性过滤后的有效位置池 */
export function getPositionsInKey(key: PracticeKey, fretRange: FretRange, stringRange: StringRange): FretPosition[] {
  return getPositionsInRange(fretRange, stringRange).filter((position) => isNoteInKey(getNoteAtPosition(position), key));
}

/** 格式化位置文本 */
export function formatPosition(position: FretPosition): string {
  return `${position.string} 弦 ${position.fret} 品`;
}

/** 判断是否为 G 大调关键音 F# */
export function isGKeyFocusNote(position: FretPosition, key: PracticeKey): boolean {
  return key === 'G major' && getNoteAtPosition(position) === 'F#';
}
