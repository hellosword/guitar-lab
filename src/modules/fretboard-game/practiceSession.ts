import {
  getKeySolfeggioMap,
  getMidiAtPosition,
  getNoteAtPosition,
  getPositionId,
  getPositionsInRange,
  getPositionsInKey,
  getSolfeggioInKey,
  isGKeyFocusNote,
  isSamePosition,
} from '../../lib/theory';
import type { FretPosition, PracticeKey, SharpNoteName, Solfeggio } from '../../types/theory';
import {
  createPracticeItemKey,
  type MappingKind,
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
  PracticeGroupModeId,
  PracticeModeId,
  PracticeSummary,
} from './types';

export interface PracticeModeOption {
  id: PracticeModeId;
  label: string;
}

export const PRACTICE_MODE_OPTIONS: PracticeModeOption[] = [
  { id: 'mixed', label: '综合练习' },
  { id: 'position-note-mixed', label: '位置音名' },
  { id: 'position-solfeggio-mixed', label: '位置唱名' },
  { id: 'note-solfeggio-mixed', label: '音名唱名' },
  { id: 'tab-reading-mixed', label: '六线谱识读' },
  { id: 'board-to-note', label: '指板音名' },
  { id: 'board-to-solfeggio', label: '指板唱名' },
  { id: 'tab-to-note', label: '六线谱音名' },
  { id: 'tab-to-solfeggio', label: '六线谱唱名' },
  { id: 'note-to-solfeggio', label: '音名唱名' },
  { id: 'solfeggio-to-note', label: '唱名音名' },
  { id: 'note-to-positions', label: '音名定位' },
  { id: 'solfeggio-to-positions', label: '唱名定位' },
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
    'board-to-note': 0.18,
    'board-to-solfeggio': 0.16,
    'tab-to-note': 0.13,
    'tab-to-solfeggio': 0.11,
    'note-to-solfeggio': 0.1,
    'solfeggio-to-note': 0.1,
    'note-to-positions': 0.12,
    'solfeggio-to-positions': 0.1,
  },
};

const QUESTION_PROMPTS: Record<MvpQuestionType, string> = {
  'board-to-note': '指板上高亮的位置是什么音名？',
  'board-to-solfeggio': '在当前调里，指板上高亮的位置唱什么？',
  'tab-to-note': '六线谱上的这个位置是什么音名？',
  'tab-to-solfeggio': '在当前调里，六线谱上的这个位置唱什么？',
  'note-to-solfeggio': '在当前调里，这个音名唱什么？',
  'solfeggio-to-note': '在当前调里，这个唱名对应什么音名？',
  'note-to-positions': '在空指板上找出所有这个音名的位置',
  'solfeggio-to-positions': '在空指板上找出所有这个唱名的位置',
};

