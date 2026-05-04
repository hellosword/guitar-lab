/**
 * 练习交互节奏配置。
 *
 * 这里放“用户刚刚操作之后，界面何时反馈、何时推进”的参数。
 * 这些值会直接影响手感：太快会让用户看不清反馈、听不清音高；
 * 太慢会让连续练习变拖沓。
 */
export const PRACTICE_INTERACTION_CONFIG = {
  /**
   * 任意题型答对后，自动进入下一题前的最小等待时间。
   *
   * 设计目的：
   * - 让正确反馈有时间被看见。
   * - 配合“等待当前音高播放结束”规则，避免下一题提示音和本题音高重叠。
   *
   * 调参建议：
   * - 500ms 以下会显得太急，容易看不到最后反馈。
   * - 500ms 当前只作为视觉反馈下限；如果音频仍在播放，会继续等待。
   * - 800ms 以上会更稳，但连续刷题节奏会变慢。
   */
  correctAnswerAutoAdvanceMs: 500,
} as const;

export type PracticeInteractionConfig = typeof PRACTICE_INTERACTION_CONFIG;
