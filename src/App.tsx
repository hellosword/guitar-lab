import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { APP_VERSION } from './appVersion';
import Fretboard from './components/Fretboard';
import type { FretboardPositionLabel, FretboardPositionState } from './components/Fretboard';
import NoteSelector from './components/NoteSelector';
import SolfeggioSelector from './components/SolfeggioSelector';
import Tablature from './components/Tablature';
import { playPositionPitch, preloadPositionPitch, type GuitarToneId } from './lib/audio';
import {
  formatSolfeggio,
  isSolfeggio,
  loadSolfeggioDisplayMode,
  saveSolfeggioDisplayMode,
  type SolfeggioDisplayMode,
} from './lib/solfeggioDisplay';
import {
  formatPosition,
  getKeySolfeggioMap,
  getNoteAtPosition,
  getPositionId,
  getSolfeggioInKey,
  isNoteInKey,
  isSamePosition,
  NOTE_COLORS,
} from './lib/theory';
import {
  createPracticeSummary,
  createQuestionSet,
  DEFAULT_MVP_CONFIG,
  getDefaultFretRangeForKey,
  getExtraPositions,
  getMissingPositions,
  isAnswerCorrect,
  isSlowAnswer,
  PRACTICE_MODE_OPTIONS,
} from './modules/fretboard-game/practiceSession';
import { ADAPTIVE_PRACTICE_CONFIG } from './modules/fretboard-game/adaptivePracticeConfig';
import { PRACTICE_INTERACTION_CONFIG } from './modules/fretboard-game/practiceInteractionConfig';
import {
  clearPracticeMemory,
  createPositionPracticeItem,
  createPracticeMemoryFileName,
  createQuestionPracticeItem,
  createPracticeItemKey,
  exportPracticeMemory,
  getPracticeMemoryHighlights,
  loadPracticeMemory,
  parsePracticeMemoryJson,
  recordPracticeMemoryItems,
  savePracticeMemory,
  syncPracticeMemoryToDevServer,
  type MappingKind,
  type MasteryEntryV1,
  type PracticeMemoryDocumentV1,
  type PracticeMemoryItem,
  type PracticeOutcome,
} from './modules/fretboard-game/practiceMemory';
import type {
  AnswerRecord,
  MvpPracticeConfig,
  MvpQuestion,
  PracticeAnswerValue,
  PracticeModeId,
} from './modules/fretboard-game/types';
import type { FretPosition, PracticeKey, SharpNoteName } from './types/theory';

const KEY_OPTIONS: PracticeKey[] = ['G major', 'C major'];
const FAST_POSITION_RESPONSE_MS = 2500;
const MASTERED_FAST_STREAK = 2;
const GUITAR_TONE_STORAGE_KEY = 'guitar-lab:guitar-tone';
const BUILD_LABEL = __GIT_COMMIT__ === 'unknown' ? __GIT_BRANCH__ : `${__GIT_BRANCH__}@${__GIT_COMMIT__}`;
type AppView = 'practice' | 'reference';
type PracticeSubView = 'train' | 'weakness';
type FretboardMarkerMode = 'note' | 'solfeggio';

interface PracticePathOption {
  id: PracticeModeId;
  from: string;
  to: string;
  label: string;
  description: string;
  weaknessAvailable: boolean;
  edgePosition?: {
    left: string;
    top: string;
  };
}

const PRACTICE_PATH_OPTIONS: PracticePathOption[] = [
  {
    id: 'mixed',
    from: '全部',
    to: '混合',
    label: '综合练习',
    description: '混合当前已启用的认知通路，适合日常热身和整体检查。',
    weaknessAvailable: false,
  },
  {
    id: 'board-to-note',
    from: '指板位置',
    to: '音名',
    label: '位置 -> 音名',
    description: '看到指板上的弦品位置后，快速反应它的音名。',
    weaknessAvailable: true,
    edgePosition: { left: '34%', top: '66%' },
  },
  {
    id: 'board-to-solfeggio',
    from: '指板位置',
    to: '唱名',
    label: '位置 -> 唱名',
    description: '看到指板位置后，直接反应当前调里的首调唱名。',
    weaknessAvailable: true,
    edgePosition: { left: '50%', top: '84%' },
  },
  {
    id: 'tab-to-note',
    from: '六线谱',
    to: '音名',
    label: '六线谱 -> 音名',
    description: '看到六线谱位置后，快速反应它在指板上的音名。',
    weaknessAvailable: true,
    edgePosition: { left: '48%', top: '38%' },
  },
  {
    id: 'tab-to-solfeggio',
    from: '六线谱',
    to: '唱名',
    label: '六线谱 -> 唱名',
    description: '看到六线谱位置后，反应当前调里的首调唱名。',
    weaknessAvailable: true,
    edgePosition: { left: '66%', top: '38%' },
  },
  {
    id: 'note-to-solfeggio',
    from: '音名',
    to: '唱名',
    label: '音名 -> 唱名',
    description: '看到音名后，快速反应它在当前调里的首调唱名。',
    weaknessAvailable: true,
    edgePosition: { left: '66%', top: '66%' },
  },
  {
    id: 'note-to-positions',
    from: '音名',
    to: '指板位置',
    label: '音名 -> 位置',
    description: '看到音名后，在空指板上找出当前范围内的所有位置。',
    weaknessAvailable: true,
    edgePosition: { left: '34%', top: '52%' },
  },
];

interface PositionPracticeStats {
  attempts: number;
  correctCount: number;
  wrongCount: number;
  slowCount: number;
  correctFastStreak: number;
  lastResponseMs: number;
  averageResponseMs: number;
}

type WeaknessStatus = 'danger' | 'slow' | 'practiced' | 'mastered';

interface WeaknessMapEntry {
  itemKey: string;
  noteName: SharpNoteName;
  solfeggio: string;
  position: FretPosition;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  slowCount: number;
  averageMs: number | null;
  lastMs: number | null;
  weaknessScore: number;
  fastCorrectStreak: number;
  recentPressure: number;
  status: WeaknessStatus;
}

