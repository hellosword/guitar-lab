/**
 * 练习交互节奏配置。
 *
 * 这里放“用户刚刚操作之后，界面何时反馈、何时推进”的参数。
 * 这些值会直接影响手感：太快会让用户看不清反馈、听不清音高；
 * 太慢会让连续练习变拖沓。
 */
export const PRACTICE_INTERACTION_CONFIG = {
  /**
   * 任意题型答对后，自动进入下一题前等待的时间。
   *
   * 设计目的：
   * - 让正确反馈有时间被看见。
   * - 让用户本次点击触发的音高先响出来。
   * - 避免下一题的自动提示音和本题音高几乎重叠。
   *
   * 调参建议：
   * - 500ms 以下会显得太急，容易看不到最后反馈。
   * - 600ms 当前更适合连续刷题，仍能看到短确认反馈。
   * - 800ms 会更稳，但节奏略慢。
   * - 1200ms 以上会更稳，但连续刷题节奏会变慢。
   */
  correctAnswerAutoAdvanceMs: 600,
} as const;

export type PracticeInteractionConfig = typeof PRACTICE_INTERACTION_CONFIG;