const PRACTICE_GROUP_TYPE_WEIGHTS: Record<PracticeGroupModeId, Record<MvpQuestionType, number>> = {
  'position-note-mixed': {
    'board-to-note': 1,
    'board-to-solfeggio': 0,
    'tab-to-note': 0,
    'tab-to-solfeggio': 0,
    'note-to-solfeggio': 0,
    'solfeggio-to-note': 0,
    'note-to-positions': 1,
    'solfeggio-to-positions': 0,
  },
  'position-solfeggio-mixed': {
    'board-to-note': 0,
    'board-to-solfeggio': 1,
    'tab-to-note': 0,
    'tab-to-solfeggio': 0,
    'note-to-solfeggio': 0,
    'solfeggio-to-note': 0,
    'note-to-positions': 0,
    'solfeggio-to-positions': 1,
  },
  'note-solfeggio-mixed': {
    'board-to-note': 0,
    'board-to-solfeggio': 0,
    'tab-to-note': 0,
    'tab-to-solfeggio': 0,
    'note-to-solfeggio': 1,
    'solfeggio-to-note': 1,
    'note-to-positions': 0,
    'solfeggio-to-positions': 0,
  },
  'tab-reading-mixed': {
    'board-to-note': 0,
    'board-to-solfeggio': 0,
    'tab-to-note': 1,
    'tab-to-solfeggio': 1,
    'note-to-solfeggio': 0,
    'solfeggio-to-note': 0,
    'note-to-positions': 0,
    'solfeggio-to-positions': 0,
  },
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

function pickPosition(positions: FretPosition[], index: number): FretPosition {
  return positions[(index * 11 + 3) % positions.length];
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

function getPositionInputMappingKind(type: MvpQuestionType): Extract<MappingKind, 'position-to-note' | 'position-to-solfeggio'> | null {
  if (type === 'board-to-note' || type === 'tab-to-note') {
    return 'position-to-note';
  }

  if (type === 'board-to-solfeggio' || type === 'tab-to-solfeggio') {
    return 'position-to-solfeggio';
  }

  return null;
}

function getPositionInputItemKey(
  key: PracticeKey,
  type: MvpQuestionType,
  position: FretPosition,
): string | null {
  const mappingKind = getPositionInputMappingKind(type);

  if (mappingKind === null) {
    return null;
  }

  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, key);

  return solfeggio === null ? null : createPracticeItemKey(mappingKind, key, noteName, solfeggio, position);
}

function getPositionInputMappingKey(key: PracticeKey, type: MvpQuestionType): string | null {
  const mappingKind = getPositionInputMappingKind(type);
  return mappingKind === null ? null : `${mappingKind}|${key}`;
}

function getPositionInputNoteKey(key: PracticeKey, type: MvpQuestionType, noteName: SharpNoteName): string | null {
  const mappingKey = getPositionInputMappingKey(key, type);
  return mappingKey === null ? null : `${mappingKey}|${noteName}`;
}

function getPositionInputWeight(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  type: MvpQuestionType,
  position: FretPosition,
): number {
  const schedulerConfig = ADAPTIVE_PRACTICE_CONFIG.positionInputScheduler.staticWeight;
  const itemKey = getPositionInputItemKey(key, type, position);

  if (memory === undefined || itemKey === null) {
    return schedulerConfig.baseWeight;
  }

  const entry = memory.masteryMap[itemKey];
  const weaknessScore = entry?.weaknessScore ?? 0;
  const weaknessBonus = Math.min(weaknessScore, schedulerConfig.maxWeaknessBonus);

  return Math.min(
    schedulerConfig.baseWeight + weaknessBonus,
    schedulerConfig.maxFinalWeight,
  );
}

function resolveQuestionType(config: MvpPracticeConfig, index: number): MvpQuestionType {
  if (config.modeId === 'mixed') {
    return pickByWeight(config.questionTypeWeights, index);
  }

  if (config.modeId in PRACTICE_GROUP_TYPE_WEIGHTS) {
    return pickByWeight(PRACTICE_GROUP_TYPE_WEIGHTS[config.modeId as keyof typeof PRACTICE_GROUP_TYPE_WEIGHTS], index);
  }

  return config.modeId as MvpQuestionType;
}

function getNoteToPositionWeight(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  position: FretPosition,
  mappingKind: Extract<MappingKind, 'note-to-position' | 'solfeggio-to-position'> = 'note-to-position',
): number {
  const schedulerConfig = ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.staticWeight;
  const entry = getNoteToPositionEntry(memory, key, position, mappingKind);
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
  mappingKind: Extract<MappingKind, 'note-to-position' | 'solfeggio-to-position'> = 'note-to-position',
): MasteryEntryV1 | undefined {
  if (memory === undefined) {
    return undefined;
  }

  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, key);

  return solfeggio === null
    ? undefined
    : memory.masteryMap[createPracticeItemKey(mappingKind, key, noteName, solfeggio, position)];
}

function getNoteSolfeggioEntry(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  noteName: SharpNoteName,
  solfeggio: Solfeggio,
  mappingKind: Extract<MappingKind, 'note-to-solfeggio' | 'solfeggio-to-note'> = 'note-to-solfeggio',
): MasteryEntryV1 | undefined {
  return memory?.masteryMap[createPracticeItemKey(mappingKind, key, noteName, solfeggio)];
}

