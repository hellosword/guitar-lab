import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION } from './appVersion';
import Fretboard from './components/Fretboard';
import type { FretboardPositionLabel, FretboardPositionState } from './components/Fretboard';
import NoteSelector from './components/NoteSelector';
import SolfeggioSelector from './components/SolfeggioSelector';
import Tablature from './components/Tablature';
import { playPositionPitch } from './lib/audio';
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
type AppView = 'practice' | 'memory' | 'weakness';
type FretboardMarkerMode = 'note' | 'solfeggio';

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

function formatPositions(positions: FretPosition[]): string {
  return positions.length === 0 ? '未选择' : positions.map(formatPosition).join('、');
}

function formatAnswerValue(answer: PracticeAnswerValue): string {
  return Array.isArray(answer) ? formatPositions(answer) : answer;
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

function toWeaknessMapEntry(entry: MasteryEntryV1, memory: PracticeMemoryDocumentV1): WeaknessMapEntry | null {
  if (entry.mappingKind !== 'note-to-position' || entry.noteName === undefined) {
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

function applyWeaknessMapStatuses(entries: WeaknessMapEntry[]): WeaknessMapEntry[] {
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

function getWeaknessEntries(memory: PracticeMemoryDocumentV1, practiceKey: PracticeKey): WeaknessMapEntry[] {
  const entries = Object.values(memory.masteryMap)
    .filter((entry) => entry.key === practiceKey)
    .map((entry) => toWeaknessMapEntry(entry, memory))
    .filter((entry): entry is WeaknessMapEntry => entry !== null)
    .filter((entry) => isNoteInKey(entry.noteName, practiceKey));

  return applyWeaknessMapStatuses(entries);
}

function getOffKeyMistakeEntries(memory: PracticeMemoryDocumentV1, practiceKey: PracticeKey): WeaknessMapEntry[] {
  return Object.values(memory.masteryMap)
    .filter((entry) => entry.key === practiceKey && entry.wrongCount > 0)
    .map((entry) => toWeaknessMapEntry(entry, memory))
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

function App() {
  const [activeView, setActiveView] = useState<AppView>('practice');
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
  const memoryHighlights = useMemo(() => getPracticeMemoryHighlights(practiceMemory), [practiceMemory]);
  const positionsToClick = currentQuestion === undefined ? [] : getPositionsToClick(currentQuestion, masteredAnswerPositions);

  useEffect(() => {
    savePracticeMemory(practiceMemory);
  }, [practiceMemory]);

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentQuestion === undefined) {
      return;
    }

    playPositionPitch(currentQuestion.position).catch(() => {
      // 浏览器可能在首次用户手势前阻止自动播放，此时保留手动重播按钮。
    });
  }, [currentQuestion]);

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
    restartPractice(config.key, nextModeId);
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
    }, PRACTICE_INTERACTION_CONFIG.positionHuntAutoAdvanceMs);
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
      scheduleAutoAdvance();
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
      playPositionPitch(currentQuestion.position).catch(() => {
        // 用户设备或浏览器禁用音频时，不影响答题流程。
      });
    }
  }

  function playFretboardPosition(position: FretPosition): void {
    playPositionPitch(position).catch(() => {
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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-guitar-accent">Guitar Lab MVP</p>
              <span className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-300">
                v{APP_VERSION}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-normal md:text-3xl">位置、音名、唱名反应训练</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              先把开放把位里的位置和 G/C 大调唱名练熟。答题后会同时显示位置、音名和唱名，重点补强 G 大调 F#。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView('practice')}
              className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                activeView === 'practice'
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              练习
            </button>
            <button
              type="button"
              onClick={() => setActiveView('memory')}
              className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                activeView === 'memory'
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              指板记忆
            </button>
            <button
              type="button"
              onClick={() => setActiveView('weakness')}
              className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                activeView === 'weakness'
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              弱点地图
            </button>
            {KEY_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyChange(key)}
                className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                  config.key === key
                    ? 'border-guitar-accent bg-guitar-accent text-white'
                    : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {key === 'G major' ? 'G 大调' : 'C 大调'}
              </button>
            ))}
          </div>
        </header>

        {activeView === 'weakness' ? (
          <WeaknessMapView
            practiceKey={config.key}
            memory={practiceMemory}
            selectedPosition={selectedWeaknessPosition}
            onPositionClick={handleWeaknessPositionClick}
          />
        ) : activeView === 'memory' ? (
          <FretboardMemoryView
            practiceKey={config.key}
            markerMode={markerMode}
            showOutOfKeyNotes={showOutOfKeyNotes}
            selectedPosition={selectedMemoryPosition}
            hoveredNote={hoveredMemoryNote}
            onMarkerModeChange={setMarkerMode}
            onShowOutOfKeyNotesChange={setShowOutOfKeyNotes}
            onHoveredNoteChange={setHoveredMemoryNote}
            onPositionClick={handleMemoryPositionClick}
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
                        {formatPosition(record.question.position)}：{record.question.noteName} / {record.question.solfeggio}
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
                <PracticeModeSelector
                  activeModeId={config.modeId}
                  onModeChange={handleModeChange}
                />

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
                    <p className="mb-3 text-sm text-slate-400">空指板</p>
                    <Fretboard
                      fretCount={config.fretRange[1]}
                      selectedPositions={answeredRecord === null ? selectedAnswerPositions : []}
                      positionStates={getAnswerPositionStates(currentQuestion, selectedAnswerPositions, answeredRecord)}
                      getPositionLabel={(position) => getMasteredPositionLabel(currentQuestion, masteredAnswerPositions, position)}
                      onPositionClick={handlePositionAnswerClick}
                    />
                  </div>
                )}

                {currentQuestion.sourceMedium === 'tab' && (
                  <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                    <p className="mb-3 text-sm text-slate-400">对应指板位置</p>
                    <Fretboard
                      fretCount={config.fretRange[1]}
                      highlightedPosition={currentQuestion.position}
                      onPositionClick={playFretboardPosition}
                    />
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {currentQuestion.answerKind === 'note'
                      ? '选择音名'
                      : currentQuestion.answerKind === 'positions'
                        ? '选择所有位置'
                        : '选择唱名'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {currentQuestion.answerKind === 'note'
                      ? '一键选择音名，先追求反应速度。'
                      : currentQuestion.answerKind === 'positions'
                        ? '点击空指板上的目标音，系统会立即判定。'
                        : '使用首调唱名，G 大调里 D 是 Sol。'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={replayCurrentPitch}
                  className="h-10 rounded-md border border-white/15 bg-white/8 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
                >
                  播放音高
                </button>

                {currentQuestion.answerKind === 'note' ? (
                  <NoteSelector disabled={answeredRecord !== null} onSubmit={handleAnswer} />
                ) : currentQuestion.answerKind === 'positions' ? (
                  <PositionHuntPanel
                    foundCount={selectedAnswerPositions.length}
                    targetCount={positionsToClick.length}
                    masteredCount={masteredAnswerPositions.length}
                    isComplete={answeredRecord !== null}
                  />
                ) : (
                  <SolfeggioSelector disabled={answeredRecord !== null} onSubmit={handleAnswer} />
                )}

                {answeredRecord && (
                  <FeedbackPanel
                    record={answeredRecord}
                    onNext={goToNextQuestion}
                    onReplay={() => playPositionPitch(answeredRecord.question.position)}
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
    </main>
  );
}

interface FeedbackPanelProps {
  record: AnswerRecord;
  isLast: boolean;
  onNext: () => void;
  onReplay: () => Promise<void>;
}

interface PracticeModeSelectorProps {
  activeModeId: PracticeModeId;
  onModeChange: (modeId: PracticeModeId) => void;
}

function PracticeModeSelector({ activeModeId, onModeChange }: PracticeModeSelectorProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Practice Mode</p>
          <h2 className="mt-1 text-lg font-semibold">练习模式</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRACTICE_MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                activeModeId === mode.id
                  ? 'border-guitar-accent bg-guitar-accent text-white'
                  : 'border-white/15 bg-white/8 text-slate-200 hover:bg-white/15'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
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

function FeedbackPanel({ record, isLast, onNext, onReplay }: FeedbackPanelProps) {
  const { question } = record;
  const isPositionAnswer = question.answerKind === 'positions';

  return (
    <div className={`rounded-lg border p-4 ${record.isCorrect ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-rose-400/40 bg-rose-400/10'}`}>
      <p className="text-lg font-bold">{record.isCorrect ? '答对了' : '再记一次'}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-200">
        <p>你的答案：{formatAnswerValue(record.userAnswer)}</p>
        <p>正确答案：{formatAnswerValue(question.answer)}</p>
        {!isPositionAnswer && <p>位置：{formatPosition(question.position)}</p>}
        <p>音名：{question.noteName}</p>
        <p>{question.key === 'G major' ? 'G 大调' : 'C 大调'}唱名：{question.solfeggio}</p>
        {isPositionAnswer ? (
          <>
            {record.missedPositions.length > 0 && <p>漏点：{formatPositions(record.missedPositions)}</p>}
            {record.extraPositions.length > 0 && <p>误点：{formatPositions(record.extraPositions)}</p>}
          </>
        ) : (
          <p>
            反应链：{formatPosition(question.position)} {'->'} {question.noteName} {'->'} {question.solfeggio}
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
          text: solfeggio,
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
                value={item.solfeggio}
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
                {selectedSolfeggio ?? '调外音'}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4 text-sm leading-6 text-slate-400">
          <p className="font-semibold text-slate-200">使用建议</p>
          <p className="mt-2">
            先用音名标记确认位置，再切到唱名标记。特别留意 G 大调里 D = Sol，F# = Si。
          </p>
        </div>
      </aside>
    </section>
  );
}

interface WeaknessMapViewProps {
  practiceKey: PracticeKey;
  memory: PracticeMemoryDocumentV1;
  selectedPosition: FretPosition | null;
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

function WeaknessMapView({ practiceKey, memory, selectedPosition, onPositionClick }: WeaknessMapViewProps) {
  const entries = getWeaknessEntries(memory, practiceKey);
  const offKeyEntries = getOffKeyMistakeEntries(memory, practiceKey);
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
              <h2 className="mt-2 text-xl font-semibold">随时查看的弱点地图</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                根据近期练习事件展示当前调性的音名定位压力。暖色代表近期相对更需要关注；历史慢错仍保留在详情里。
              </p>
            </div>
            <div className="rounded-md bg-black/25 px-3 py-2 text-sm text-slate-300">
              {practiceKey === 'G major' ? 'G 大调' : 'C 大调'} · 0-{fretRange[1]} 品 · 音名定位
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
                <p className="text-lg font-semibold text-slate-100">还没有音名定位记录</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  去“练习”里选择音名定位，完成几题后这里会显示慢点、错点和熟练点。
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
                    {formatPosition(entry.position)} · {entry.noteName}/{entry.solfeggio}
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
              <p>{practiceKey === 'G major' ? 'G 大调' : 'C 大调'}唱名：{selectedSolfeggio ?? '调外音'}</p>
              <p className="text-slate-500">这个位置还没有音名定位记录。</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>位置：{formatPosition(selectedEntry.position)}</p>
              <p>音名/唱名：{selectedEntry.noteName} / {selectedEntry.solfeggio}</p>
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
