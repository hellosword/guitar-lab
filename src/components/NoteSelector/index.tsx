/**
 * 音名选择器
 * MVP 快速答题模式：一键提交常用 12 个升号音名。
 */
import type { SharpNoteName } from '../../types/theory';

interface NoteSelectorProps {
  disabled?: boolean;
  onSubmit: (noteName: SharpNoteName) => void;
}

const NATURAL_NOTES: SharpNoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_NOTES: SharpNoteName[] = ['C#', 'D#', 'F#', 'G#', 'A#'];

export default function NoteSelector({ disabled = false, onSubmit }: NoteSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {NATURAL_NOTES.map((noteName) => (
          <button
            key={noteName}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(noteName)}
            className="h-12 rounded-md border border-white/15 bg-white/8 text-sm font-semibold text-slate-100 transition hover:border-guitar-accent hover:bg-guitar-accent/85 disabled:cursor-not-allowed disabled:opacity-45"
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
            onClick={() => onSubmit(noteName)}
            className="h-11 rounded-md border border-cyan-300/20 bg-cyan-400/10 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {noteName}
          </button>
        ))}
      </div>
    </div>
  );
}
