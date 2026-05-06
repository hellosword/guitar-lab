/**
 * 音名选择器
 * MVP 快速答题模式：一键提交常用 12 个升号音名。
 */
import type { SharpNoteName } from '../../types/theory';

interface NoteSelectorProps {
  disabled?: boolean;
  selectedNote?: SharpNoteName | null;
  correctNote?: SharpNoteName | null;
  isAnswered?: boolean;
  onSubmit: (noteName: SharpNoteName) => void;
}

const NATURAL_NOTES: SharpNoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_NOTES: SharpNoteName[] = ['C#', 'D#', 'F#', 'G#', 'A#'];

export default function NoteSelector({
  disabled = false,
  selectedNote = null,
  correctNote = null,
  isAnswered = false,
  onSubmit,
}: NoteSelectorProps) {
  function submitAndClearPressState(noteName: SharpNoteName, button: HTMLButtonElement): void {
    onSubmit(noteName);
    window.setTimeout(() => button.blur(), 0);
  }

  function getButtonClass(noteName: SharpNoteName, isSharp: boolean): string {
    const isCorrect = isAnswered && correctNote === noteName;
    const isWrongSelection = isAnswered && selectedNote === noteName && correctNote !== noteName;

    if (isCorrect) {
      return 'border-emerald-300 bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.35)]';
    }

    if (isWrongSelection) {
      return 'border-rose-300 bg-rose-500 text-white shadow-[0_0_0_1px_rgba(251,113,133,0.35)]';
    }

    return isSharp
      ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:border-cyan-200 hover:bg-cyan-400/25 active:border-amber-200 active:bg-amber-400 active:text-slate-950'
      : 'border-white/15 bg-white/8 text-slate-100 hover:border-guitar-accent hover:bg-guitar-accent/85 active:border-amber-200 active:bg-amber-400 active:text-slate-950';
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {NATURAL_NOTES.map((noteName) => (
          <button
            key={noteName}
            type="button"
            disabled={disabled}
            onClick={(event) => submitAndClearPressState(noteName, event.currentTarget)}
            className={`h-12 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed ${getButtonClass(noteName, false)}`}
          >
            {noteName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SHARP_NOTES.map((noteName) => (
          <button
            key={noteName}
            type="button"
            disabled={disabled}
            onClick={(event) => submitAndClearPressState(noteName, event.currentTarget)}
            className={`h-11 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed ${getButtonClass(noteName, true)}`}
          >
            {noteName}
          </button>
        ))}
      </div>
    </div>
  );
}
