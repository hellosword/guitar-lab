/**
 * 唱名选择器
 * 首调唱名法：Do Re Mi Fa Sol La Si
 */
import type { Solfeggio } from '../../types/theory';

interface SolfeggioSelectorProps {
  disabled?: boolean;
  onSubmit: (solfeggio: Solfeggio) => void;
}

const SOLFEGGIOS: Solfeggio[] = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export default function SolfeggioSelector({ disabled = false, onSubmit }: SolfeggioSelectorProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {SOLFEGGIOS.map((solfeggio) => (
        <button
          key={solfeggio}
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(solfeggio)}
          className="h-12 rounded-md border border-white/15 bg-white/8 text-sm font-semibold text-slate-100 transition hover:border-guitar-accent hover:bg-guitar-accent/80 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {solfeggio}
        </button>
      ))}
    </div>
  );
}
