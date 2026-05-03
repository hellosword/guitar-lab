import type { Solfeggio } from '../types/theory';

export type SolfeggioDisplayMode = 'syllable' | 'number';

const STORAGE_KEY = 'guitarLab.solfeggioDisplayMode.v1';

const SOLFEGGIO_NUMBER_LABELS: Record<Solfeggio, string> = {
  Do: '1',
  Re: '2',
  Mi: '3',
  Fa: '4',
  Sol: '5',
  La: '6',
  Si: '7',
};

export function formatSolfeggio(solfeggio: Solfeggio, mode: SolfeggioDisplayMode): string {
  return mode === 'number' ? SOLFEGGIO_NUMBER_LABELS[solfeggio] : solfeggio;
}

export function isSolfeggio(value: string): value is Solfeggio {
  return value === 'Do'
    || value === 'Re'
    || value === 'Mi'
    || value === 'Fa'
    || value === 'Sol'
    || value === 'La'
    || value === 'Si';
}

export function loadSolfeggioDisplayMode(): SolfeggioDisplayMode {
  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return storedMode === 'number' ? 'number' : 'syllable';
  } catch {
    return 'syllable';
  }
}

export function saveSolfeggioDisplayMode(mode: SolfeggioDisplayMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // 设置偏好保存失败时保持当前页面状态，不影响练习。
  }
}
