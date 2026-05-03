import { APP_VERSION } from '../../appVersion';
import { getNoteAtPosition, getPositionId, getSolfeggioInKey } from '../../lib/theory';
import type { FretPosition, PracticeKey, SharpNoteName, Solfeggio } from '../../types/theory';
import { ADAPTIVE_PRACTICE_CONFIG } from './adaptivePracticeConfig';
import type { MvpQuestion, MvpQuestionType } from './types';

export type MappingKind =
  | 'position-to-note'
  | 'position-to-solfeggio'
  | 'note-to-solfeggio'
  | 'note-to-position';

export type PracticeOutcome =
  | 'correct'
  | 'wrong'
  | 'slow-correct'
  | 'fast-correct'
  | 'missed-position'
  | 'extra-position'
  | 'ignored';

export type PracticeIgnoredReason =
  | 'response-too-long'
  | 'no-response-time'
  | 'unsupported-question';

export interface PracticeMemoryProfile {
  id: string;
  displayName?: string;
}

export interface PracticeEventV1 {
  id: string;
  createdAt: string;
  questionId: string;
  questionType: MvpQuestionType;
  key: PracticeKey;
  mappingKind: MappingKind;
  itemKey: string;
  outcome: PracticeOutcome;
  responseMs: number | null;
  ignoredReason?: PracticeIgnoredReason;
}

export interface MasteryEntryV1 {
  itemKey: string;
  mappingKind: MappingKind;
  key: PracticeKey;
  noteName?: SharpNoteName;
  solfeggio?: Solfeggio;
  positionId?: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  slowCount: number;
  ignoredCount: number;
  averageMs: number | null;
  lastMs: number | null;
  recentResponseMs: number[];
  lastSeenAt: string;
  weaknessScore: number;
  fastCorrectStreak: number;
}

export interface ResponseGroupEntryV1 {
  groupKey: string;
  recentResponseMs: number[];
}

export interface AdaptivePracticeConfigSnapshot {
  schemaVersion: number;
  recentWindowSize: number;
  minSamplesForRelativeSlow: number;
  slowPercentile: number;
  slowMedianMultiplier: number;
  maxValidResponseMs: number;
}

export interface PracticeMemoryDocumentV1 {
  schemaVersion: 1;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  profile: PracticeMemoryProfile;
  configSnapshot: AdaptivePracticeConfigSnapshot;
  masteryMap: Record<string, MasteryEntryV1>;
  responseGroups: Record<string, ResponseGroupEntryV1>;
  recentEvents: PracticeEventV1[];
}

export interface PracticeMemoryItem {
  question: MvpQuestion;
  mappingKind: MappingKind;
  itemKey: string;
  noteName?: SharpNoteName;
  solfeggio?: Solfeggio;
  position?: FretPosition;
  isCorrect: boolean;
  responseMs: number | null;
  outcomeOnFailure: Extract<PracticeOutcome, 'wrong' | 'missed-position' | 'extra-position'>;
}

export interface PracticeMemoryHighlight {
  itemKey: string;
  label: string;
  weaknessScore: number;
  responseMs: number | null;
  outcome: PracticeOutcome;
}

export const PRACTICE_MEMORY_STORAGE_KEY = 'guitarLab.practiceMemory.v1';

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createConfigSnapshot(): AdaptivePracticeConfigSnapshot {
  return {
    schemaVersion: ADAPTIVE_PRACTICE_CONFIG.schemaVersion,
    recentWindowSize: ADAPTIVE_PRACTICE_CONFIG.recentWindowSize,
    minSamplesForRelativeSlow: ADAPTIVE_PRACTICE_CONFIG.minSamplesForRelativeSlow,
    slowPercentile: ADAPTIVE_PRACTICE_CONFIG.slowPercentile,
    slowMedianMultiplier: ADAPTIVE_PRACTICE_CONFIG.slowMedianMultiplier,
    maxValidResponseMs: ADAPTIVE_PRACTICE_CONFIG.maxValidResponseMs,
  };
}

export function createEmptyPracticeMemory(now = new Date().toISOString()): PracticeMemoryDocumentV1 {
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      id: createId('local-profile'),
    },
    configSnapshot: createConfigSnapshot(),
    masteryMap: {},
    responseGroups: {},
    recentEvents: [],
  };
}

function isPracticeMemoryDocument(value: unknown): value is PracticeMemoryDocumentV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const document = value as Partial<PracticeMemoryDocumentV1>;
  return document.schemaVersion === 1
    && typeof document.appVersion === 'string'
    && typeof document.createdAt === 'string'
    && typeof document.updatedAt === 'string'
    && typeof document.masteryMap === 'object'
    && document.masteryMap !== null
    && Array.isArray(document.recentEvents);
}

