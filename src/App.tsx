import { useEffect, useMemo, useState } from 'react';
import Fretboard from './components/Fretboard';
import type { FretboardPositionLabel } from './components/Fretboard';
import NoteSelector from './components/NoteSelector';
import SolfeggioSelector from './components/SolfeggioSelector';
import Tablature from './components/Tablature';
import { playPositionPitch } from './lib/audio';
import {
  formatPosition,
  getKeySolfeggioMap,
  getNoteAtPosition,
  getSolfeggioInKey,
  isNoteInKey,
  NOTE_COLORS,
} from './lib/theory';
import {
  createPracticeSummary,
  createQuestionSet,
  DEFAULT_MVP_CONFIG,
  isSlowAnswer,
} from './modules/fretboard-game/practiceSession';
import type { AnswerRecord, AnswerValue, MvpPracticeConfig, MvpQuestion } from './modules/fretboard-game/types';
import type { FretPosition, PracticeKey, SharpNoteName } from './types/theory';

const KEY_OPTIONS: PracticeKey[] = ['G major', 'C major'];
type AppView = 'practice' | 'memory';
type FretboardMarkerMode = 'note' | 'solfeggio';

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('practice');
  const [markerMode, setMarkerMode] = useState<FretboardMarkerMode>('note');
  const [showOutOfKeyNotes, setShowOutOfKeyNotes] = useState(false);
  const [selectedMemoryPosition, setSelectedMemoryPosition] = useState<FretPosition | null>(null);
  const [hoveredMemoryNote, setHoveredMemoryNote] = useState<SharpNoteName | null>(null);
  const [config, setConfig] = useState<MvpPracticeConfig>(DEFAULT_MVP_CONFIG);
  const [questions, setQuestions] = useState<MvpQuestion[]>(() => createQuestionSet(DEFAULT_MVP_CONFIG));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [answeredRecord, setAnsweredRecord] = useState<AnswerRecord | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(() => performance.now());

  const currentQuestion = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const summary = useMemo(() => createPracticeSummary(records), [records]);

  useEffect(() => {
    if (currentQuestion === undefined) {
      return;
    }

    playPositionPitch(currentQuestion.position).catch(() => {
      // 浏览器可能在首次用户手势前阻止自动播放，此时保留手动重播按钮。
    });
  }, [currentQuestion]);

  function restartPractice(nextKey = config.key): void {
    const nextConfig = { ...config, key: nextKey };
    setConfig(nextConfig);
    setQuestions(createQuestionSet(nextConfig));
    setCurrentIndex(0);
    setRecords([]);
    setAnsweredRecord(null);
    setQuestionStartedAt(performance.now());
  }

  function handleKeyChange(nextKey: PracticeKey): void {
    if (activeView === 'practice') {
      restartPractice(nextKey);
      return;
    }

    setConfig((previous) => ({ ...previous, key: nextKey }));
  }

  function handleAnswer(userAnswer: AnswerValue): void {
    if (answeredRecord !== null || currentQuestion === undefined) {
      return;
    }

    const responseMs = Math.round(performance.now() - questionStartedAt);
    const record: AnswerRecord = {
      question: currentQuestion,
      userAnswer,
      isCorrect: userAnswer === currentQuestion.answer,
      responseMs,
      isSlow: isSlowAnswer(currentQuestion, responseMs),
    };

    setAnsweredRecord(record);
    setRecords((previous) => [...previous, record]);
  }

  function goToNextQuestion(): void {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setAnsweredRecord(null);
    setQuestionStartedAt(performance.now());
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

  return (
    <main className="min-h-screen bg-[#11131d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-guitar-accent">Guitar Lab MVP</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal md:text-3xl">位置、音名、唱名反应训练</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              先把 0-5 品里的位置和 G/C 大调唱名练熟。答题后会同时显示位置、音名和唱名，重点补强 G 大调 F#。
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

        {activeView === 'memory' ? (
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
                      {config.key === 'G major' ? 'G 大调' : 'C 大调'} · 0-5 品
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  {currentQuestion.sourceMedium === 'board' && (
                    <Fretboard
                      fretCount={5}
                      highlightedPosition={currentQuestion.position}
                      onPositionClick={playFretboardPosition}
                    />
                  )}
                  {currentQuestion.sourceMedium === 'tab' && (
                    <Tablature position={currentQuestion.position} />
                  )}
                  {currentQuestion.sourceMedium === 'note' && (
                    <div className="grid min-h-[260px] place-items-center rounded-lg bg-[#171420]">
                      <div className="text-center">
                        <p className="text-sm text-slate-500">音名</p>
                        <p className="mt-3 text-7xl font-bold text-white">{currentQuestion.noteName}</p>
                        <p className="mt-3 text-sm text-slate-400">
                          {currentQuestion.key === 'G major' ? 'G 大调' : 'C 大调'}中唱什么？
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {currentQuestion.sourceMedium === 'tab' && (
                  <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                    <p className="mb-3 text-sm text-slate-400">对应指板位置</p>
                    <Fretboard
                      fretCount={5}
                      highlightedPosition={currentQuestion.position}
                      onPositionClick={playFretboardPosition}
                    />
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#171a27] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {currentQuestion.answerKind === 'note' ? '选择音名' : '选择唱名'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {currentQuestion.answerKind === 'note'
                      ? '一键选择音名，先追求反应速度。'
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

function FeedbackPanel({ record, isLast, onNext, onReplay }: FeedbackPanelProps) {
  const { question } = record;

  return (
    <div className={`rounded-lg border p-4 ${record.isCorrect ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-rose-400/40 bg-rose-400/10'}`}>
      <p className="text-lg font-bold">{record.isCorrect ? '答对了' : '再记一次'}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-200">
        <p>你的答案：{record.userAnswer}</p>
        <p>正确答案：{question.answer}</p>
        <p>位置：{formatPosition(question.position)}</p>
        <p>音名：{question.noteName}</p>
        <p>{question.key === 'G major' ? 'G 大调' : 'C 大调'}唱名：{question.solfeggio}</p>
        <p>
          反应链：{formatPosition(question.position)} {'->'} {question.noteName} {'->'} {question.solfeggio}
        </p>
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
