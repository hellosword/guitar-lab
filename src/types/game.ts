/**
 * 游戏相关类型定义
 */

/** 玩法映射标识 */
export type PlayModeId = string;

/** 题目形式标识 */
export type QuestionFormId = string;

/** 答案媒介类型 */
export type AnswerMedium =
  | 'fretboard-click'
  | 'fretboard-multi-click'
  | 'note-selector'
  | 'solfeggio-selector'
  | 'option-buttons'
  | 'boolean-buttons'
  | 'sequence-click';

/** 输入定义 */
export interface InputDef {
  key: string;
  type: string;
  source: 'random' | 'fixed' | 'derived';
}

/** 输出定义 */
export interface OutputDef {
  key: string;
  type: string;
  answerMedium: AnswerMedium;
}

/** 玩法模式配置 */
export interface PlayModeConfig {
  id: PlayModeId;
  name: string;
  level: number;
  inputs: InputDef[];
  output: OutputDef;
  supportedForms: QuestionFormId[];
}

/** 难度配置 */
export interface DifficultyProfile {
  fretRange: [number, number];
  stringRange: [number, number];
  allowedKeys: string[];
  allowedIntervals?: string[];
  allowedChords?: string[];
  allowedScales?: string[];
  noteTypes?: ('natural' | 'sharp' | 'flat')[];
  timeLimit?: number;
  optionCount?: number;
}

/** 具体题目实例 */
export interface Question {
  playModeId: PlayModeId;
  formId: QuestionFormId;
  difficulty: DifficultyProfile;
  content: Record<string, unknown>;
  answer: Record<string, unknown>;
  metadata: {
    tags: string[];
    estimatedTime: number;
    hint?: string;
  };
}

/** 校验结果 */
export interface ValidationResult {
  isCorrect: boolean;
  partialCorrect?: boolean;
  correctAnswer?: unknown;
  feedback?: string;
}
