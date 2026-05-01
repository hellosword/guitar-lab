import type { FretPosition, PracticeKey, SharpNoteName, Solfeggio } from '../../types/theory';

export type MvpQuestionType =
  | 'board-to-note'
  | 'board-to-solfeggio'
  | 'tab-to-note'
  | 'tab-to-solfeggio'
  | 'note-to-solfeggio';

export type AnswerValue = SharpNoteName | Solfeggio;

export interface MvpPracticeConfig {
  key: PracticeKey;
  fretRange: [number, number];
  stringRange: [number, number];
  questionCount: number;
  questionTypeWeights: Record<MvpQuestionType, number>;
}

export interface MvpQuestion {
  id: string;
  type: MvpQuestionType;
  key: PracticeKey;
  position: FretPosition;
  noteName: SharpNoteName;
  solfeggio: Solfeggio;
  answer: AnswerValue;
  prompt: string;
  answerKind: 'note' | 'solfeggio';
  sourceMedium: 'board' | 'tab' | 'note';
  isFocusNote: boolean;
}

export interface AnswerRecord {
  question: MvpQuestion;
  userAnswer: AnswerValue;
  isCorrect: boolean;
  responseMs: number;
  isSlow: boolean;
}

export interface PracticeSummary {
  total: number;
  correct: number;
  accuracy: number;
  averageResponseMs: number;
  focusTotal: number;
  focusCorrect: number;
  focusAccuracy: number | null;
  slowCount: number;
  weakest: AnswerRecord[];
}
