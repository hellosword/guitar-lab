import {
  getNoteAtPosition,
  getKeySolfeggioMap,
  getPositionId,
  getPositionsInRange,
  getPositionsInKey,
  getSolfeggioInKey,
  isGKeyFocusNote,
  isSamePosition,
} from '../../lib/theory';
import type { FretPosition, PracticeKey, SharpNoteName } from '../../types/theory';
import {
  createPracticeItemKey,
  getPracticeItemWeight,
  type PracticeMemoryDocumentV1,
} from './practiceMemory';
import type {
  AnswerRecord,
  MvpPracticeConfig,
  MvpQuestion,
  MvpQuestionType,
  PracticeAnswerValue,
  PracticeModeId,
  PracticeSummary,
} from './types';

export interface PracticeModeOption {
  id: PracticeModeId;
  label: string;
}

export const PRACTICE_MODE_OPTIONS: PracticeModeOption[] = [
  { id: 'mixed', label: '综合练习' },
  { id: 'board-to-note', label: '指板音名' },
  { id: 'board-to-solfeggio', label: '指板唱名' },
  { id: 'tab-to-note', label: '六线谱音名' },
  { id: 'tab-to-solfeggio', label: '六线谱唱名' },
  { id: 'note-to-solfeggio', label: '音名唱名' },
  { id: 'note-to-positions', label: '音名定位' },
];

export function getDefaultFretRangeForKey(key: PracticeKey): [number, number] {
  return key === 'C major' ? [0, 3] : [0, 4];
}

export const DEFAULT_MVP_CONFIG: MvpPracticeConfig = {
  modeId: 'mixed',
  key: 'G major',
  fretRange: getDefaultFretRangeForKey('G major'),
  stringRange: [1, 6],
  questionCount: 20,
  questionTypeWeights: {
    'board-to-note': 0.25,
    'board-to-solfeggio': 0.22,
    'tab-to-note': 0.18,
    'tab-to-solfeggio': 0.13,
    'note-to-solfeggio': 0.1,
    'note-to-positions': 0.12,
  },
};

const QUESTION_PROMPTS: Record<MvpQuestionType, string> = {
  'board-to-note': '指板上高亮的位置是什么音名？',
  'board-to-solfeggio': '在当前调里，指板上高亮的位置唱什么？',
  'tab-to-note': '六线谱上的这个位置是什么音名？',
  'tab-to-solfeggio': '在当前调里，六线谱上的这个位置唱什么？',
  'note-to-solfeggio': '在当前调里，这个音名唱什么？',
  'note-to-positions': '在空指板上找出所有这个音名的位置',
};

function pickByWeight(weights: Record<MvpQuestionType, number>, index: number): MvpQuestionType {
  const entries = Object.entries(weights) as Array<[MvpQuestionType, number]>;
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const marker = ((index * 37) % 100) / 100 * totalWeight;
  let cursor = 0;

  for (const [type, weight] of entries) {
    cursor += weight;
    if (marker <= cursor) {
      return type;
    }
  }

  return entries[0][0];
}

function pickPosition(positions: FretPosition[], index: number, focusPositions: FretPosition[]): FretPosition {
  const shouldUseFocus = focusPositions.length > 0 && index % 5 === 2;
  const source = shouldUseFocus ? focusPositions : positions;
  return source[(index * 11 + 3) % source.length];
}

function pickByDeterministicWeight<T>(
  items: T[],
  getWeight: (item: T) => number,
  index: number,
  salt: number,
): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  const marker = ((index * salt + 17) % 100) / 100 * totalWeight;
  let cursor = 0;

  for (const item of items) {
    cursor += getWeight(item);
    if (marker <= cursor) {
      return item;
    }
  }

  return items[0];
}

function getPositionWeight(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  type: MvpQuestionType,
  position: FretPosition,
): number {
  if (memory === undefined) {
    return 1;
  }

  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, key);

  if (solfeggio === null) {
    return 1;
  }

  const mappingKind = type.endsWith('note') ? 'position-to-note' : 'position-to-solfeggio';
  return getPracticeItemWeight(
    memory,
    createPracticeItemKey(mappingKind, key, noteName, solfeggio, position),
  );
}

function pickWeightedPosition(
  positions: FretPosition[],
  index: number,
  focusPositions: FretPosition[],
  config: MvpPracticeConfig,
  type: MvpQuestionType,
  memory?: PracticeMemoryDocumentV1,
): FretPosition {
  if (memory === undefined || Object.keys(memory.masteryMap).length === 0) {
    return pickPosition(positions, index, focusPositions);
  }

  const shouldUseFocus = focusPositions.length > 0 && index % 5 === 2;
  const source = shouldUseFocus ? focusPositions : positions;

  return pickByDeterministicWeight(
    source,
    (position) => getPositionWeight(memory, config.key, type, position),
    index,
    29,
  );
}

function resolveQuestionType(config: MvpPracticeConfig, index: number): MvpQuestionType {
  return config.modeId === 'mixed' ? pickByWeight(config.questionTypeWeights, index) : config.modeId;
}

