import {
  getNoteAtPosition,
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
  type MasteryEntryV1,
  type PracticeMemoryDocumentV1,
} from './practiceMemory';
import { ADAPTIVE_PRACTICE_CONFIG } from './adaptivePracticeConfig';
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

function getNoteToPositionWeight(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  position: FretPosition,
): number {
  const schedulerConfig = ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.staticWeight;
  const entry = getNoteToPositionEntry(memory, key, position);
  const weaknessScore = entry?.weaknessScore ?? 0;
  const weaknessBonus = Math.min(weaknessScore, schedulerConfig.maxWeaknessBonus);

  return Math.min(
    schedulerConfig.baseWeight + weaknessBonus,
    schedulerConfig.maxFinalWeight,
  );
}

function getNoteToPositionEntry(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  position: FretPosition,
): MasteryEntryV1 | undefined {
  if (memory === undefined) {
    return undefined;
  }

  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, key);

  return solfeggio === null
    ? undefined
    : memory.masteryMap[createPracticeItemKey('note-to-position', key, noteName, solfeggio, position)];
}

interface NoteToPositionCandidate {
  noteName: SharpNoteName;
  position: FretPosition;
  weight: number;
}

interface NoteToPositionSchedulerState {
  dynamicWeightByPositionId: Record<string, number>;
}

function createNoteToPositionSchedulerState(): NoteToPositionSchedulerState {
  return {
    dynamicWeightByPositionId: {},
  };
}

function hashText(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getDeterministicUnit(seed: string): number {
  return hashText(seed) / 0xffffffff;
}

function getCandidatePositions(config: MvpPracticeConfig): FretPosition[] {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;

  return getPositionsInKey(
    config.key,
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  );
}

function pickScheduledNoteToPositionTarget(
  config: MvpPracticeConfig,
  index: number,
  state: NoteToPositionSchedulerState,
  memory?: PracticeMemoryDocumentV1,
): NoteToPositionCandidate {
  const candidates = getCandidatePositions(config).map((position) => {
    const positionId = getPositionId(position);
    const staticWeight = getNoteToPositionWeight(memory, config.key, position);
    const dynamicWeight = state.dynamicWeightByPositionId[positionId] ?? 0;

    return {
      noteName: getNoteAtPosition(position),
      position,
      weight: staticWeight + dynamicWeight,
    };
  });

  return pickByDeterministicWeight(candidates, (candidate) => candidate.weight, index, 53);
}

function updateNoteToPositionDynamicWeights(
  config: MvpPracticeConfig,
  targetNoteName: SharpNoteName,
  state: NoteToPositionSchedulerState,
): void {
  const dynamicConfig = ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.dynamicWeight;

  for (const position of getCandidatePositions(config)) {
    const positionId = getPositionId(position);

    if (getNoteAtPosition(position) === targetNoteName) {
      state.dynamicWeightByPositionId[positionId] = 0;
      continue;
    }

    state.dynamicWeightByPositionId[positionId] = Math.min(
      (state.dynamicWeightByPositionId[positionId] ?? 0) + dynamicConfig.gainPerQuestion,
      dynamicConfig.maxBonus,
    );
  }
}

function isMasteredNoteToPositionEntry(entry: MasteryEntryV1 | undefined): entry is MasteryEntryV1 {
  return entry !== undefined
    && entry.weaknessScore <= 0
    && entry.fastCorrectStreak >= 2;
}

function getMasteredRetestRate(entry: MasteryEntryV1): number {
  const retestConfig = ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.masteredRetest;
  const confidencePressure = Math.max(
    0,
    (retestConfig.lowConfidenceAttemptCount - entry.attempts) / retestConfig.lowConfidenceAttemptCount,
  );
  const streakRelief = Math.min(entry.fastCorrectStreak / retestConfig.fastStreakTarget, 1);
  const instabilityPressure = Math.min(
    1,
    (entry.wrongCount + entry.slowCount + Math.max(entry.weaknessScore, 0)) / 4,
  );
  const pressure = Math.min(
    1,
    confidencePressure * 0.45
      + (1 - streakRelief) * 0.35
      + instabilityPressure * 0.2,
  );

  return retestConfig.minRate
    + (retestConfig.maxRate - retestConfig.minRate) * pressure;
}

function shouldRetestMasteredPosition(
  entry: MasteryEntryV1,
  questionSeed: string,
  position: FretPosition,
): boolean {
  return getDeterministicUnit(`${questionSeed}|${getPositionId(position)}`) < getMasteredRetestRate(entry);
}

function getAssistedPositionsForScheduledNote(
  config: MvpPracticeConfig,
  targetPositions: FretPosition[],
  focusPosition: FretPosition,
  index: number,
  memory?: PracticeMemoryDocumentV1,
): FretPosition[] {
  return targetPositions.filter((position) => {
    const entry = getNoteToPositionEntry(memory, config.key, position);

    return !isSamePosition(position, focusPosition)
      && isMasteredNoteToPositionEntry(entry)
      && !shouldRetestMasteredPosition(
        entry,
        `${config.key}|${getNoteAtPosition(focusPosition)}|${index}`,
        position,
      );
  });
}

function getPositionsForNote(config: MvpPracticeConfig, noteName: SharpNoteName): FretPosition[] {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;

  return getPositionsInRange(
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  ).filter((position) => getNoteAtPosition(position) === noteName);
}

export function createQuestion(
  config: MvpPracticeConfig,
  index: number,
  memory?: PracticeMemoryDocumentV1,
  noteToPositionSchedulerState = createNoteToPositionSchedulerState(),
): MvpQuestion {
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
    const target = pickScheduledNoteToPositionTarget(config, index, noteToPositionSchedulerState, memory);
    const targetNoteName = target.noteName;
    const targetSolfeggio = getSolfeggioInKey(targetNoteName, config.key);
    const targetPositions = getPositionsForNote(config, targetNoteName);
    const assistedPositions = getAssistedPositionsForScheduledNote(
      config,
      targetPositions,
      target.position,
      index,
      memory,
    );

    if (targetSolfeggio === null || targetPositions.length === 0) {
      throw new Error(`${config.key} 的 ${targetNoteName} 在当前范围内没有可用位置`);
    }

    updateNoteToPositionDynamicWeights(config, targetNoteName, noteToPositionSchedulerState);

    return {
      id: `${type}-${config.key}-${targetNoteName}-${index}`,
      type,
      key: config.key,
      position: target.position,
      noteName: targetNoteName,
      solfeggio: targetSolfeggio,
      answer: targetPositions,
      targetPositions,
      assistedPositions,
      prompt: QUESTION_PROMPTS[type],
      answerKind: 'positions',
      sourceMedium: 'note',
      isFocusNote: config.key === 'G major' && targetNoteName === 'F#',
      isWeakFocus: getNoteToPositionWeight(memory, config.key, target.position) > ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.staticWeight.baseWeight,
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
  const questions: MvpQuestion[] = [];
  const noteToPositionSchedulerState = createNoteToPositionSchedulerState();

  for (let index = 0; index < config.questionCount; index += 1) {
    questions.push(createQuestion(config, index, memory, noteToPositionSchedulerState));
  }

  return questions;
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
