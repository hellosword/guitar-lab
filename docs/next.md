# Next Steps — 下一步行动清单

> 记录当前项目中所有合理的下一步行动，按优先级和类别组织。
> AI 助手在对话中发现合理的 next step 时，应主动追加到本文档末尾。
> 人类完成某项后，将其移动到"已完成"区域，不要删除。

---

## 高优先级（建议本周内）

### 交互设计：核心流程图
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 3 建议
- **内容**：用 AI 生成 Guitar Lab 的核心交互流程图（Mermaid 格式）
  - 主循环：启动 → 关卡选择 → 出题 → 作答 → 反馈 → 下一题/结算
  - 异常流：答错提示、暂停、时间耗尽、中途退出
  - 关卡流：完成条件 → 解锁下一关 → 关卡地图状态更新
- **预期产出**：`docs/product/interaction-flow.md`

---

## 中优先级（建议本月内）

### 交互设计：用户旅程图
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 1-2 建议
- **内容**：生成用户从发现 App 到成为重度用户的完整旅程
  - 阶段：发现 → 首次打开 → 首次练习 → 日常练习 → 进阶挑战 → 分享/传播
  - 标注情绪曲线、痛点、设计机会
- **预期产出**：`docs/product/user-journey.md`

### 交互设计：可交互原型
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 4-5 建议
- **内容**：用 Claude Artifacts 或 v0.dev 生成 3 个核心页面的可交互 HTML 原型
  - 答题界面（指板图 + 音名选择器 + 反馈）
  - 关卡/模式选择界面
  - 结算/成绩界面
- **预期产出**：3 个独立 HTML 文件，可点击跳转

### 指板图视觉规范
- **来源**：`docs/product/guitar-fretboard-game-design.md` 第 10 节"后续待办方向"
- **内容**：
  - 显示品格数量（1-12 品还是 1-22 品？）
  - 空弦标记方式
  - 高亮/选中样式（单点、多点、音阶路径）
  - 响应式适配（手机横屏/竖屏）
- **预期产出**：`docs/product/fretboard-visual-spec.md`

---

## 低优先级（MVP 之后）

### 计分规则定义
- **来源**：`docs/product/guitar-fretboard-game-design.md` 第 10 节"后续待办方向"
- **内容**：
  - 基础得分公式
  - 时间奖励/惩罚
  - 连续答对倍率
  - 多点点击题的评分策略（漏点、误点权重）
- **预期产出**：`docs/product/scoring-rules.md`

### 难度曲线配置落地
- **来源**：`docs/tech/question-bank-architecture.md` 第 7 节
- **内容**：将 Level 1~3 的难度维度组合成具体 JSON 关卡配置
- **预期产出**：`src/modules/fretboard-game/levels/` 下的配置文件

---

## 待评估（来自灵感箱）

### 智能出题系统（无手动选关）
- **来源**：`docs/inbox.md` 2026-04-25
- **状态**：想法阶段，需评估是否与"关卡制"兼容
- **下一步**：产品决策——是保留关卡制、完全改为智能出题、还是两者并存？

### 混合训练模式
- **来源**：`docs/inbox.md` 2026-04-25
- **状态**：想法阶段，需评估解锁时机和混合策略
- **下一步**：在 Level 3~5 玩法实现后，设计混合模式的配置参数

---

## 已完成 ✅

| 日期 | 事项 | 产出位置 |
|------|------|---------|
| 2026-04-25 | 技术选型与架构设计 | `docs/tech/tech-stack.md`、`docs/tech/question-bank-architecture.md` |
| 2026-04-25 | 乐理框架与玩法设计 | `docs/product/guitar-fretboard-game-design.md` |
| 2026-04-25 | AI 交互设计方法调研 | `docs/methods/ai-interaction-design/` |
| 2026-04-25 | 项目骨架搭建 | 项目根目录（Vite + React + TS + Tailwind） |