export function parsePracticeMemoryJson(jsonText: string): PracticeMemoryDocumentV1 {
  const parsed = JSON.parse(jsonText) as unknown;

  if (!isPracticeMemoryDocument(parsed)) {
    throw new Error('练习数据格式不正确。');
  }

  return {
    ...parsed,
    appVersion: APP_VERSION,
    configSnapshot: createConfigSnapshot(),
    responseGroups: parsed.responseGroups ?? {},
  };
}

export function loadPracticeMemory(): PracticeMemoryDocumentV1 {
  if (typeof window === 'undefined') {
    return createEmptyPracticeMemory();
  }

  const rawValue = window.localStorage.getItem(PRACTICE_MEMORY_STORAGE_KEY);

  if (rawValue === null) {
    return createEmptyPracticeMemory();
  }

  try {
    return parsePracticeMemoryJson(rawValue);
  } catch {
    return createEmptyPracticeMemory();
  }
}

export function savePracticeMemory(memory: PracticeMemoryDocumentV1): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PRACTICE_MEMORY_STORAGE_KEY, JSON.stringify(memory));
}

export function clearPracticeMemory(): PracticeMemoryDocumentV1 {
  const nextMemory = createEmptyPracticeMemory();
  savePracticeMemory(nextMemory);
  return nextMemory;
}

export function exportPracticeMemory(memory: PracticeMemoryDocumentV1): string {
  return `${JSON.stringify(memory, null, 2)}\n`;
}

export function createPracticeMemoryFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `guitar-lab-practice-memory-${stamp}.json`;
}

export function getMappingKindForQuestion(question: MvpQuestion): MappingKind {
  if (question.type === 'note-to-positions') {
    return 'note-to-position';
  }

  if (question.type === 'note-to-solfeggio') {
    return 'note-to-solfeggio';
  }

  return question.answerKind === 'note' ? 'position-to-note' : 'position-to-solfeggio';
}

export function createPracticeItemKey(
  mappingKind: MappingKind,
  key: PracticeKey,
  noteName?: SharpNoteName,
  solfeggio?: Solfeggio,
  position?: FretPosition,
): string {
  return [
    mappingKind,
    key,
    noteName ?? '',
    solfeggio ?? '',
    position === undefined ? '' : getPositionId(position),
  ].join('|');
}

export function createQuestionPracticeItem(
  question: MvpQuestion,
  isCorrect: boolean,
  responseMs: number | null,
): PracticeMemoryItem {
  const mappingKind = getMappingKindForQuestion(question);
  const itemKey = createPracticeItemKey(
    mappingKind,
    question.key,
    question.noteName,
    question.solfeggio,
    mappingKind === 'note-to-solfeggio' ? undefined : question.position,
  );

  return {
    question,
    mappingKind,
    itemKey,
    noteName: question.noteName,
    solfeggio: question.solfeggio,
    position: mappingKind === 'note-to-solfeggio' ? undefined : question.position,
    isCorrect,
    responseMs,
    outcomeOnFailure: 'wrong',
  };
}

export function createPositionPracticeItem(
  question: MvpQuestion,
  position: FretPosition,
  isCorrect: boolean,
  responseMs: number | null,
  outcomeOnFailure: Extract<PracticeOutcome, 'missed-position' | 'extra-position'>,
): PracticeMemoryItem {
  const noteName = getNoteAtPosition(position);
  const solfeggio = getSolfeggioInKey(noteName, question.key) ?? undefined;
  const mappingKind: MappingKind = 'note-to-position';

  return {
    question,
    mappingKind,
    itemKey: createPracticeItemKey(mappingKind, question.key, noteName, solfeggio, position),
    noteName,
    solfeggio,
    position,
    isCorrect,
    responseMs,
    outcomeOnFailure,
  };
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1),
  );
  return sortedValues[index];
}

function getMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? Math.round((sortedValues[middle - 1] + sortedValues[middle]) / 2)
    : sortedValues[middle];
}

function isRelativeSlow(samples: number[], responseMs: number): boolean {
  if (samples.length < ADAPTIVE_PRACTICE_CONFIG.minSamplesForRelativeSlow) {
    return false;
  }

  const sortedSamples = [...samples].sort((a, b) => a - b);
  const slowBoundary = percentile(sortedSamples, ADAPTIVE_PRACTICE_CONFIG.slowPercentile);
  const medianMs = getMedian(sortedSamples);

  return responseMs >= slowBoundary
    && responseMs >= medianMs * ADAPTIVE_PRACTICE_CONFIG.slowMedianMultiplier;
}

