/**
 * 唱名选择器
 * 首调唱名法：Do Re Mi Fa Sol La Si
 */
import type { Solfeggio } from '../../types/theory';
import { formatSolfeggio, type SolfeggioDisplayMode } from '../../app/solfeggioDisplay';

interface SolfeggioSelectorProps {
  disabled?: boolean;
  displayMode: SolfeggioDisplayMode;
  selectedSolfeggio?: Solfeggio | null;
  correctSolfeggio?: Solfeggio | null;
  isAnswered?: boolean;
  onSubmit: (solfeggio: Solfeggio) => void;
}

const SOLFEGGIOS: Solfeggio[] = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export default function SolfeggioSelector({
  disabled = false,
  displayMode,
  selectedSolfeggio = null,
  correctSolfeggio = null,
  isAnswered = false,
  onSubmit,
}: SolfeggioSelectorProps) {
  function submitAndClearPressState(solfeggio: Solfeggio, button: HTMLButtonElement): void {
    onSubmit(solfeggio);
    window.setTimeout(() => button.blur(), 0);
  }

  function getButtonClass(solfeggio: Solfeggio): string {
    const isCorrect = isAnswered && correctSolfeggio === solfeggio;
    const isWrongSelection = isAnswered && selectedSolfeggio === solfeggio && correctSolfeggio !== solfeggio;

    if (isCorrect) {
      return 'border-emerald-300 bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.35)]';
    }

    if (isWrongSelection) {
      return 'border-rose-300 bg-rose-500 text-white shadow-[0_0_0_1px_rgba(251,113,133,0.35)]';
    }

    return 'border-white/15 bg-white/8 text-slate-100 hover:border-guitar-accent hover:bg-guitar-accent/80 active:border-amber-200 active:bg-amber-400 active:text-slate-950';
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {SOLFEGGIOS.map((solfeggio) => (
        <button
          key={solfeggio}
          type="button"
          disabled={disabled}
          onClick={(event) => submitAndClearPressState(solfeggio, event.currentTarget)}
          className={`h-12 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed ${getButtonClass(solfeggio)}`}
        >
          {formatSolfeggio(solfeggio, displayMode)}
        </button>
      ))}
    </div>
  );
}