interface NoteSolfeggioWeaknessEntry {
  itemKey: string;
  noteName: SharpNoteName;
  solfeggio: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  slowCount: number;
  averageMs: number | null;
  lastMs: number | null;
  weaknessScore: number;
  fastCorrectStreak: number;
  recentPressure: number;
  status: WeaknessStatus;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRange(config: MvpPracticeConfig): string {
  const [minFret, maxFret] = config.fretRange;
  return `${minFret}-${maxFret} 品`;
}

function getPracticeModeLabel(modeId: PracticeModeId): string {
  return PRACTICE_MODE_OPTIONS.find((mode) => mode.id === modeId)?.label ?? '综合练习';
}

function getPracticePathOption(modeId: PracticeModeId): PracticePathOption {
  return PRACTICE_PATH_OPTIONS.find((path) => path.id === modeId) ?? PRACTICE_PATH_OPTIONS[0];
}

function formatPositions(positions: FretPosition[]): string {
  return positions.length === 0 ? '未选择' : positions.map(formatPosition).join('、');
}

function formatAnswerValue(answer: PracticeAnswerValue, solfeggioDisplayMode: SolfeggioDisplayMode): string {
  if (Array.isArray(answer)) {
    return formatPositions(answer);
  }

  return isSolfeggio(answer) ? formatSolfeggio(answer, solfeggioDisplayMode) : answer;
}

function getPositionStatsKey(question: MvpQuestion, position: FretPosition): string {
  return `${question.key}|${question.type}|${question.noteName}|${getPositionId(position)}`;
}

function getPositionMemoryKey(question: MvpQuestion, position: FretPosition): string {
  return createPracticeItemKey('note-to-position', question.key, question.noteName, question.solfeggio, position);
}

function isPositionMastered(
  stats: PositionPracticeStats | undefined,
  memory: PracticeMemoryDocumentV1,
  question: MvpQuestion,
  position: FretPosition,
): boolean {
  if (stats !== undefined && stats.correctFastStreak >= MASTERED_FAST_STREAK) {
    return true;
  }

  const memoryEntry = memory.masteryMap[getPositionMemoryKey(question, position)];
  return memoryEntry !== undefined
    && memoryEntry.fastCorrectStreak >= MASTERED_FAST_STREAK
    && memoryEntry.weaknessScore === 0;
}

function getPositionsToClick(question: MvpQuestion, masteredPositions: FretPosition[]): FretPosition[] {
  if (question.answerKind !== 'positions') {
    return [];
  }

  const remainingPositions = question.targetPositions.filter((targetPosition) => (
    !masteredPositions.some((masteredPosition) => isSamePosition(masteredPosition, targetPosition))
  ));

  return remainingPositions.length === 0 ? question.targetPositions : remainingPositions;
}

function getAnswerPositionStates(
  question: MvpQuestion,
  selectedPositions: FretPosition[],
  answeredRecord: AnswerRecord | null,
): Record<string, FretboardPositionState> {
  if (question.answerKind !== 'positions') {
    return {};
  }

  if (answeredRecord === null) {
    return selectedPositions.reduce<Record<string, FretboardPositionState>>((states, position) => {
      states[getPositionId(position)] = 'correct';
      return states;
    }, {});
  }

  const states: Record<string, FretboardPositionState> = {};

  if (Array.isArray(answeredRecord.userAnswer)) {
    for (const position of answeredRecord.userAnswer) {
      states[getPositionId(position)] = 'correct';
    }
  }

  for (const position of answeredRecord.extraPositions) {
    states[getPositionId(position)] = 'extra';
  }

  for (const position of answeredRecord.missedPositions) {
    states[getPositionId(position)] = 'missed';
  }

  return states;
}

function getMasteredPositionLabel(
  question: MvpQuestion,
  masteredPositions: FretPosition[],
  position: FretPosition,
): FretboardPositionLabel | null {
  if (question.answerKind !== 'positions') {
    return null;
  }

  const isMastered = masteredPositions.some((masteredPosition) => isSamePosition(masteredPosition, position));

  if (!isMastered) {
    return null;
  }

  const noteColor = NOTE_COLORS[question.noteName];

  return {
    text: question.noteName,
    tone: question.noteName.includes('#') ? 'accidental' : 'natural',
    fill: noteColor.softFill,
    stroke: noteColor.stroke,
    textColor: noteColor.text,
  };
}

function parsePositionId(positionId: string | undefined): FretPosition | null {
  if (positionId === undefined) {
    return null;
  }

  const [stringText, fretText] = positionId.split('-');
  const string = Number(stringText);
  const fret = Number(fretText);

  if (![1, 2, 3, 4, 5, 6].includes(string) || !Number.isInteger(fret) || fret < 0) {
    return null;
  }

  return {
    string: string as FretPosition['string'],
    fret,
  };
}

function getWeaknessMapOutcomeScore(outcome: PracticeOutcome): number {
  const scoreConfig = ADAPTIVE_PRACTICE_CONFIG.weaknessMapDisplay.pressureScore;

  if (outcome === 'wrong') {
    return scoreConfig.wrong;
  }

  if (outcome === 'missed-position') {
    return scoreConfig.missedPosition;
  }

  if (outcome === 'extra-position') {
    return scoreConfig.extraPosition;
  }

  if (outcome === 'slow-correct') {
    return scoreConfig.slowCorrect;
  }

  if (outcome === 'fast-correct' || outcome === 'correct') {
    return scoreConfig.fastCorrect;
  }

  return 0;
}

function getWeaknessMapRecentPressure(memory: PracticeMemoryDocumentV1, itemKey: string): number {
  const displayConfig = ADAPTIVE_PRACTICE_CONFIG.weaknessMapDisplay;
  const recentEvents = memory.recentEvents
    .filter((event) => event.itemKey === itemKey)
    .slice(-displayConfig.recentEventLimit)
    .reverse();

  return recentEvents.reduce((sum, event, index) => {
    const recencyWeight = index < displayConfig.fullWeightEventCount ? 1 : displayConfig.midWeight;
    return sum + getWeaknessMapOutcomeScore(event.outcome) * recencyWeight;
  }, 0);
}

function getPositionWeaknessMappingKind(modeId: PracticeModeId): MappingKind | null {
  if (modeId === 'note-to-positions') {
    return 'note-to-position';
  }

  if (modeId === 'board-to-note' || modeId === 'tab-to-note') {
    return 'position-to-note';
  }

  if (modeId === 'board-to-solfeggio' || modeId === 'tab-to-solfeggio') {
    return 'position-to-solfeggio';
  }

  return null;
}

function getPositionWeaknessCopy(modeId: PracticeModeId): {
  heading: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  noEntryText: string;
} {
  if (modeId === 'note-to-positions') {
    return {
      heading: '随时查看的弱点地图',
      description: '根据近期练习事件展示当前通路的指板位置压力。暖色代表近期相对更需要关注；历史慢错仍保留在详情里。',
      emptyTitle: '还没有音名定位记录',
      emptyDescription: '去“练习”里选择音名定位，完成几题后这里会显示慢点、错点和熟练点。',
      noEntryText: '这个位置还没有音名定位记录。',
    };
  }

  if (modeId === 'board-to-note' || modeId === 'tab-to-note') {
    return {
      heading: '位置音名弱点地图',
      description: '按“位置 -> 音名”的映射统计近期压力。指板题和六线谱题会共享这条认知通路的掌握数据。',
      emptyTitle: '还没有位置音名记录',
      emptyDescription: '去“练习”里选择指板音名或六线谱音名，完成几题后这里会显示慢反应和错答位置。',
      noEntryText: '这个位置还没有位置音名记录。',
    };
  }

  return {
    heading: '位置唱名弱点地图',
    description: '按“位置 -> 唱名”的映射统计近期压力。指板题和六线谱题会共享这条认知通路的掌握数据。',
    emptyTitle: '还没有位置唱名记录',
    emptyDescription: '去“练习”里选择指板唱名或六线谱唱名，完成几题后这里会显示慢反应和错答位置。',
    noEntryText: '这个位置还没有位置唱名记录。',
  };
}

function toWeaknessMapEntry(
  entry: MasteryEntryV1,
  memory: PracticeMemoryDocumentV1,
  mappingKind: MappingKind,
): WeaknessMapEntry | null {
  if (entry.mappingKind !== mappingKind || entry.noteName === undefined) {
    return null;
  }

  const position = parsePositionId(entry.positionId);

  if (position === null) {
    return null;
  }

  return {
    itemKey: entry.itemKey,
    noteName: entry.noteName,
    solfeggio: isNoteInKey(entry.noteName, entry.key) ? entry.solfeggio ?? '未知' : '调外音',
    position,
    attempts: entry.attempts,
    correctCount: entry.correctCount,
    wrongCount: entry.wrongCount,
    slowCount: entry.slowCount,
    averageMs: entry.averageMs,
    lastMs: entry.lastMs,
    weaknessScore: entry.weaknessScore,
    fastCorrectStreak: entry.fastCorrectStreak,
    recentPressure: getWeaknessMapRecentPressure(memory, entry.itemKey),
    status: 'practiced',
  };
}

function toNoteSolfeggioWeaknessEntry(
  entry: MasteryEntryV1,
  memory: PracticeMemoryDocumentV1,
): NoteSolfeggioWeaknessEntry | null {
  if (entry.mappingKind !== 'note-to-solfeggio' || entry.noteName === undefined) {
    return null;
  }

  return {
    itemKey: entry.itemKey,
    noteName: entry.noteName,
    solfeggio: entry.solfeggio ?? '未知',
    attempts: entry.attempts,
    correctCount: entry.correctCount,
    wrongCount: entry.wrongCount,
    slowCount: entry.slowCount,
    averageMs: entry.averageMs,
    lastMs: entry.lastMs,
    weaknessScore: entry.weaknessScore,
    fastCorrectStreak: entry.fastCorrectStreak,
    recentPressure: getWeaknessMapRecentPressure(memory, entry.itemKey),
    status: 'practiced',
  };
}

function formatWeaknessSolfeggio(value: string, solfeggioDisplayMode: SolfeggioDisplayMode): string {
  return isSolfeggio(value) ? formatSolfeggio(value, solfeggioDisplayMode) : value;
}

function applyWeaknessMapStatuses<T extends {
  itemKey: string;
  recentPressure: number;
  weaknessScore: number;
  fastCorrectStreak: number;
  status: WeaknessStatus;
}>(entries: T[]): T[] {
  const displayConfig = ADAPTIVE_PRACTICE_CONFIG.weaknessMapDisplay;
  const pressureEntries = [...entries]
    .filter((entry) => entry.recentPressure > 0)
    .sort((a, b) => b.recentPressure - a.recentPressure || b.weaknessScore - a.weaknessScore);
  const dangerCount = Math.min(
    pressureEntries.length,
    Math.ceil(pressureEntries.length * displayConfig.statusRatio.dangerTopRatio),
  );
  const slowCount = Math.min(
    pressureEntries.length - dangerCount,
    Math.ceil(pressureEntries.length * displayConfig.statusRatio.slowNextRatio),
  );
  const dangerKeys = new Set(pressureEntries.slice(0, dangerCount).map((entry) => entry.itemKey));
  const slowKeys = new Set(pressureEntries.slice(dangerCount, dangerCount + slowCount).map((entry) => entry.itemKey));

  return entries.map((entry) => {
    if (dangerKeys.has(entry.itemKey)) {
      return { ...entry, status: 'danger' };
    }

    if (slowKeys.has(entry.itemKey)) {
      return { ...entry, status: 'slow' };
    }

    if (
      entry.recentPressure <= displayConfig.mastered.maxPressure
      && entry.fastCorrectStreak >= displayConfig.mastered.minFastCorrectStreak
    ) {
      return { ...entry, status: 'mastered' };
    }

    return entry;
  });
}

function getWeaknessEntries(
  memory: PracticeMemoryDocumentV1,
  practiceKey: PracticeKey,
  mappingKind: MappingKind,
): WeaknessMapEntry[] {
  const entries = Object.values(memory.masteryMap)
    .filter((entry) => entry.key === practiceKey)
    .map((entry) => toWeaknessMapEntry(entry, memory, mappingKind))
    .filter((entry): entry is WeaknessMapEntry => entry !== null)
    .filter((entry) => isNoteInKey(entry.noteName, practiceKey));

  return applyWeaknessMapStatuses(entries);
}

function getNoteSolfeggioWeaknessEntries(
  memory: PracticeMemoryDocumentV1,
  practiceKey: PracticeKey,
): NoteSolfeggioWeaknessEntry[] {
  const entries = Object.values(memory.masteryMap)
    .filter((entry) => entry.key === practiceKey)
    .map((entry) => toNoteSolfeggioWeaknessEntry(entry, memory))
    .filter((entry): entry is NoteSolfeggioWeaknessEntry => entry !== null)
    .filter((entry) => isNoteInKey(entry.noteName, practiceKey));

  return applyWeaknessMapStatuses(entries);
}

function getOffKeyMistakeEntries(
  memory: PracticeMemoryDocumentV1,
  practiceKey: PracticeKey,
  mappingKind: MappingKind,
): WeaknessMapEntry[] {
  return Object.values(memory.masteryMap)
    .filter((entry) => entry.key === practiceKey && entry.wrongCount > 0)
    .map((entry) => toWeaknessMapEntry(entry, memory, mappingKind))
    .filter((entry): entry is WeaknessMapEntry => entry !== null)
    .filter((entry) => !isNoteInKey(entry.noteName, practiceKey));
}

function sortWeaknessEntries(entries: WeaknessMapEntry[]): WeaknessMapEntry[] {
  return [...entries].sort((a, b) => (
    b.recentPressure - a.recentPressure
      || b.weaknessScore - a.weaknessScore
      || b.wrongCount - a.wrongCount
      || b.slowCount - a.slowCount
      || (b.averageMs ?? 0) - (a.averageMs ?? 0)
      || b.attempts - a.attempts
  ));
}

function sortNoteSolfeggioWeaknessEntries(entries: NoteSolfeggioWeaknessEntry[]): NoteSolfeggioWeaknessEntry[] {
  return [...entries].sort((a, b) => (
    b.recentPressure - a.recentPressure
      || b.weaknessScore - a.weaknessScore
      || b.wrongCount - a.wrongCount
      || b.slowCount - a.slowCount
      || (b.averageMs ?? 0) - (a.averageMs ?? 0)
      || b.attempts - a.attempts
  ));
}

function loadGuitarTone(): GuitarToneId {
  const storedTone = window.localStorage.getItem(GUITAR_TONE_STORAGE_KEY);
  return storedTone === 'clean-electric' ? 'clean-electric' : 'emilyguitar';
}

function saveGuitarTone(toneId: GuitarToneId): void {
  window.localStorage.setItem(GUITAR_TONE_STORAGE_KEY, toneId);
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('practice');
  const [practiceSubView, setPracticeSubView] = useState<PracticeSubView>('train');
  const [solfeggioDisplayMode, setSolfeggioDisplayMode] = useState<SolfeggioDisplayMode>(() => loadSolfeggioDisplayMode());
  const [guitarTone, setGuitarTone] = useState<GuitarToneId>(() => loadGuitarTone());
  const [markerMode, setMarkerMode] = useState<FretboardMarkerMode>('note');
  const [showOutOfKeyNotes, setShowOutOfKeyNotes] = useState(false);
  const [selectedMemoryPosition, setSelectedMemoryPosition] = useState<FretPosition | null>(null);
  const [selectedWeaknessPosition, setSelectedWeaknessPosition] = useState<FretPosition | null>(null);
  const [hoveredMemoryNote, setHoveredMemoryNote] = useState<SharpNoteName | null>(null);
  const [config, setConfig] = useState<MvpPracticeConfig>(DEFAULT_MVP_CONFIG);
  const [practiceMemory, setPracticeMemory] = useState<PracticeMemoryDocumentV1>(() => loadPracticeMemory());
  const [questions, setQuestions] = useState<MvpQuestion[]>(() => createQuestionSet(DEFAULT_MVP_CONFIG, practiceMemory));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [answeredRecord, setAnsweredRecord] = useState<AnswerRecord | null>(null);
  const [selectedAnswerPositions, setSelectedAnswerPositions] = useState<FretPosition[]>([]);
  const [masteredAnswerPositions, setMasteredAnswerPositions] = useState<FretPosition[]>([]);
  const [positionPracticeStats, setPositionPracticeStats] = useState<Record<string, PositionPracticeStats>>({});
  const [questionStartedAt, setQuestionStartedAt] = useState(() => performance.now());
  const [positionStartedAt, setPositionStartedAt] = useState(() => performance.now());
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const summary = useMemo(() => createPracticeSummary(records), [records]);
  const memoryHighlights = useMemo(
    () => getPracticeMemoryHighlights(
      practiceMemory,
      4,
      (solfeggio) => formatSolfeggio(solfeggio, solfeggioDisplayMode),
    ),
    [practiceMemory, solfeggioDisplayMode],
  );
  const positionsToClick = currentQuestion === undefined ? [] : getPositionsToClick(currentQuestion, masteredAnswerPositions);

  useEffect(() => {
    savePracticeMemory(practiceMemory);
  }, [practiceMemory]);

  useEffect(() => {
    saveSolfeggioDisplayMode(solfeggioDisplayMode);
  }, [solfeggioDisplayMode]);

  useEffect(() => {
    saveGuitarTone(guitarTone);
  }, [guitarTone]);

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentQuestion === undefined) {
      return;
    }