function createResponseGroupKey(item: PracticeMemoryItem): string {
  return [
    item.question.type,
    item.question.key,
    item.mappingKind,
  ].join('|');
}

function createMasteryEntry(item: PracticeMemoryItem, now: string): MasteryEntryV1 {
  return {
    itemKey: item.itemKey,
    mappingKind: item.mappingKind,
    key: item.question.key,
    noteName: item.noteName,
    solfeggio: item.solfeggio,
    positionId: item.position === undefined ? undefined : getPositionId(item.position),
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    slowCount: 0,
    ignoredCount: 0,
    averageMs: null,
    lastMs: null,
    recentResponseMs: [],
    lastSeenAt: now,
    weaknessScore: 0,
    fastCorrectStreak: 0,
  };
}

function clampWeaknessScore(value: number): number {
  return Math.max(0, value);
}

function updateEntryWithItem(
  entry: MasteryEntryV1,
  item: PracticeMemoryItem,
  groupSamples: number[],
  now: string,
): {
  entry: MasteryEntryV1;
  event: PracticeEventV1;
  groupKey: string;
  groupResponseMs: number | null;
} {
  const responseMs = item.responseMs;
  const groupKey = createResponseGroupKey(item);
  const isMissingResponse = responseMs === null;
  const isResponseTooLong = responseMs !== null && responseMs > ADAPTIVE_PRACTICE_CONFIG.maxValidResponseMs;
  const isIgnored = isResponseTooLong || (isMissingResponse && item.isCorrect);
  const ignoredReason: PracticeIgnoredReason | undefined = isIgnored
    ? isResponseTooLong ? 'response-too-long' : 'no-response-time'
    : undefined;
  const shouldRecordResponseMs = !isIgnored && responseMs !== null;
  const isSlow = shouldRecordResponseMs && item.isCorrect && isRelativeSlow(groupSamples, responseMs);
  const isFastCorrect = !isIgnored && item.isCorrect && !isSlow;
  const outcome: PracticeOutcome = isIgnored
    ? 'ignored'
    : item.isCorrect
      ? isSlow ? 'slow-correct' : 'fast-correct'
      : item.outcomeOnFailure;
  const attempts = entry.attempts + (isIgnored ? 0 : 1);
  const ignoredCount = entry.ignoredCount + (isIgnored ? 1 : 0);
  const correctCount = entry.correctCount + (!isIgnored && item.isCorrect ? 1 : 0);
  const wrongCount = entry.wrongCount + (!isIgnored && !item.isCorrect ? 1 : 0);
  const slowCount = entry.slowCount + (isSlow ? 1 : 0);
  const recentResponseMs = shouldRecordResponseMs
    ? [...entry.recentResponseMs, responseMs].slice(-ADAPTIVE_PRACTICE_CONFIG.recentWindowSize)
    : entry.recentResponseMs;
  const responseSampleCount = entry.recentResponseMs.length;
  const averageMs = shouldRecordResponseMs
    ? Math.round((((entry.averageMs ?? 0) * responseSampleCount) + responseMs) / (responseSampleCount + 1))
    : entry.averageMs;
  const previousFastStreak = entry.fastCorrectStreak;
  const fastCorrectStreak = isFastCorrect ? previousFastStreak + 1 : 0;
  const weaknessDelta = isIgnored
    ? 0
    : !item.isCorrect
      ? ADAPTIVE_PRACTICE_CONFIG.weaknessScore[item.outcomeOnFailure === 'wrong' ? 'wrong' : item.outcomeOnFailure === 'missed-position' ? 'missedPosition' : 'extraPosition']
      : isSlow
        ? ADAPTIVE_PRACTICE_CONFIG.weaknessScore.slow
        : ADAPTIVE_PRACTICE_CONFIG.weaknessScore.fastCorrect
          + (fastCorrectStreak >= 2 ? ADAPTIVE_PRACTICE_CONFIG.weaknessScore.repeatedFastCorrectBonus : 0);

  return {
    entry: {
      ...entry,
      attempts,
      correctCount,
      wrongCount,
      slowCount,
      ignoredCount,
      averageMs,
      lastMs: isIgnored ? entry.lastMs : responseMs,
      recentResponseMs,
      lastSeenAt: now,
      weaknessScore: clampWeaknessScore(entry.weaknessScore + weaknessDelta),
      fastCorrectStreak,
    },
    groupKey,
    groupResponseMs: shouldRecordResponseMs ? responseMs : null,
    event: {
      id: createId('practice-event'),
      createdAt: now,
      questionId: item.question.id,
      questionType: item.question.type,
      key: item.question.key,
      mappingKind: item.mappingKind,
      itemKey: item.itemKey,
      outcome,
      responseMs,
      ignoredReason,
    },
  };
}