function getNoteSolfeggioWeight(
  memory: PracticeMemoryDocumentV1 | undefined,
  key: PracticeKey,
  noteName: SharpNoteName,
  solfeggio: Solfeggio,
  mappingKind: Extract<MappingKind, 'note-to-solfeggio' | 'solfeggio-to-note'> = 'note-to-solfeggio',
): number {
  const schedulerConfig = ADAPTIVE_PRACTICE_CONFIG.noteToSolfeggioScheduler.staticWeight;
  const entry = getNoteSolfeggioEntry(memory, key, noteName, solfeggio, mappingKind);
  const weaknessScore = entry?.weaknessScore ?? 0;
  const weaknessBonus = Math.min(weaknessScore, schedulerConfig.maxWeaknessBonus);

  return Math.min(
    schedulerConfig.baseWeight + weaknessBonus,
    schedulerConfig.maxFinalWeight,
  );
}

interface NoteToPositionCandidate {
  noteName: SharpNoteName;
  position: FretPosition;
  weight: number;
}

interface PositionInputCandidate {
  position: FretPosition;
  weight: number;
}

interface PositionInputSchedulerState {
  dynamicWeightByItemKey: Record<string, number>;
  dynamicWeightByNoteKey: Record<string, number>;
  lastNoteNameByMappingKey: Record<string, SharpNoteName>;
}

function createPositionInputSchedulerState(): PositionInputSchedulerState {
  return {
    dynamicWeightByItemKey: {},
    dynamicWeightByNoteKey: {},
    lastNoteNameByMappingKey: {},
  };
}

interface NoteToPositionSchedulerState {
  dynamicWeightByPositionId: Record<string, number>;
}

function createNoteToPositionSchedulerState(): NoteToPositionSchedulerState {
  return {
    dynamicWeightByPositionId: {},
  };
}

interface NoteToSolfeggioCandidate {
  noteName: SharpNoteName;
  solfeggio: Solfeggio;
  position: FretPosition;
  weight: number;
}

interface NoteToSolfeggioSchedulerState {
  dynamicWeightByNoteName: Partial<Record<SharpNoteName, number>>;
}

