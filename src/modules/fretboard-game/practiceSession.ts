import {
  getNoteAtPosition,
  getPositionId,
  getPositionsInKey,
  getSolfeggioInKey,
  isGKeyFocusNote,
} from '../../lib/theory';
import type { FretPosition } from '../../types/theory';
import type { AnswerRecord, MvpPracticeConfig, MvpQuestion, MvpQuestionType, PracticeSummary } from './types';

export const DEFAULT_MVP_CONFIG: MvpPracticeConfig = {
  key: 'G major',
  fretRange: [0, 5],
  stringRange: [1, 6],
  questionCount: 20,
  questionTypeWeights: {
    'board-to-note': 0.3,
    'board-to-solfeggio': 0.25,
    'tab-to-note': 0.2,
    'tab-to-solfeggio': 0.15,
    'note-to-solfeggio': 0.1,
  },
};

const QUESTION_PROMPTS: Record<MvpQuestionType, string> = {
  'board-to-note': '指板上高亮的位置是什么音名？',
  'board-to-solfeggio': '在当前调里，指板上高亮的位置唱什么？',
  'tab-to-note': '六线谱上的这个位置是什么音名？',
  'tab-to-solfeggio': '在当前调里，六线谱上的这个位置唱什么？',
  'note-to-solfeggio': '在当前调里，这个音名唱什么？',
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

export function createQuestion(config: MvpPracticeConfig, index: number): MvpQuestion {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;
  const positions = getPositionsInKey(
    config.key,
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  );
  const focusPositions = positions.filter((position) => isGKeyFocusNote(position, config.key));
  const position = pickPosition(positions, index, focusPositions);
  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, config.key);
  const type = pickByWeight(config.questionTypeWeights, index);

  if (solfeggio === null) {
    throw new Error(`位置 ${getPositionId(position)} 不属于 ${config.key}`);
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
    prompt: QUESTION_PROMPTS[type],
    answerKind,
    sourceMedium,
    isFocusNote: isGKeyFocusNote(position, config.key),
  };
}

export function createQuestionSet(config: MvpPracticeConfig): MvpQuestion[] {
  return Array.from({ length: config.questionCount }, (_, index) => createQuestion(config, index));
}

export function isSlowAnswer(question: MvpQuestion, responseMs: number): boolean {
  const thresholdMs = question.answerKind === 'note' ? 4000 : 5000;
  return responseMs > thresholdMs;
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
