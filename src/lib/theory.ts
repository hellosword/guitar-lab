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
export const ALL_SHARP_NOTES: SharpNoteName[] = SHARP_NOTES;
export const SOLFEGGIOS: Solfeggio[] = SOLFEGGIO_BY_INDEX;

export interface NoteColor {
  fill: string;
  stroke: string;
  text: string;
  softFill: string;
}

export const NOTE_COLORS: Record<SharpNoteName, NoteColor> = {
  C: { fill: '#c62828', stroke: '#ff8a80', text: '#ffffff', softFill: '#8e1b1b' },
  'C#': { fill: '#e85d3f', stroke: '#ffab91', text: '#ffffff', softFill: '#a13a2a' },
  D: { fill: '#d96b1c', stroke: '#ffb86b', text: '#ffffff', softFill: '#944915' },
  'D#': { fill: '#c78a00', stroke: '#ffd166', text: '#ffffff', softFill: '#8a6100' },
  E: { fill: '#9f7a00', stroke: '#f6d365', text: '#ffffff', softFill: '#6f5600' },
  F: { fill: '#2f8f3a', stroke: '#8ee99a', text: '#ffffff', softFill: '#22692b' },
  'F#': { fill: '#1fa187', stroke: '#83ead7', text: '#ffffff', softFill: '#15725f' },
  G: { fill: '#0b7f86', stroke: '#7dd3fc', text: '#ffffff', softFill: '#075c61' },
  'G#': { fill: '#2b70c9', stroke: '#93c5fd', text: '#ffffff', softFill: '#1e4f90' },
  A: { fill: '#3949ab', stroke: '#a5b4fc', text: '#ffffff', softFill: '#29357d' },
  'A#': { fill: '#7b3fb8', stroke: '#d8b4fe', text: '#ffffff', softFill: '#582d84' },
  B: { fill: '#8e24aa', stroke: '#f0abfc', text: '#ffffff', softFill: '#671a7b' },
};

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

/** 获取指定大调的音名到首调唱名映射 */
export function getKeySolfeggioMap(key: PracticeKey): Array<{ noteName: SharpNoteName; solfeggio: Solfeggio }> {
  return KEY_SCALE_NOTES[key].map((noteName, index) => ({
    noteName,
    solfeggio: SOLFEGGIO_BY_INDEX[index],
  }));
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