function createNoteToSolfeggioSchedulerState(): NoteToSolfeggioSchedulerState {
  return {
    dynamicWeightByNoteName: {},
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

function getPositionInputCandidates(
  config: MvpPracticeConfig,
  type: MvpQuestionType,
  state: PositionInputSchedulerState,
  memory?: PracticeMemoryDocumentV1,
): PositionInputCandidate[] {
  return getCandidatePositions(config).map((position) => {
    const itemKey = getPositionInputItemKey(config.key, type, position);
    const noteName = getNoteAtPosition(position);
    const noteKey = getPositionInputNoteKey(config.key, type, noteName);
    const mappingKey = getPositionInputMappingKey(config.key, type);
    const staticWeight = getPositionInputWeight(memory, config.key, type, position);
    const dynamicWeight = itemKey === null ? 0 : state.dynamicWeightByItemKey[itemKey] ?? 0;
    const noteDynamicWeight = noteKey === null ? 0 : state.dynamicWeightByNoteKey[noteKey] ?? 0;
    const repeatMultiplier = mappingKey !== null && state.lastNoteNameByMappingKey[mappingKey] === noteName
      ? ADAPTIVE_PRACTICE_CONFIG.positionInputScheduler.noteDynamicWeight.immediateRepeatMultiplier
      : 1;

    return {
      position,
      weight: (staticWeight + dynamicWeight + noteDynamicWeight) * repeatMultiplier,
    };
  });
}

function pickScheduledPositionInputTarget(
  config: MvpPracticeConfig,
  type: MvpQuestionType,
  index: number,
  state: PositionInputSchedulerState,
  memory?: PracticeMemoryDocumentV1,
): FretPosition {
  const candidates = getPositionInputCandidates(config, type, state, memory);
  const baseWeight = ADAPTIVE_PRACTICE_CONFIG.positionInputScheduler.staticWeight.baseWeight;
  const hasAdaptivePressure = candidates.some((candidate) => candidate.weight !== baseWeight);

  if (!hasAdaptivePressure) {
    return pickPosition(candidates.map((candidate) => candidate.position), index);
  }

  return pickByDeterministicWeight(candidates, (candidate) => candidate.weight, index, 29).position;
}

function updatePositionInputDynamicWeights(
  config: MvpPracticeConfig,
  type: MvpQuestionType,
  targetPosition: FretPosition,
  state: PositionInputSchedulerState,
): void {
  const dynamicConfig = ADAPTIVE_PRACTICE_CONFIG.positionInputScheduler.dynamicWeight;
  const noteDynamicConfig = ADAPTIVE_PRACTICE_CONFIG.positionInputScheduler.noteDynamicWeight;
  const targetItemKey = getPositionInputItemKey(config.key, type, targetPosition);
  const targetNoteName = getNoteAtPosition(targetPosition);
  const targetNoteKey = getPositionInputNoteKey(config.key, type, targetNoteName);
  const mappingKey = getPositionInputMappingKey(config.key, type);
  const handledNoteKeys = new Set<string>();

  for (const position of getCandidatePositions(config)) {
    const itemKey = getPositionInputItemKey(config.key, type, position);
    const noteName = getNoteAtPosition(position);
    const noteKey = getPositionInputNoteKey(config.key, type, noteName);

    if (itemKey === null) {
      continue;
    }

    if (noteKey !== null && !handledNoteKeys.has(noteKey)) {
      handledNoteKeys.add(noteKey);
      state.dynamicWeightByNoteKey[noteKey] = noteKey === targetNoteKey
        ? 0
        : Math.min(
            (state.dynamicWeightByNoteKey[noteKey] ?? 0) + noteDynamicConfig.gainPerQuestion,
            noteDynamicConfig.maxBonus,
          );
    }

    if (itemKey === targetItemKey) {
      state.dynamicWeightByItemKey[itemKey] = 0;
      continue;
    }

    state.dynamicWeightByItemKey[itemKey] = Math.min(
      (state.dynamicWeightByItemKey[itemKey] ?? 0) + dynamicConfig.gainPerQuestion,
      dynamicConfig.maxBonus,
    );
  }

  if (mappingKey !== null) {
    state.lastNoteNameByMappingKey[mappingKey] = targetNoteName;
  }
}

function getNoteToSolfeggioCandidates(
  config: MvpPracticeConfig,
  state: NoteToSolfeggioSchedulerState,
  memory?: PracticeMemoryDocumentV1,
  mappingKind: Extract<MappingKind, 'note-to-solfeggio' | 'solfeggio-to-note'> = 'note-to-solfeggio',
): NoteToSolfeggioCandidate[] {
  const octavePositions = getSolfeggioOctavePositions(config);

  return getKeySolfeggioMap(config.key).flatMap(({ noteName, solfeggio }) => {
    const position = octavePositions.get(noteName);
    if (position === undefined) {
      return [];
    }

    const staticWeight = getNoteSolfeggioWeight(memory, config.key, noteName, solfeggio, mappingKind);
    const dynamicWeight = state.dynamicWeightByNoteName[noteName] ?? 0;
    return [{
      noteName,
      solfeggio,
      position,
      weight: staticWeight + dynamicWeight,
    }];
  });
}

/** 音名唱名题使用同一组首调八度，避免各音名被分散到不同八度播放。 */
function getSolfeggioOctavePositions(config: MvpPracticeConfig): Map<SharpNoteName, FretPosition> {
  const scaleNotes = getKeySolfeggioMap(config.key).map((item) => item.noteName);
  const candidatePositions = getCandidatePositions(config);
  const tonicPositions = candidatePositions
    .filter((position) => getNoteAtPosition(position) === scaleNotes[0])
    .sort(compareByPitchThenEasyFret);

  for (const tonicPosition of [...tonicPositions].reverse()) {
    const octaveStartMidi = getMidiAtPosition(tonicPosition);
    const positionsByNote = new Map<SharpNoteName, FretPosition>();

    for (const noteName of scaleNotes) {
      const positionInOctave = candidatePositions
        .filter((position) => (
          getNoteAtPosition(position) === noteName
            && getMidiAtPosition(position) >= octaveStartMidi
            && getMidiAtPosition(position) < octaveStartMidi + 12
        ))
        .sort(compareByPitchThenEasyFret)[0];

      if (positionInOctave === undefined) {
        break;
      }

      positionsByNote.set(noteName, positionInOctave);
    }

    if (positionsByNote.size === scaleNotes.length) {
      return positionsByNote;
    }
  }

  const fallbackPositions = new Map<SharpNoteName, FretPosition>();
  for (const noteName of scaleNotes) {
    const position = candidatePositions
      .filter((candidate) => getNoteAtPosition(candidate) === noteName)
      .sort(compareByPitchThenEasyFret)[0];

    if (position === undefined) {
      continue;
    }

    fallbackPositions.set(noteName, position);
  }

  return fallbackPositions;
}

function compareByPitchThenEasyFret(a: FretPosition, b: FretPosition): number {
  return getMidiAtPosition(a) - getMidiAtPosition(b)
    || a.fret - b.fret
    || a.string - b.string;
}

function pickScheduledNoteToSolfeggioTarget(
  config: MvpPracticeConfig,
  index: number,
  fallbackPosition: FretPosition,
  state: NoteToSolfeggioSchedulerState,
  memory?: PracticeMemoryDocumentV1,
  mappingKind: Extract<MappingKind, 'note-to-solfeggio' | 'solfeggio-to-note'> = 'note-to-solfeggio',
): NoteToSolfeggioCandidate {
  const candidates = getNoteToSolfeggioCandidates(config, state, memory, mappingKind);
  const baseWeight = ADAPTIVE_PRACTICE_CONFIG.noteToSolfeggioScheduler.staticWeight.baseWeight;
  const hasAdaptivePressure = candidates.some((candidate) => candidate.weight !== baseWeight);

  if (!hasAdaptivePressure) {
    const fallbackNoteName = getNoteAtPosition(fallbackPosition);
    return candidates.find((candidate) => candidate.noteName === fallbackNoteName) ?? candidates[0];
  }

  return pickByDeterministicWeight(candidates, (candidate) => candidate.weight, index, 47);
}

function updateNoteToSolfeggioDynamicWeights(
  config: MvpPracticeConfig,
  targetNoteName: SharpNoteName,
  state: NoteToSolfeggioSchedulerState,
): void {
  const dynamicConfig = ADAPTIVE_PRACTICE_CONFIG.noteToSolfeggioScheduler.dynamicWeight;

  for (const candidate of getNoteToSolfeggioCandidates(config, state)) {
    if (candidate.noteName === targetNoteName) {
      state.dynamicWeightByNoteName[candidate.noteName] = 0;
      continue;
    }

    state.dynamicWeightByNoteName[candidate.noteName] = Math.min(
      (state.dynamicWeightByNoteName[candidate.noteName] ?? 0) + dynamicConfig.gainPerQuestion,
      dynamicConfig.maxBonus,
    );
  }
}

function pickScheduledNoteToPositionTarget(
  config: MvpPracticeConfig,
  index: number,
  state: NoteToPositionSchedulerState,
  memory?: PracticeMemoryDocumentV1,
  mappingKind: Extract<MappingKind, 'note-to-position' | 'solfeggio-to-position'> = 'note-to-position',
): NoteToPositionCandidate {
  const candidates = getCandidatePositions(config).map((position) => {
    const positionId = getPositionId(position);
    const staticWeight = getNoteToPositionWeight(memory, config.key, position, mappingKind);
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
  mappingKind: Extract<MappingKind, 'note-to-position' | 'solfeggio-to-position'> = 'note-to-position',
): FretPosition[] {
  return targetPositions.filter((position) => {
    const entry = getNoteToPositionEntry(memory, config.key, position, mappingKind);

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
  positionInputSchedulerState = createPositionInputSchedulerState(),
  noteToPositionSchedulerState = createNoteToPositionSchedulerState(),
  noteToSolfeggioSchedulerState = createNoteToSolfeggioSchedulerState(),
): MvpQuestion {
  const [minFret, maxFret] = config.fretRange;
  const [minString, maxString] = config.stringRange;
  const positions = getPositionsInKey(
    config.key,
    { min: minFret, max: maxFret },
    { min: minString as 1, max: maxString as 6 },
  );
  const type = resolveQuestionType(config, index);

  if (type === 'note-to-positions' || type === 'solfeggio-to-positions') {
    const positionMappingKind = type === 'solfeggio-to-positions' ? 'solfeggio-to-position' : 'note-to-position';
    const target = pickScheduledNoteToPositionTarget(config, index, noteToPositionSchedulerState, memory, positionMappingKind);
    const targetNoteName = target.noteName;
    const targetSolfeggio = getSolfeggioInKey(targetNoteName, config.key);
    const targetPositions = getPositionsForNote(config, targetNoteName);
    const assistedPositions = getAssistedPositionsForScheduledNote(
      config,
      targetPositions,
      target.position,
      index,
      memory,
      positionMappingKind,
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
      sourceMedium: type === 'solfeggio-to-positions' ? 'solfeggio' : 'note',
      isFocusNote: config.key === 'G major' && targetNoteName === 'F#',
      isWeakFocus: getNoteToPositionWeight(memory, config.key, target.position, positionMappingKind) > ADAPTIVE_PRACTICE_CONFIG.noteToPositionScheduler.staticWeight.baseWeight,
    };
  }

  const fallbackPosition = pickPosition(positions, index);

  if (type === 'note-to-solfeggio' || type === 'solfeggio-to-note') {
    const noteSolfeggioMappingKind = type === 'solfeggio-to-note' ? 'solfeggio-to-note' : 'note-to-solfeggio';
    const target = pickScheduledNoteToSolfeggioTarget(
      config,
      index,
      fallbackPosition,
      noteToSolfeggioSchedulerState,
      memory,
      noteSolfeggioMappingKind,
    );

    updateNoteToSolfeggioDynamicWeights(config, target.noteName, noteToSolfeggioSchedulerState);

    return {
      id: `${type}-${config.key}-${target.noteName}-${index}`,
      type,
      key: config.key,
      position: target.position,
      noteName: target.noteName,
      solfeggio: target.solfeggio,
      answer: type === 'solfeggio-to-note' ? target.noteName : target.solfeggio,
      targetPositions: [target.position],
      prompt: QUESTION_PROMPTS[type],
      answerKind: type === 'solfeggio-to-note' ? 'note' : 'solfeggio',
      sourceMedium: type === 'solfeggio-to-note' ? 'solfeggio' : 'note',
      isFocusNote: config.key === 'G major' && target.noteName === 'F#',
      isWeakFocus: getNoteSolfeggioWeight(memory, config.key, target.noteName, target.solfeggio, noteSolfeggioMappingKind) > ADAPTIVE_PRACTICE_CONFIG.noteToSolfeggioScheduler.staticWeight.baseWeight,
    };
  }

  const position = pickScheduledPositionInputTarget(config, type, index, positionInputSchedulerState, memory);
  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, config.key);

  if (solfeggio === null) {
    throw new Error(`位置 ${getPositionId(position)} 不属于 ${config.key}`);
  }

  updatePositionInputDynamicWeights(config, type, position, positionInputSchedulerState);

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
  const positionInputSchedulerState = createPositionInputSchedulerState();
  const noteToPositionSchedulerState = createNoteToPositionSchedulerState();
  const noteToSolfeggioSchedulerState = createNoteToSolfeggioSchedulerState();

  for (let index = 0; index < config.questionCount; index += 1) {
    questions.push(createQuestion(
      config,
      index,
      memory,
      positionInputSchedulerState,
      noteToPositionSchedulerState,
      noteToSolfeggioSchedulerState,
    ));
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
