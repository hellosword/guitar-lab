import type { FretPosition, PracticeKey, SharpNoteName, Solfeggio } from '../../types/theory';

export type MvpQuestionType =
  | 'board-to-note'
  | 'board-to-solfeggio'
  | 'tab-to-note'
  | 'tab-to-solfeggio'
  | 'note-to-solfeggio'
  | 'note-to-positions';

export type PracticeModeId = 'mixed' | MvpQuestionType;
export type AnswerValue = SharpNoteName | Solfeggio;
export type PositionAnswerValue = FretPosition[];
export type PracticeAnswerValue = AnswerValue | PositionAnswerValue;

export interface MvpPracticeConfig {
  modeId: PracticeModeId;
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
  answer: PracticeAnswerValue;
  targetPositions: FretPosition[];
  prompt: string;
  answerKind: 'note' | 'solfeggio' | 'positions';
  sourceMedium: 'board' | 'tab' | 'note';
  isFocusNote: boolean;
}

export interface AnswerRecord {
  question: MvpQuestion;
  userAnswer: PracticeAnswerValue;
  isCorrect: boolean;
  responseMs: number;
  isSlow: boolean;
  missedPositions: FretPosition[];
  extraPositions: FretPosition[];
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