    playPositionPitch(currentQuestion.position, guitarTone).catch(() => {
      // 浏览器可能在首次用户手势前阻止自动播放，此时保留手动重播按钮。
    });
  }, [currentQuestion, guitarTone]);

  useEffect(() => {
    const positionsToPreload = questions
      .slice(currentIndex, currentIndex + 5)
      .flatMap((question) => (
        question.answerKind === 'positions'
          ? [question.position, ...question.targetPositions]
          : [question.position]
      ))
      .filter((position, index, positions) => (
        positions.findIndex((candidate) => isSamePosition(candidate, position)) === index
      ));

    positionsToPreload.forEach((position) => {
      preloadPositionPitch(position, guitarTone).catch(() => {
        // 预加载失败时保留按需加载，不影响练习。
      });
    });
  }, [questions, currentIndex, guitarTone]);

  useEffect(() => {
    if (currentQuestion === undefined || currentQuestion.answerKind !== 'positions') {
      setMasteredAnswerPositions([]);
      return;
    }

    if (currentQuestion.assistedPositions !== undefined) {
      setMasteredAnswerPositions(
        currentQuestion.assistedPositions.length === currentQuestion.targetPositions.length
          ? []
          : currentQuestion.assistedPositions,
      );
      setPositionStartedAt(performance.now());
      return;
    }

    const masteredPositions = currentQuestion.targetPositions.filter((position) => (
      isPositionMastered(positionPracticeStats[getPositionStatsKey(currentQuestion, position)], practiceMemory, currentQuestion, position)
    ));

    setMasteredAnswerPositions(masteredPositions.length === currentQuestion.targetPositions.length ? [] : masteredPositions);
    setPositionStartedAt(performance.now());
  }, [currentQuestion?.id]);

  function restartPractice(nextKey = config.key, nextModeId = config.modeId): void {
    cancelAutoAdvance();
    const nextConfig = {
      ...config,
      modeId: nextModeId,
      key: nextKey,
      fretRange: getDefaultFretRangeForKey(nextKey),
    };
    setConfig(nextConfig);
    setQuestions(createQuestionSet(nextConfig, practiceMemory));
    setCurrentIndex(0);
    setRecords([]);
    setAnsweredRecord(null);
    setSelectedAnswerPositions([]);
    setMasteredAnswerPositions([]);
    setPositionPracticeStats({});
    setQuestionStartedAt(performance.now());
    setPositionStartedAt(performance.now());
  }

  function handleModeChange(nextModeId: PracticeModeId): void {
    const nextPath = getPracticePathOption(nextModeId);
    setPracticeSubView((previous) => (previous === 'weakness' && nextPath.weaknessAvailable ? 'weakness' : 'train'));
    restartPractice(config.key, nextModeId);
  }

  function handlePracticePathSelect(nextModeId: PracticeModeId): void {
    handleModeChange(nextModeId);
  }

  function handleStartPractice(): void {
    setActiveView('practice');
    setPracticeSubView('train');
  }

  function handlePracticeViewClick(): void {
    setActiveView('practice');
    setPracticeSubView('train');
  }

  function handleShowPracticeWeakness(): void {
    if (!getPracticePathOption(config.modeId).weaknessAvailable) {
      return;
    }

    setActiveView('practice');
    setPracticeSubView('weakness');
  }

  function handleKeyChange(nextKey: PracticeKey): void {
    if (activeView === 'practice') {
      restartPractice(nextKey);
      return;
    }

    setConfig((previous) => ({ ...previous, key: nextKey, fretRange: getDefaultFretRangeForKey(nextKey) }));
  }

  function completeAnswer(userAnswer: PracticeAnswerValue): void {
    if (answeredRecord !== null || currentQuestion === undefined) {
      return;
    }

    const responseMs = Math.round(performance.now() - questionStartedAt);
    const missedPositions = currentQuestion.answerKind === 'positions' && Array.isArray(userAnswer) && Array.isArray(currentQuestion.answer)
      ? getMissingPositions(currentQuestion.answer, userAnswer)
      : [];
    const extraPositions = currentQuestion.answerKind === 'positions' && Array.isArray(userAnswer) && Array.isArray(currentQuestion.answer)
      ? getExtraPositions(currentQuestion.answer, userAnswer)
      : [];
    const record: AnswerRecord = {
      question: currentQuestion,
      userAnswer,
      isCorrect: isAnswerCorrect(currentQuestion, userAnswer),
      responseMs,
      isSlow: isSlowAnswer(currentQuestion, responseMs),
      missedPositions,
      extraPositions,
    };

    setAnsweredRecord(record);
    setRecords((previous) => [...previous, record]);

    if (currentQuestion.answerKind === 'positions') {
      const memoryItems: PracticeMemoryItem[] = [];

      for (const missedPosition of missedPositions) {
        updatePositionPracticeStats(currentQuestion, missedPosition, false, responseMs);
        memoryItems.push(createPositionPracticeItem(currentQuestion, missedPosition, false, null, 'missed-position'));
      }

      for (const extraPosition of extraPositions) {
        updatePositionPracticeStats(currentQuestion, extraPosition, false, responseMs);
        memoryItems.push(createPositionPracticeItem(currentQuestion, extraPosition, false, responseMs, 'extra-position'));
      }

      if (memoryItems.length > 0) {
        applyPracticeMemoryItems(memoryItems);
      }
    } else {
      updatePositionPracticeStats(currentQuestion, currentQuestion.position, record.isCorrect, responseMs);
      applyPracticeMemoryItems([createQuestionPracticeItem(currentQuestion, record.isCorrect, responseMs)]);
    }

    if (record.isCorrect) {
      scheduleAutoAdvance();
    }
  }

  function handleAnswer(userAnswer: PracticeAnswerValue): void {
    completeAnswer(userAnswer);
  }

  function cancelAutoAdvance(): void {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }

  function scheduleAutoAdvance(): void {
    cancelAutoAdvance();
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      goToNextQuestion();
    }, PRACTICE_INTERACTION_CONFIG.correctAnswerAutoAdvanceMs);
  }

  function handlePositionAnswerClick(position: FretPosition): void {
    if (answeredRecord !== null || currentQuestion === undefined || currentQuestion.answerKind !== 'positions') {
      return;
    }

    playFretboardPosition(position);

    if (!Array.isArray(currentQuestion.answer)) {
      return;
    }

    const isMasteredPosition = masteredAnswerPositions.some((masteredPosition) => isSamePosition(masteredPosition, position));

    if (isMasteredPosition) {
      return;
    }

    const alreadyFound = selectedAnswerPositions.some((selected) => isSamePosition(selected, position));

    if (alreadyFound) {
      return;
    }

    const isTargetPosition = positionsToClick.some((targetPosition) => isSamePosition(targetPosition, position));

    if (!isTargetPosition) {
      cancelAutoAdvance();
      completeAnswer([...masteredAnswerPositions, ...selectedAnswerPositions, position]);
      return;
    }

    const now = performance.now();
    const positionResponseMs = Math.round(now - positionStartedAt);
    updatePositionPracticeStats(currentQuestion, position, true, positionResponseMs);
    applyPracticeMemoryItems([createPositionPracticeItem(currentQuestion, position, true, positionResponseMs, 'missed-position')]);
    setPositionStartedAt(now);

    const nextSelectedPositions = [...selectedAnswerPositions, position];
    setSelectedAnswerPositions(nextSelectedPositions);

    if (getMissingPositions(positionsToClick, nextSelectedPositions).length === 0) {
      completeAnswer([...masteredAnswerPositions, ...nextSelectedPositions]);
    }
  }

  function updatePositionPracticeStats(
    question: MvpQuestion,
    position: FretPosition,
    isCorrect: boolean,
    responseMs: number,
  ): void {
    const statsKey = getPositionStatsKey(question, position);
    const isSlow = responseMs > FAST_POSITION_RESPONSE_MS;

    setPositionPracticeStats((previous) => {
      const currentStats = previous[statsKey] ?? {
        attempts: 0,
        correctCount: 0,
        wrongCount: 0,
        slowCount: 0,
        correctFastStreak: 0,
        lastResponseMs: 0,
        averageResponseMs: 0,
      };
      const attempts = currentStats.attempts + 1;
      const correctCount = currentStats.correctCount + (isCorrect ? 1 : 0);
      const wrongCount = currentStats.wrongCount + (isCorrect ? 0 : 1);
      const slowCount = currentStats.slowCount + (isSlow ? 1 : 0);
      const averageResponseMs = Math.round(
        (currentStats.averageResponseMs * currentStats.attempts + responseMs) / attempts,
      );

      return {
        ...previous,
        [statsKey]: {
          attempts,
          correctCount,
          wrongCount,
          slowCount,
          averageResponseMs,
          lastResponseMs: responseMs,
          correctFastStreak: isCorrect && !isSlow ? currentStats.correctFastStreak + 1 : 0,
        },
      };
    });
  }

  function applyPracticeMemoryItems(items: PracticeMemoryItem[]): void {
    setPracticeMemory((previous) => {
      const nextMemory = recordPracticeMemoryItems(previous, items);
      savePracticeMemory(nextMemory);
      syncPracticeMemoryToDevServer(nextMemory);
      return nextMemory;
    });
  }

  function resetPracticeWithMemory(nextMemory: PracticeMemoryDocumentV1): void {
    cancelAutoAdvance();
    setQuestions(createQuestionSet(config, nextMemory));
    setCurrentIndex(0);
    setRecords([]);
    setAnsweredRecord(null);
    setSelectedAnswerPositions([]);
    setMasteredAnswerPositions([]);
    setPositionPracticeStats({});
    setQuestionStartedAt(performance.now());
    setPositionStartedAt(performance.now());
  }

  function handleExportPracticeMemory(): void {
    const blob = new Blob([exportPracticeMemory(practiceMemory)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createPracticeMemoryFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportPracticeMemoryFile(file: File): void {
    file.text()
      .then((text) => {
        const importedMemory = parsePracticeMemoryJson(text);
        savePracticeMemory(importedMemory);
        syncPracticeMemoryToDevServer(importedMemory);
        setPracticeMemory(importedMemory);
        resetPracticeWithMemory(importedMemory);
      })
      .catch(() => {
        window.alert('练习数据导入失败，请确认 JSON 文件来自 Guitar Lab。');
      });
  }

  function handleClearPracticeMemory(): void {
    const nextMemory = clearPracticeMemory();
    syncPracticeMemoryToDevServer(nextMemory);
    setPracticeMemory(nextMemory);
    resetPracticeWithMemory(nextMemory);
  }

  function goToNextQuestion(): void {
    cancelAutoAdvance();
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setAnsweredRecord(null);
    setSelectedAnswerPositions([]);
    setMasteredAnswerPositions([]);
    setQuestionStartedAt(performance.now());
    setPositionStartedAt(performance.now());
  }

  function replayCurrentPitch(): void {
    if (currentQuestion !== undefined) {
      playPositionPitch(currentQuestion.position, guitarTone).catch(() => {
        // 用户设备或浏览器禁用音频时，不影响答题流程。
      });
    }
  }

  function playFretboardPosition(position: FretPosition): void {
    playPositionPitch(position, guitarTone).catch(() => {
      // 点击指板发音是辅助能力，失败时不阻塞练习。
    });
  }

  function handleMemoryPositionClick(position: FretPosition): void {
    setSelectedMemoryPosition(position);
    playFretboardPosition(position);
  }

  function handleWeaknessPositionClick(position: FretPosition): void {
    setSelectedWeaknessPosition(position);
    playFretboardPosition(position);
  }

  return (
    <main className="min-h-screen bg-[#11131d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-3">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-guitar-accent">Guitar Lab</p>
              <span className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-300">
                v{APP_VERSION}
              </span>
              <span
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-400"
                title="当前页面构建来源"
              >
                {BUILD_LABEL}
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-normal text-slate-50 md:text-xl">位置、音名、唱名反应训练</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePracticeViewClick}
              className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                activeView === 'practice'
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              练习
            </button>
            <button
              type="button"
              onClick={() => setActiveView('reference')}
              className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                activeView === 'reference'
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              速查
            </button>
            {KEY_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyChange(key)}
                className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                  config.key === key
                    ? 'border-guitar-accent bg-guitar-accent text-white'
                    : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {key === 'G major' ? 'G 大调' : 'C 大调'}
              </button>
            ))}
            <SolfeggioDisplayModeSelector
              activeMode={solfeggioDisplayMode}
              onModeChange={setSolfeggioDisplayMode}
            />
            <GuitarToneSelector
              activeTone={guitarTone}
              onToneChange={setGuitarTone}
            />
          </div>
        </header>

        {activeView === 'reference' ? (
          <FretboardMemoryView
            practiceKey={config.key}
            solfeggioDisplayMode={solfeggioDisplayMode}
            markerMode={markerMode}
            showOutOfKeyNotes={showOutOfKeyNotes}
            selectedPosition={selectedMemoryPosition}
            hoveredNote={hoveredMemoryNote}
            onMarkerModeChange={setMarkerMode}
            onShowOutOfKeyNotesChange={setShowOutOfKeyNotes}
            onHoveredNoteChange={setHoveredMemoryNote}
            onPositionClick={handleMemoryPositionClick}
          />
        ) : (
          <div className="space-y-5">
            <PracticePathSelector
              activeModeId={config.modeId}
              subView={practiceSubView}
              solfeggioDisplayMode={solfeggioDisplayMode}
              onPathSelect={handlePracticePathSelect}
              onStartPractice={handleStartPractice}
              onShowWeakness={handleShowPracticeWeakness}
            />
            {practiceSubView === 'weakness' ? (
              <WeaknessMapView
                modeId={config.modeId}
                practiceKey={config.key}
                memory={practiceMemory}
                solfeggioDisplayMode={solfeggioDisplayMode}
                selectedPosition={selectedWeaknessPosition}
                pathLabel={getPracticePathOption(config.modeId).label}
                onPositionClick={handleWeaknessPositionClick}
              />
            ) : isFinished ? (
              <section className="grid flex-1 place-items-center">
                <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-white/10 p-6">
                  <p className="text-sm text-slate-400">练习完成</p>
                  <h2 className="mt-2 text-2xl font-bold">本轮总结</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <SummaryItem label="正确率" value={formatPercent(summary.accuracy)} />
                    <SummaryItem label="平均反应" value={formatMs(summary.averageResponseMs)} />
                    <SummaryItem label="慢反应题" value={`${summary.slowCount} 题`} />
                    <SummaryItem
                      label="F# 相关正确率"
                      value={summary.focusAccuracy === null ? '暂无' : formatPercent(summary.focusAccuracy)}
                    />
                  </div>

                  {summary.weakest.length > 0 && (
                    <div className="mt-5 rounded-md bg-black/20 p-4">
                      <p className="text-sm font-semibold text-slate-200">最需要巩固</p>
                      <div className="mt-3 space-y-2">
                        {summary.weakest.map((record) => (
                          <p key={`${record.question.id}-${record.responseMs}`} className="text-sm text-slate-300">
                            {formatPosition(record.question.position)}：{record.question.noteName} / {formatSolfeggio(record.question.solfeggio, solfeggioDisplayMode)}
                            ，{record.isCorrect ? '答对但偏慢' : '答错'}，耗时 {formatMs(record.responseMs)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {memoryHighlights.length > 0 && (
                    <div className="mt-5 rounded-md border border-guitar-accent/30 bg-guitar-accent/10 p-4">
                      <p className="text-sm font-semibold text-slate-100">本轮重点</p>
                      <div className="mt-3 space-y-2">
                        {memoryHighlights.map((highlight) => (
                          <p key={highlight.itemKey} className="text-sm leading-6 text-slate-300">
                            {highlight.label}：弱点分 {highlight.weaknessScore}
                            {highlight.responseMs === null ? '' : `，最近 ${formatMs(highlight.responseMs)}`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-md bg-black/20 p-4">
                    <p className="text-sm font-semibold text-slate-200">练习数据</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      数据保存在本机浏览器中，也可以导出 JSON 备份或交给 Codex 分析。
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={handleExportPracticeMemory}
                        className="h-10 rounded-md border border-white/15 bg-white/10 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
                      >
                        导出 JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => importInputRef.current?.click()}
                        className="h-10 rounded-md border border-white/15 bg-white/10 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
                      >
                        导入 JSON
                      </button>
                      <button
                        type="button"
                        onClick={handleClearPracticeMemory}
                        className="h-10 rounded-md border border-rose-300/30 bg-rose-400/10 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
                      >
                        清空记忆
                      </button>
                    </div>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        if (file !== undefined) {
                          handleImportPracticeMemoryFile(file);
                        }
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => restartPractice()}
                    className="mt-6 h-11 w-full rounded-md bg-white text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    再练一轮
                  </button>
                </div>
              </section>
            ) : (
              currentQuestion && (
                <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-5">
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        第 {currentIndex + 1} / {questions.length} 题
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{currentQuestion.prompt}</h2>
                    </div>
                    <div className="rounded-md bg-black/25 px-3 py-2 text-sm text-slate-300">
                      {config.key === 'G major' ? 'G 大调' : 'C 大调'} · {formatRange(config)} · {getPracticeModeLabel(config.modeId)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  {currentQuestion.sourceMedium === 'board' && (
                    <Fretboard
                      fretCount={config.fretRange[1]}
                      highlightedPosition={currentQuestion.position}
                      onPositionClick={playFretboardPosition}
                    />
                  )}
                  {currentQuestion.sourceMedium === 'tab' && (
                    <Tablature position={currentQuestion.position} />
                  )}
                  {currentQuestion.sourceMedium === 'note' && (
                    <div className="grid min-h-[220px] place-items-center rounded-lg bg-[#171420]">
                      <div className="text-center">
                        <p className="text-sm text-slate-500">音名</p>
                        <p className="mt-3 text-7xl font-bold text-white">{currentQuestion.noteName}</p>
                        <p className="mt-3 text-sm text-slate-400">
                          {currentQuestion.answerKind === 'positions'
                            ? `在${formatRange(config)}内找出所有 ${currentQuestion.noteName}`
                            : `${currentQuestion.key === 'G major' ? 'G 大调' : 'C 大调'}中唱什么？`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {currentQuestion.answerKind === 'positions' && (
                  <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Answer</p>
                        <h3 className="mt-1 text-lg font-semibold">选择所有位置</h3>
                      </div>
                      <p className="text-sm text-slate-500">空指板</p>
                    </div>
                    <Fretboard
                      fretCount={config.fretRange[1]}
                      selectedPositions={answeredRecord === null ? selectedAnswerPositions : []}
                      positionStates={getAnswerPositionStates(currentQuestion, selectedAnswerPositions, answeredRecord)}
                      getPositionLabel={(position) => getMasteredPositionLabel(currentQuestion, masteredAnswerPositions, position)}
                      onPositionClick={handlePositionAnswerClick}
                    />
                  </div>
                )}

                {currentQuestion.answerKind !== 'positions' && (
                  <PracticeAnswerPanel answerKind={currentQuestion.answerKind}>
                    {currentQuestion.answerKind === 'note' ? (
                      <NoteSelector disabled={answeredRecord !== null} onSubmit={handleAnswer} />
                    ) : (
                      <SolfeggioSelector
                        disabled={answeredRecord !== null}
                        displayMode={solfeggioDisplayMode}
                        onSubmit={handleAnswer}
                      />
                    )}
                  </PracticeAnswerPanel>
                )}
              </div>

              <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">练习详情</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {currentQuestion.answerKind === 'note'
                      ? '在下方作答区一键选择音名，右侧保留音频、反馈和统计。'
                      : currentQuestion.answerKind === 'positions'
                        ? '点击空指板上的目标音，系统会立即判定。'
                        : `在下方作答区选择当前调唱名，G 大调里 D 是 ${formatSolfeggio('Sol', solfeggioDisplayMode)}。`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={replayCurrentPitch}
                  className="h-10 rounded-md border border-white/15 bg-white/8 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
                >
                  播放音高
                </button>

                {currentQuestion.answerKind === 'positions' && (
                  <PositionHuntPanel
                    foundCount={selectedAnswerPositions.length}
                    targetCount={positionsToClick.length}
                    masteredCount={masteredAnswerPositions.length}
                    isComplete={answeredRecord !== null}
                  />
                )}

                {answeredRecord && (
                  <FeedbackPanel
                    record={answeredRecord}
                    solfeggioDisplayMode={solfeggioDisplayMode}
                    onNext={goToNextQuestion}
                    onReplay={() => playPositionPitch(answeredRecord.question.position, guitarTone)}
                    isLast={currentIndex === questions.length - 1}
                  />
                )}

                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                  <MiniStat label="已答" value={`${records.length}`} />
                  <MiniStat label="正确" value={`${summary.correct}`} />
                  <MiniStat label="正确率" value={records.length === 0 ? '-' : formatPercent(summary.accuracy)} />
                </div>
              </aside>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

interface FeedbackPanelProps {
  record: AnswerRecord;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  isLast: boolean;
  onNext: () => void;
  onReplay: () => Promise<void>;
}

interface PracticePathSelectorProps {
  activeModeId: PracticeModeId;
  subView: PracticeSubView;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  onPathSelect: (modeId: PracticeModeId) => void;
  onStartPractice: () => void;
  onShowWeakness: () => void;
}

function PracticePathSelector({
  activeModeId,
  subView,
  solfeggioDisplayMode,
  onPathSelect,
  onStartPractice,
  onShowWeakness,
}: PracticePathSelectorProps) {
  const activePath = getPracticePathOption(activeModeId);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

  function handleGraphPathSelect(modeId: PracticeModeId): void {
    onPathSelect(modeId);
    setIsGraphOpen(false);
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">练习模式</h2>
            <button
              type="button"
              onClick={() => setIsGraphOpen(true)}
              className="h-7 rounded-md border border-white/15 bg-white/8 px-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
            >
              图选
            </button>
          </div>

          <div className="flex w-fit overflow-hidden rounded-md border border-white/15 bg-black/20" role="tablist" aria-label="当前通路视图">
            <button
              type="button"
              onClick={onStartPractice}
              role="tab"
              aria-selected={subView === 'train'}
              className={`h-8 px-3 text-sm font-semibold transition ${
                subView === 'train'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-100 hover:bg-white/15'
              }`}
            >
              练习
            </button>
            <button
              type="button"
              onClick={onShowWeakness}
              disabled={!activePath.weaknessAvailable}
              role="tab"
              aria-selected={subView === 'weakness' && activePath.weaknessAvailable}
              className={`h-8 border-l border-white/15 px-3 text-sm font-semibold transition ${
                subView === 'weakness' && activePath.weaknessAvailable
                  ? 'bg-guitar-accent text-white'
                  : activePath.weaknessAvailable
                    ? 'text-slate-100 hover:bg-white/15'
                    : 'cursor-not-allowed text-slate-500'
              }`}
            >
              {activePath.weaknessAvailable ? '查看弱点' : '暂无弱点'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRACTICE_PATH_OPTIONS.map((path) => (
            <button
              key={path.id}
              type="button"
              onClick={() => onPathSelect(path.id)}
              title={path.description}
              className={`h-8 rounded-md border px-3 text-sm font-semibold transition ${
                activeModeId === path.id
                  ? 'border-guitar-accent bg-guitar-accent text-white'
                  : 'border-white/15 bg-white/8 text-slate-200 hover:bg-white/15'
              }`}
              aria-pressed={activeModeId === path.id}
            >
              {getPracticeModeLabel(path.id)}
            </button>
          ))}
        </div>
      </div>

      {isGraphOpen && (
        <PracticePathGraphDialog
          activeModeId={activeModeId}
          solfeggioDisplayMode={solfeggioDisplayMode}
          onPathSelect={handleGraphPathSelect}
          onClose={() => setIsGraphOpen(false)}
        />
      )}
    </div>
  );
}

interface PracticePathGraphDialogProps {
  activeModeId: PracticeModeId;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  onPathSelect: (modeId: PracticeModeId) => void;
  onClose: () => void;
}

function PracticePathGraphDialog({
  activeModeId,
  solfeggioDisplayMode,
  onPathSelect,
  onClose,
}: PracticePathGraphDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="练习通路图"
        className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-white/15 bg-[#202330] p-4 shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Path Graph</p>
            <h2 className="mt-1 text-xl font-bold text-slate-50">选择练习通路</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              在图上点击一条边，切换要强化的认知反应路径。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
          >
            关闭
          </button>
        </div>

        <PracticePathGraph
          activeModeId={activeModeId}
          solfeggioDisplayMode={solfeggioDisplayMode}
          onPathSelect={onPathSelect}
        />
      </div>
    </div>
  );
}

interface PracticePathGraphProps {
  activeModeId: PracticeModeId;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  onPathSelect: (modeId: PracticeModeId) => void;
}

function PracticePathGraph({ activeModeId, solfeggioDisplayMode, onPathSelect }: PracticePathGraphProps) {
  return (
    <div className="relative mt-4 min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-[#151724] p-3">
      <svg
        viewBox="0 0 900 520"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <marker id="practice-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" />
          </marker>
          <marker id="practice-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#ff4f7b" />
          </marker>
        </defs>
        <PracticePathLine active={activeModeId === 'tab-to-note'} d="M 450 122 L 450 320" />
        <PracticePathLine active={activeModeId === 'tab-to-solfeggio'} d="M 475 122 C 615 170 700 225 735 320" />
        <PracticePathLine active={activeModeId === 'board-to-note'} d="M 230 360 L 410 360" />
        <PracticePathLine active={activeModeId === 'note-to-positions'} d="M 410 316 C 320 245 260 245 230 316" />
        <PracticePathLine active={activeModeId === 'note-to-solfeggio'} d="M 490 360 L 670 360" />
        <PracticePathLine active={activeModeId === 'board-to-solfeggio'} d="M 220 400 C 390 490 555 490 720 400" />
      </svg>

      <PracticeGraphNode left="50%" top="16%" label="六线谱" helper="六条线" />
      <PracticeGraphNode left="20%" top="70%" label="指板位置" helper="弦 + 品" />
      <PracticeGraphNode left="50%" top="70%" label="音名" helper="C D E" />
      <PracticeGraphNode
        left="80%"
        top="70%"
        label="唱名"
        helper={solfeggioDisplayMode === 'number' ? '1 2 3' : 'Do Re Mi'}
      />

      <button
        type="button"
        onClick={() => onPathSelect('mixed')}
        className={`absolute bottom-4 left-4 z-30 h-10 rounded-md border px-4 text-sm font-semibold transition ${
          activeModeId === 'mixed'
            ? 'border-guitar-accent bg-guitar-accent text-white'
            : 'border-white/15 bg-white/10 text-slate-100 hover:bg-white/20'
        }`}
        aria-pressed={activeModeId === 'mixed'}
      >
        综合练习
      </button>

      {PRACTICE_PATH_OPTIONS
        .filter((path) => path.edgePosition !== undefined)
        .map((path) => (
          <button
            key={path.id}
            type="button"
            onClick={() => onPathSelect(path.id)}
            title={path.description}
            className={`absolute z-30 min-h-9 max-w-[130px] -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs font-semibold leading-4 shadow-lg transition ${
              activeModeId === path.id
                ? 'border-guitar-accent bg-guitar-accent text-white'
                : 'border-white/15 bg-[#222637] text-slate-100 hover:border-white/35 hover:bg-[#2d3248]'
            }`}
            style={{
              left: path.edgePosition?.left,
              top: path.edgePosition?.top,
            }}
            aria-pressed={activeModeId === path.id}
            aria-label={`选择通路：${path.label}`}
          >
            {path.label}
          </button>
        ))}
    </div>
  );
}

interface PracticePathLineProps {
  active: boolean;
  d: string;
}

function PracticePathLine({ active, d }: PracticePathLineProps) {
  return (
    <path
      d={d}
      fill="none"
      stroke={active ? '#ff4f7b' : '#64748b'}
      strokeWidth={active ? 4 : 2}
      strokeLinecap="round"
      markerEnd={active ? 'url(#practice-arrow-active)' : 'url(#practice-arrow)'}
      opacity={active ? 1 : 0.62}
    />
  );
}

interface PracticeGraphNodeProps {
  left: string;
  top: string;
  label: string;
  helper: string;
}

function PracticeGraphNode({ left, top, label, helper }: PracticeGraphNodeProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 grid h-[72px] w-[116px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border border-white/15 bg-[#232738] px-3 text-center shadow-xl"
      style={{ left, top }}
    >
      <div>
        <p className="text-sm font-bold text-slate-50">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

interface PracticeAnswerPanelProps {
  answerKind: 'note' | 'solfeggio';
  children: ReactNode;
}

function PracticeAnswerPanel({ answerKind, children }: PracticeAnswerPanelProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Answer</p>
          <h3 className="mt-1 text-lg font-semibold">
            {answerKind === 'note' ? '选择音名' : '选择唱名'}
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          一键作答，答完后右侧查看反馈。
        </p>
      </div>
      {children}
    </div>
  );
}

interface SolfeggioDisplayModeSelectorProps {
  activeMode: SolfeggioDisplayMode;
  onModeChange: (mode: SolfeggioDisplayMode) => void;
}

function SolfeggioDisplayModeSelector({ activeMode, onModeChange }: SolfeggioDisplayModeSelectorProps) {
  const options: Array<{ id: SolfeggioDisplayMode; label: string }> = [
    { id: 'syllable', label: 'Do Re Mi' },
    { id: 'number', label: '1 2 3' },
  ];

  return (
    <div className="flex h-9 overflow-hidden rounded-md border border-white/15 bg-white/8">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onModeChange(option.id)}
          className={`px-3 text-sm font-semibold transition ${
            activeMode === option.id
              ? 'bg-white text-slate-950'
              : 'text-slate-200 hover:bg-white/15'
          }`}
          aria-pressed={activeMode === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface GuitarToneSelectorProps {
  activeTone: GuitarToneId;
  onToneChange: (toneId: GuitarToneId) => void;
}

function GuitarToneSelector({ activeTone, onToneChange }: GuitarToneSelectorProps) {
  const options: Array<{ id: GuitarToneId; label: string }> = [
    { id: 'clean-electric', label: 'Clean' },
    { id: 'emilyguitar', label: 'Emily' },
  ];

  return (
    <div className="flex h-9 overflow-hidden rounded-md border border-white/15 bg-white/8">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onToneChange(option.id)}
          className={`px-3 text-sm font-semibold transition ${
            activeTone === option.id
              ? 'bg-guitar-accent text-white'
              : 'text-slate-200 hover:bg-white/15'
          }`}
          aria-pressed={activeTone === option.id}
          title={option.id === 'clean-electric' ? 'FreePats 干净电吉他' : 'Karoryfer Emilyguitar'}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface PositionHuntPanelProps {
  foundCount: number;
  targetCount: number;
  masteredCount: number;
  isComplete: boolean;
}

function PositionHuntPanel({ foundCount, targetCount, masteredCount, isComplete }: PositionHuntPanelProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-semibold text-slate-200">
        已找到 {foundCount} / {targetCount}
      </p>
      {masteredCount > 0 && (
        <p className="mt-2 text-sm leading-6 text-slate-400">
          已提示的 {masteredCount} 个位置已用音名圆点标出。
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {isComplete ? '本题已结束，观察反馈后进入下一题。' : '点对会立刻标记，全对后自动进入下一题；点错会结束本题并揭示答案。'}
      </p>
    </div>
  );
}

function FeedbackPanel({ record, solfeggioDisplayMode, isLast, onNext, onReplay }: FeedbackPanelProps) {
  const { question } = record;
  const isPositionAnswer = question.answerKind === 'positions';

  return (
    <div className={`rounded-lg border p-4 ${record.isCorrect ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-rose-400/40 bg-rose-400/10'}`}>
      <p className="text-lg font-bold">{record.isCorrect ? '答对了' : '再记一次'}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-200">
        <p>你的答案：{formatAnswerValue(record.userAnswer, solfeggioDisplayMode)}</p>
        <p>正确答案：{formatAnswerValue(question.answer, solfeggioDisplayMode)}</p>
        {!isPositionAnswer && <p>位置：{formatPosition(question.position)}</p>}
        <p>音名：{question.noteName}</p>
        <p>{question.key === 'G major' ? 'G 大调' : 'C 大调'}唱名：{formatSolfeggio(question.solfeggio, solfeggioDisplayMode)}</p>
        {isPositionAnswer ? (
          <>
            {record.missedPositions.length > 0 && <p>漏点：{formatPositions(record.missedPositions)}</p>}
            {record.extraPositions.length > 0 && <p>误点：{formatPositions(record.extraPositions)}</p>}
          </>
        ) : (
          <p>
            反应链：{formatPosition(question.position)} {'->'} {question.noteName} {'->'} {formatSolfeggio(question.solfeggio, solfeggioDisplayMode)}
          </p>
        )}
        <p>耗时：{formatMs(record.responseMs)}{record.isSlow ? '，需要巩固' : ''}</p>
      </div>

      <button
        type="button"
        onClick={() => {
          onReplay().catch(() => {
            // 音频失败不阻塞下一题。
          });
        }}
        className="mt-4 h-10 w-full rounded-md border border-white/15 bg-white/10 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
      >
        重播音高
      </button>

      <button
        type="button"
        onClick={onNext}
        className="mt-3 h-10 w-full rounded-md bg-white text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
      >
        {isLast ? '查看总结' : '下一题'}
      </button>
    </div>
  );
}

interface FretboardMemoryViewProps {
  practiceKey: PracticeKey;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  markerMode: FretboardMarkerMode;
  showOutOfKeyNotes: boolean;
  selectedPosition: FretPosition | null;
  hoveredNote: SharpNoteName | null;
  onMarkerModeChange: (mode: FretboardMarkerMode) => void;
  onShowOutOfKeyNotesChange: (show: boolean) => void;
  onHoveredNoteChange: (noteName: SharpNoteName | null) => void;
  onPositionClick: (position: FretPosition) => void;
}

function FretboardMemoryView({
  practiceKey,
  solfeggioDisplayMode,
  markerMode,
  showOutOfKeyNotes,
  selectedPosition,
  hoveredNote,
  onMarkerModeChange,
  onShowOutOfKeyNotesChange,
  onHoveredNoteChange,
  onPositionClick,
}: FretboardMemoryViewProps) {
  const mapping = getKeySolfeggioMap(practiceKey);
  const selectedNote = selectedPosition === null ? null : getNoteAtPosition(selectedPosition);
  const selectedSolfeggio = selectedNote === null ? null : getSolfeggioInKey(selectedNote, practiceKey);

  function getPositionLabel(position: FretPosition): FretboardPositionLabel | null {
    const noteName = getNoteAtPosition(position);
    const inKey = isNoteInKey(noteName, practiceKey);

    if (!showOutOfKeyNotes && !inKey) {
      return null;
    }

    const noteColor = NOTE_COLORS[noteName];
    const muted = hoveredNote !== null && hoveredNote !== noteName;

    if (markerMode === 'note') {
      return {
        text: noteName,
        tone: noteName.includes('#') ? 'accidental' : 'natural',
        fill: noteColor.softFill,
        stroke: noteColor.stroke,
        textColor: noteColor.text,
        muted,
      };
    }

    const solfeggio = getSolfeggioInKey(noteName, practiceKey);

    return solfeggio === null
      ? null
      : {
          text: formatSolfeggio(solfeggio, solfeggioDisplayMode),
          tone: noteName.includes('#') ? 'accidental' : 'natural',
          fill: noteColor.softFill,
          stroke: noteColor.stroke,
          textColor: noteColor.text,
          muted,
        };
  }

  return (
    <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fretboard Memory</p>
              <h2 className="mt-2 text-xl font-semibold">随时打开的指板记忆</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                点击任意位置听音高。切换音名或首调唱名标记，观察同一个位置在当前大调里的功能。
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onMarkerModeChange('note')}
                className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                  markerMode === 'note'
                    ? 'border-guitar-accent bg-guitar-accent text-white'
                    : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                音名标记
              </button>
              <button
                type="button"
                onClick={() => onMarkerModeChange('solfeggio')}
                className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                  markerMode === 'solfeggio'
                    ? 'border-guitar-accent bg-guitar-accent text-white'
                    : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                唱名标记
              </button>
            </div>
          </div>

          {markerMode === 'note' && (
            <label className="mt-4 flex w-fit items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={showOutOfKeyNotes}
                onChange={(event) => onShowOutOfKeyNotesChange(event.currentTarget.checked)}
                className="h-4 w-4 accent-guitar-accent"
              />
              显示非当前大调内音
            </label>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <Fretboard
            fretCount={5}
            selectedPositions={selectedPosition === null ? [] : [selectedPosition]}
            getPositionLabel={getPositionLabel}
            onPositionClick={onPositionClick}
          />
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            {practiceKey === 'G major' ? 'G 大调' : 'C 大调'}音名 / 唱名映射
          </p>
          <p className="mt-1 text-sm text-slate-500">
            两排一起看，专门练“音名 {'->'} 当前调唱名”的反应。
          </p>
        </div>

        <div className="space-y-2 rounded-lg bg-black/20 p-3">
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-2">
            <div className="grid place-items-center text-xs text-slate-500">音名</div>
            {mapping.map((item) => (
              <MappingCell
                key={item.noteName}
                value={item.noteName}
                active={selectedNote === item.noteName}
                color={NOTE_COLORS[item.noteName]}
                onHoverStart={() => onHoveredNoteChange(item.noteName)}
                onHoverEnd={() => onHoveredNoteChange(null)}
              />
            ))}
          </div>
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-2">
            <div className="grid place-items-center text-xs text-slate-500">唱名</div>
            {mapping.map((item) => (
              <MappingCell
                key={item.solfeggio}
                value={formatSolfeggio(item.solfeggio, solfeggioDisplayMode)}
                active={selectedSolfeggio === item.solfeggio}
                color={NOTE_COLORS[item.noteName]}
                onHoverStart={() => onHoveredNoteChange(item.noteName)}
                onHoverEnd={() => onHoveredNoteChange(null)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4">
          <p className="text-sm font-semibold text-slate-200">当前点击</p>
          {selectedPosition === null || selectedNote === null ? (
            <p className="mt-2 text-sm text-slate-500">点击指板上的任意位置。</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>位置：{formatPosition(selectedPosition)}</p>
              <p>音名：{selectedNote}</p>
              <p>
                {practiceKey === 'G major' ? 'G 大调' : 'C 大调'}唱名：
                {selectedSolfeggio === null ? '调外音' : formatSolfeggio(selectedSolfeggio, solfeggioDisplayMode)}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4 text-sm leading-6 text-slate-400">
          <p className="font-semibold text-slate-200">使用建议</p>
          <p className="mt-2">
            先用音名标记确认位置，再切到唱名标记。特别留意 G 大调里 D = {formatSolfeggio('Sol', solfeggioDisplayMode)}，F# = {formatSolfeggio('Si', solfeggioDisplayMode)}。
          </p>
        </div>
      </aside>
    </section>
  );
}

interface WeaknessMapViewProps {
  modeId: PracticeModeId;
  practiceKey: PracticeKey;
  memory: PracticeMemoryDocumentV1;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  selectedPosition: FretPosition | null;
  pathLabel: string;
  onPositionClick: (position: FretPosition) => void;
}

const WEAKNESS_STATUS_LABELS: Record<WeaknessStatus, string> = {
  danger: '易错',
  slow: '偏慢',
  practiced: '有记录',
  mastered: '熟练',
};

function getWeaknessLabel(entry: WeaknessMapEntry): FretboardPositionLabel {
  if (entry.status === 'danger') {
    return {
      text: entry.noteName,
      tone: 'neutral',
      fill: '#9f1239',
      stroke: '#fb7185',
      textColor: '#ffffff',
    };
  }

  if (entry.status === 'slow') {
    return {
      text: entry.noteName,
      tone: 'neutral',
      fill: '#b45309',
      stroke: '#fbbf24',
      textColor: '#ffffff',
    };
  }

  const noteColor = NOTE_COLORS[entry.noteName];

  return {
    text: entry.noteName,
    tone: entry.noteName.includes('#') ? 'accidental' : 'natural',
    fill: entry.status === 'mastered' ? noteColor.softFill : '#334155',
    stroke: entry.status === 'mastered' ? noteColor.stroke : '#94a3b8',
    textColor: entry.status === 'mastered' ? noteColor.text : '#e2e8f0',
    muted: entry.status === 'mastered',
  };
}

interface NoteSolfeggioWeaknessViewProps {
  practiceKey: PracticeKey;
  memory: PracticeMemoryDocumentV1;
  solfeggioDisplayMode: SolfeggioDisplayMode;
  pathLabel: string;
}

function NoteSolfeggioWeaknessView({
  practiceKey,
  memory,
  solfeggioDisplayMode,
  pathLabel,
}: NoteSolfeggioWeaknessViewProps) {
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const entries = getNoteSolfeggioWeaknessEntries(memory, practiceKey);
  const entryByNoteName = new Map(entries.map((entry) => [entry.noteName, entry]));
  const topEntries = sortNoteSolfeggioWeaknessEntries(entries)
    .filter((entry) => entry.status === 'danger' || entry.status === 'slow')
    .slice(0, 5);
  const weakCount = entries.filter((entry) => entry.status === 'danger' || entry.status === 'slow').length;
  const masteredCount = entries.filter((entry) => entry.status === 'mastered').length;
  const selectedEntry = selectedItemKey === null
    ? topEntries[0] ?? entries[0] ?? null
    : entries.find((entry) => entry.itemKey === selectedItemKey) ?? null;
  const mapping = getKeySolfeggioMap(practiceKey);

  function getStatusClass(status: WeaknessStatus): string {
    if (status === 'danger') {
      return 'border-rose-300/50 bg-rose-500/20 text-rose-50';
    }

    if (status === 'slow') {
      return 'border-amber-300/50 bg-amber-500/20 text-amber-50';
    }

    if (status === 'mastered') {
      return 'border-emerald-300/40 bg-emerald-500/15 text-emerald-50';
    }

    return 'border-white/10 bg-black/20 text-slate-200';
  }

  return (
    <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Weakness Map</p>
              <h2 className="mt-2 text-xl font-semibold">音名唱名弱点地图</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                以“当前调 · 音名 {'->'} 唱名”为粒度统计。暖色代表近期相对更需要复习，熟练项会降权但保留少量复查机会。
              </p>
            </div>
            <div className="rounded-md bg-black/25 px-3 py-2 text-sm text-slate-300">
              {practiceKey === 'G major' ? 'G 大调' : 'C 大调'} · {pathLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="有记录映射" value={`${entries.length}`} />
            <SummaryItem label="近期关注" value={`${weakCount}`} />
            <SummaryItem label="熟练映射" value={`${masteredCount}`} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          {entries.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center rounded-lg bg-black/20 px-5 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-100">还没有音名唱名记录</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  去“练习”里选择音名唱名，完成几题后这里会显示慢反应、错答和熟练映射。
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {mapping.map((item) => {
                const entry = entryByNoteName.get(item.noteName);
                const status = entry?.status ?? 'practiced';
                const noteColor = NOTE_COLORS[item.noteName];
                const isSelected = selectedEntry?.noteName === item.noteName;

                return (
                  <button
                    key={item.noteName}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (entry !== undefined) {
                        setSelectedItemKey(entry.itemKey);
                      }
                    }}
                    className={`min-h-[128px] rounded-lg border p-4 text-left transition hover:bg-white/10 ${getStatusClass(status)} ${isSelected ? 'ring-2 ring-white/70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-current/65">Mapping</p>
                        <p className="mt-2 text-2xl font-bold">
                          {item.noteName} {'->'} {formatSolfeggio(item.solfeggio, solfeggioDisplayMode)}
                        </p>
                      </div>
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full border text-sm font-bold"
                        style={{
                          backgroundColor: noteColor.softFill,
                          borderColor: noteColor.stroke,
                          color: noteColor.text,
                        }}
                      >
                        {item.noteName}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-current/75">
                      {entry === undefined
                        ? '暂无记录'
                        : `${WEAKNESS_STATUS_LABELS[entry.status]} · 近期压力 ${entry.recentPressure.toFixed(1)} · 尝试 ${entry.attempts}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Top 5 弱点映射</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            按近期压力排序。这里看的是音名到唱名的反应，不绑定某个指板位置。
          </p>
        </div>

        <div className="space-y-2">
          {topEntries.length === 0 ? (
            <p className="rounded-lg bg-black/20 p-3 text-sm leading-6 text-slate-400">
              当前没有明显弱点。继续练几轮后，这里会优先显示需要复习的音名唱名映射。
            </p>
          ) : (
            topEntries.map((entry) => (
              <button
                key={entry.itemKey}
                type="button"
                onClick={() => setSelectedItemKey(entry.itemKey)}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {entry.noteName} {'->'} {formatWeaknessSolfeggio(entry.solfeggio, solfeggioDisplayMode)}
                  </p>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">
                    {WEAKNESS_STATUS_LABELS[entry.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  近期压力 {entry.recentPressure.toFixed(1)} · 弱点分 {entry.weaknessScore} · 历史慢 {entry.slowCount} · 历史错 {entry.wrongCount}
                  {entry.averageMs === null ? '' : ` · 平均 ${formatMs(entry.averageMs)}`}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4">
          <p className="text-sm font-semibold text-slate-200">当前映射</p>
          {selectedEntry === null ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">点击左侧任意映射查看详情。</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>音名/唱名：{selectedEntry.noteName} / {formatWeaknessSolfeggio(selectedEntry.solfeggio, solfeggioDisplayMode)}</p>
              <p>状态：{WEAKNESS_STATUS_LABELS[selectedEntry.status]}</p>
              <p>尝试：{selectedEntry.attempts}，正确 {selectedEntry.correctCount}，错误 {selectedEntry.wrongCount}</p>
              <p>近期压力：{selectedEntry.recentPressure.toFixed(1)}，弱点分 {selectedEntry.weaknessScore}</p>
              <p>历史慢速：{selectedEntry.slowCount}</p>
              <p>
                最近：{selectedEntry.lastMs === null ? '暂无' : formatMs(selectedEntry.lastMs)}
                {selectedEntry.averageMs === null ? '' : `，平均 ${formatMs(selectedEntry.averageMs)}`}
              </p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

function WeaknessMapView({
  modeId,
  practiceKey,
  memory,
  solfeggioDisplayMode,
  selectedPosition,
  pathLabel,
  onPositionClick,
}: WeaknessMapViewProps) {
  if (modeId === 'note-to-solfeggio') {
    return (
      <NoteSolfeggioWeaknessView
        practiceKey={practiceKey}
        memory={memory}
        solfeggioDisplayMode={solfeggioDisplayMode}
        pathLabel={pathLabel}
      />
    );
  }

  const mappingKind = getPositionWeaknessMappingKind(modeId);

  if (mappingKind === null) {
    return (
      <section className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/10 p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-100">当前通路暂无弱点地图</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">综合练习会混合多个通路，先切到具体练习后再查看对应弱点。</p>
        </div>
      </section>
    );
  }

  const copy = getPositionWeaknessCopy(modeId);
  const entries = getWeaknessEntries(memory, practiceKey, mappingKind);
  const offKeyEntries = getOffKeyMistakeEntries(memory, practiceKey, mappingKind);
  const topEntries = sortWeaknessEntries(entries)
    .filter((entry) => entry.status === 'danger' || entry.status === 'slow')
    .slice(0, 5);
  const entryByPositionId = new Map(entries.map((entry) => [getPositionId(entry.position), entry]));
  const selectedEntry = selectedPosition === null ? null : entryByPositionId.get(getPositionId(selectedPosition)) ?? null;
  const selectedNote = selectedPosition === null ? null : getNoteAtPosition(selectedPosition);
  const selectedSolfeggio = selectedNote === null ? null : getSolfeggioInKey(selectedNote, practiceKey);
  const weakCount = entries.filter((entry) => entry.status === 'danger' || entry.status === 'slow').length;
  const masteredCount = entries.filter((entry) => entry.status === 'mastered').length;
  const fretRange = getDefaultFretRangeForKey(practiceKey);

  function getPositionLabel(position: FretPosition): FretboardPositionLabel | null {
    const entry = entryByPositionId.get(getPositionId(position));
    return entry === undefined ? null : getWeaknessLabel(entry);
  }

  return (
    <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Weakness Map</p>
              <h2 className="mt-2 text-xl font-semibold">{copy.heading}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {copy.description}
              </p>
            </div>
            <div className="rounded-md bg-black/25 px-3 py-2 text-sm text-slate-300">
              {practiceKey === 'G major' ? 'G 大调' : 'C 大调'} · 0-{fretRange[1]} 品 · {pathLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="有记录位置" value={`${entries.length}`} />
            <SummaryItem label="近期关注" value={`${weakCount}`} />
            <SummaryItem label="熟练位置" value={`${masteredCount}`} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          {entries.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center rounded-lg bg-black/20 px-5 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-100">{copy.emptyTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {copy.emptyDescription}
                </p>
              </div>
            </div>
          ) : (
            <Fretboard
              fretCount={fretRange[1]}
              selectedPositions={selectedPosition === null ? [] : [selectedPosition]}
              getPositionLabel={getPositionLabel}
              onPositionClick={onPositionClick}
            />
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Top 5 弱点位置</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            按近期压力排序。远期历史会逐步淡出颜色判断，但仍保留在详情里。
          </p>
        </div>

        <div className="space-y-2">
          {topEntries.length === 0 ? (
            <p className="rounded-lg bg-black/20 p-3 text-sm leading-6 text-slate-400">
              当前没有明显弱点。继续练几轮后，这里会优先显示需要复习的位置。
            </p>
          ) : (
            topEntries.map((entry) => (
              <button
                key={entry.itemKey}
                type="button"
                onClick={() => onPositionClick(entry.position)}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {formatPosition(entry.position)} · {entry.noteName}/{formatWeaknessSolfeggio(entry.solfeggio, solfeggioDisplayMode)}
                  </p>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">
                    {WEAKNESS_STATUS_LABELS[entry.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  近期压力 {entry.recentPressure.toFixed(1)} · 弱点分 {entry.weaknessScore} · 历史慢 {entry.slowCount} · 历史错 {entry.wrongCount}
                  {entry.averageMs === null ? '' : ` · 平均 ${formatMs(entry.averageMs)}`}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4">
          <p className="text-sm font-semibold text-slate-200">当前点击</p>
          {selectedPosition === null || selectedNote === null ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">点击地图上的任意位置查看详情并播放音高。</p>
          ) : selectedEntry === null ? (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>位置：{formatPosition(selectedPosition)}</p>
              <p>音名：{selectedNote}</p>
              <p>{practiceKey === 'G major' ? 'G 大调' : 'C 大调'}唱名：{selectedSolfeggio === null ? '调外音' : formatSolfeggio(selectedSolfeggio, solfeggioDisplayMode)}</p>
              <p className="text-slate-500">{copy.noEntryText}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>位置：{formatPosition(selectedEntry.position)}</p>
              <p>音名/唱名：{selectedEntry.noteName} / {formatWeaknessSolfeggio(selectedEntry.solfeggio, solfeggioDisplayMode)}</p>
              <p>状态：{WEAKNESS_STATUS_LABELS[selectedEntry.status]}</p>
              <p>尝试：{selectedEntry.attempts}，正确 {selectedEntry.correctCount}，错误 {selectedEntry.wrongCount}</p>
              <p>近期压力：{selectedEntry.recentPressure.toFixed(1)}，弱点分 {selectedEntry.weaknessScore}</p>
              <p>历史慢速：{selectedEntry.slowCount}</p>
              <p>
                最近：{selectedEntry.lastMs === null ? '暂无' : formatMs(selectedEntry.lastMs)}
                {selectedEntry.averageMs === null ? '' : `，平均 ${formatMs(selectedEntry.averageMs)}`}
              </p>
            </div>
          )}
        </div>

        {offKeyEntries.length > 0 && (
          <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4">
            <p className="text-sm font-semibold text-rose-100">调外误触记录</p>
            <div className="mt-3 space-y-2">
              {offKeyEntries.slice(0, 4).map((entry) => (
                <p key={entry.itemKey} className="text-sm leading-6 text-rose-100/85">
                  {formatPosition(entry.position)} · {entry.noteName}，错误 {entry.wrongCount} 次
                </p>
              ))}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

interface MappingCellProps {
  value: string;
  active: boolean;
  color: {
    fill: string;
    stroke: string;
    text: string;
    softFill: string;
  };
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function MappingCell({ value, active, color, onHoverStart, onHoverEnd }: MappingCellProps) {
  return (
    <div
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      tabIndex={0}
      role="button"
      aria-label={`聚焦 ${value}`}
      className="grid h-10 place-items-center rounded-md border text-sm font-bold transition"
      style={{
        backgroundColor: active ? color.fill : color.softFill,
        borderColor: active ? '#ffffff' : color.stroke,
        color: color.text,
      }}
    >
      {value}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function SummaryItem({ label, value }: StatProps) {
  return (
    <div className="rounded-md bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: StatProps) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export default App;
