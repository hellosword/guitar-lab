/**
 * 练习交互节奏配置。
 *
 * 这里放“用户刚刚操作之后，界面何时反馈、何时推进”的参数。
 * 这些值会直接影响手感：太快会让用户看不清反馈、听不清音高；
 * 太慢会让连续练习变拖沓。
 */
export const PRACTICE_INTERACTION_CONFIG = {
  /**
   * 音名定位题在全部点对之后，自动进入下一题前等待的时间。
   *
   * 设计目的：
   * - 让最后一个正确位置的对钩有时间被看见。
   * - 让用户点击位置时播放的音高先响出来。
   * - 避免下一题的自动提示音和最后一次点击音几乎重叠。
   *
   * 调参建议：
   * - 500ms 以下会显得太急，容易看不到最后反馈。
   * - 800ms 当前比较像一个短确认拍。
   * - 1200ms 以上会更稳，但连续刷题节奏会变慢。
   */
  positionHuntAutoAdvanceMs: 800,
} as const;

export type PracticeInteractionConfig = typeof PRACTICE_INTERACTION_CONFIG;