function pickTargetNote(
  key: PracticeKey,
  index: number,
  config: MvpPracticeConfig,
  memory?: PracticeMemoryDocumentV1,
): SharpNoteName {
  const scaleNotes = getKeySolfeggioMap(key).map((item) => item.noteName);

  if (memory === undefined || Object.keys(memory.masteryMap).length === 0) {
    return scaleNotes[(index * 5 + 2) % scaleNotes.length];
  }

  return pickByDeterministicWeight(
    scaleNotes,
    (noteName) => {
      const solfeggio = getSolfeggioInKey(noteName, key);
      const notePositions = getPositionsForNote(config, noteName);

      if (solfeggio === null || notePositions.length === 0) {
        return 1;
      }

      const totalWeight = notePositions.reduce((sum, position) => (
        sum + getPracticeItemWeight(
          memory,
          createPracticeItemKey('note-to-position', key, noteName, solfeggio, position),
        )
      ), 0);

      return Math.max(1, totalWeight / notePositions.length);
    },
    index,
    41,
  );
}

function getPositionsForNote(config: MvpPracticeConfig, noteName: SharpNoteName): FretPosition[] {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;

  return getPositionsInRange(
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  ).filter((position) => getNoteAtPosition(position) === noteName);
}

export function createQuestion(config: MvpPracticeConfig, index: number, memory?: PracticeMemoryDocumentV1): MvpQuestion {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;
  const positions = getPositionsInKey(
    config.key,
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  );
  const focusPositions = positions.filter((position) => isGKeyFocusNote(position, config.key));
  const type = resolveQuestionType(config, index);
  const position = pickWeightedPosition(positions, index, focusPositions, config, type, memory);
  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, config.key);

  if (solfeggio === null) {
    throw new Error(`位置 ${getPositionId(position)} 不属于 ${config.key}`);
  }

  if (type === 'note-to-positions') {
    const targetNoteName = pickTargetNote(config.key, index, config, memory);
    const targetSolfeggio = getSolfeggioInKey(targetNoteName, config.key);
    const targetPositions = getPositionsForNote(config, targetNoteName);

    if (targetSolfeggio === null || targetPositions.length === 0) {
      throw new Error(`${config.key} 的 ${targetNoteName} 在当前范围内没有可用位置`);
    }

    return {
      id: `${type}-${config.key}-${targetNoteName}-${index}`,
      type,
      key: config.key,
      position: targetPositions[0],
      noteName: targetNoteName,
      solfeggio: targetSolfeggio,
      answer: targetPositions,
      targetPositions,
      prompt: QUESTION_PROMPTS[type],
      answerKind: 'positions',
      sourceMedium: 'note',
      isFocusNote: config.key === 'G major' && targetNoteName === 'F#',
    };
  }

  const answerKind = type.endsWith('note') ? 'note' : 'solfeggio';
  const sourceMedium = type.startsWith('board') ? 'board' : type.startsWith('tab') ? 'tab' : 'note';

  return {
    id: `${type}-${config.key}-${getPositionId(position)}-${index}`,
    type,
    key: config.key,
    position,
    noteName,
    solfeggio,
    answer: answerKind === 'note' ? noteName : solfeggio,
    targetPositions: [position],
    prompt: QUESTION_PROMPTS[type],
    answerKind,
    sourceMedium,
    isFocusNote: isGKeyFocusNote(position, config.key),
  };
}

export function createQuestionSet(config: MvpPracticeConfig, memory?: PracticeMemoryDocumentV1): MvpQuestion[] {
  return Array.from({ length: config.questionCount }, (_, index) => createQuestion(config, index, memory));
}

export function isSlowAnswer(question: MvpQuestion, responseMs: number): boolean {
  const thresholdMs = question.answerKind === 'note' ? 4000 : question.answerKind === 'positions' ? 9000 : 5000;
  return responseMs > thresholdMs;
}

export function getMissingPositions(expected: FretPosition[], actual: FretPosition[]): FretPosition[] {
  return expected.filter((expectedPosition) => (
    !actual.some((actualPosition) => isSamePosition(actualPosition, expectedPosition))
  ));
}

export function getExtraPositions(expected: FretPosition[], actual: FretPosition[]): FretPosition[] {
  return actual.filter((actualPosition) => (
    !expected.some((expectedPosition) => isSamePosition(actualPosition, expectedPosition))
  ));
}

export function isAnswerCorrect(question: MvpQuestion, userAnswer: PracticeAnswerValue): boolean {
  if (question.answerKind !== 'positions') {
    return userAnswer === question.answer;
  }

  if (!Array.isArray(userAnswer) || !Array.isArray(question.answer)) {
    return false;
  }

  return getMissingPositions(question.answer, userAnswer).length === 0
    && getExtraPositions(question.answer, userAnswer).length === 0;
}

export function createPracticeSummary(records: AnswerRecord[]): PracticeSummary {
  const total = records.length;
  const correct = records.filter((record) => record.isCorrect).length;
  const focusRecords = records.filter((record) => record.question.isFocusNote);
  const focusCorrect = focusRecords.filter((record) => record.isCorrect).length;
  const averageResponseMs = total === 0
    ? 0
    : Math.round(records.reduce((sum, record) => sum + record.responseMs, 0) / total);

  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
    averageResponseMs,
    focusTotal: focusRecords.length,
    focusCorrect,
    focusAccuracy: focusRecords.length === 0 ? null : focusCorrect / focusRecords.length,
    slowCount: records.filter((record) => record.isSlow).length,
    weakest: [...records]
      .filter((record) => !record.isCorrect || record.isSlow)
      .sort((a, b) => b.responseMs - a.responseMs)
      .slice(0, 3),
  };
}