export function recordPracticeMemoryItems(
  memory: PracticeMemoryDocumentV1,
  items: PracticeMemoryItem[],
  now = new Date().toISOString(),
): PracticeMemoryDocumentV1 {
  const masteryMap = { ...memory.masteryMap };
  const responseGroups = { ...memory.responseGroups };
  const events: PracticeEventV1[] = [];

  for (const item of items) {
    const currentEntry = masteryMap[item.itemKey] ?? createMasteryEntry(item, now);
    const groupKey = createResponseGroupKey(item);
    const currentGroup = responseGroups[groupKey] ?? {
      groupKey,
      recentResponseMs: [],
    };
    const result = updateEntryWithItem(currentEntry, item, currentGroup.recentResponseMs, now);
    masteryMap[item.itemKey] = result.entry;
    if (result.groupResponseMs !== null) {
      responseGroups[groupKey] = {
        groupKey,
        recentResponseMs: [...currentGroup.recentResponseMs, result.groupResponseMs]
          .slice(-ADAPTIVE_PRACTICE_CONFIG.recentWindowSize),
      };
    }
    events.push(result.event);
  }

  const recentEvents = [...memory.recentEvents, ...events].slice(-ADAPTIVE_PRACTICE_CONFIG.maxRecentEvents);

  return {
    ...memory,
    appVersion: APP_VERSION,
    updatedAt: now,
    configSnapshot: createConfigSnapshot(),
    masteryMap,
    responseGroups,
    recentEvents,
  };
}

export function getPracticeItemWeight(memory: PracticeMemoryDocumentV1, itemKey: string): number {
  const entry = memory.masteryMap[itemKey];
  const weaknessScore = entry?.weaknessScore ?? 0;
  const weaknessBonus = Math.min(weaknessScore, ADAPTIVE_PRACTICE_CONFIG.weighting.maxWeaknessBonus);

  return Math.min(
    ADAPTIVE_PRACTICE_CONFIG.weighting.baseWeight + weaknessBonus,
    ADAPTIVE_PRACTICE_CONFIG.weighting.maxFinalWeight,
  );
}

export function getPracticeMemoryHighlights(memory: PracticeMemoryDocumentV1, limit = 4): PracticeMemoryHighlight[] {
  const eventByItemKey = new Map<string, PracticeEventV1>();

  for (const event of memory.recentEvents.slice(-80)) {
    eventByItemKey.set(event.itemKey, event);
  }

  return Object.values(memory.masteryMap)
    .filter((entry) => entry.weaknessScore > 0)
    .sort((a, b) => b.weaknessScore - a.weaknessScore || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, limit)
    .map((entry) => {
      const event = eventByItemKey.get(entry.itemKey);
      return {
        itemKey: entry.itemKey,
        label: formatPracticeMemoryEntry(entry),
        weaknessScore: entry.weaknessScore,
        responseMs: event?.responseMs ?? entry.lastMs,
        outcome: event?.outcome ?? 'wrong',
      };
    });
}

export function formatPracticeMemoryEntry(entry: MasteryEntryV1): string {
  const keyLabel = entry.key === 'G major' ? 'G 大调' : 'C 大调';
  const positionLabel = entry.positionId === undefined ? '' : ` @ ${entry.positionId.replace('-', '弦')}品`;

  if (entry.mappingKind === 'note-to-solfeggio') {
    return `${keyLabel}: ${entry.noteName ?? '-'} -> ${entry.solfeggio ?? '-'}`;
  }

  if (entry.mappingKind === 'note-to-position') {
    return `${keyLabel}: ${entry.noteName ?? '-'}${positionLabel}`;
  }

  return `${keyLabel}: ${positionLabel} -> ${entry.noteName ?? '-'}${entry.solfeggio === undefined ? '' : ` / ${entry.solfeggio}`}`;
}

export function syncPracticeMemoryToDevServer(memory: PracticeMemoryDocumentV1): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.fetch('/__dev/practice-data', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(memory),
  }).catch(() => {
    // 开发期能力，服务器不支持时静默跳过。
  });
}
