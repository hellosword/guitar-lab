# Next Steps — 下一步行动清单

> 记录当前项目中所有合理的下一步行动，按优先级和类别组织。
> AI 助手在对话中发现合理的 next step 时，应主动追加到本文档末尾。
> 人类完成某项后，将其移动到"已完成"区域，不要删除。
> 完成项必须记录对应版本号；可见产品改动应同步递增页面版本号，并在提交信息/tag 中带上同一版本号。

版本记录约定：
- 页面版本号来源：`src/appVersion.ts`
- `docs/next.md` 已完成项版本列使用同一编号，如 `v0.0.2`
- 提交信息建议格式：`v0.0.2: Add visible app version`
- Git tag 建议格式：`v0.0.2`

---

## 高优先级（建议本周内）

### 开发：学习效果闭环与弱点复练
- **来源**：本次对话（2026-05-01），基于当前可运行 MVP 的下一步判断
- **内容**：让练习系统记录“哪些位置、音名、唱名反应慢或答错”，并把这些弱点自动带回后续出题
  - 记录每道题的题型、调性、位置、正确性、反应时间
  - 汇总 G 大调下 F#、D→So、位置→音名→唱名等薄弱映射
  - 练习结束展示慢题/错题清单，而不只是总体正确率
  - 下一轮练习提高弱点权重，形成最小自适应训练
  - 优先覆盖当前核心目标：开放把位（C 大调 0-3 品、G 大调 0-4 品）的“指板位置 → 音名 → 首调唱名”
- **预期产出**：可感知进步的个人化练习闭环

### 产品：指板音名记忆玩法定义文档
- **来源**：本次对话（2026-04-26），`docs/product/guitar-fretboard-game-design.md` 第 10 节后续待办
- **内容**：在三维参数体系（Key → PlayMode → Range）框架下，定义指板音名记忆（P ↔ N）玩法的完整规则
  - P→N（位置→音名）：题目展示、音名选择器交互、答案校验
  - N→P（音名→位置）：全范围多点点击、弦组限定变体、部分得分计分规则（全对5分/部分2分/错0分）
  - Mixed 混合模式：P→N 与 N→P 交替出题
  - 与调性过滤的集成：G大调0-4品等具体配置示例
- **预期产出**：`docs/product/playmode-note-memory.md`

### 交互设计：核心流程图
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 3 建议
- **内容**：用 AI 生成 Guitar Lab 的核心交互流程图（Mermaid 格式）
  - 主循环：启动 → 关卡选择 → 出题 → 作答 → 反馈 → 下一题/结算
  - 异常流：答错提示、暂停、时间耗尽、中途退出
  - 关卡流：完成条件 → 解锁下一关 → 关卡地图状态更新
- **预期产出**：`docs/product/interaction-flow.md`

---

## 中优先级（建议本月内）

### 测试：浏览器级 Agent 自循环验证
- **来源**：`docs/inbox.md` 2026-05-01
- **内容**：在当前 `npm run test:smoke` 的基础上，补充真实浏览器级验证
  - 打开本地预览页面
  - 截图确认页面非空、指板与选择器可见
  - 点击完成 1-2 道题，确认反馈面板出现
  - 检查桌面和移动宽度下是否有明显布局重叠
- **预期产出**：Playwright 或 Codex 浏览器工具驱动的冒烟测试脚本

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

| 日期 | 版本/标签 | 事项 | 产出位置 |
|------|----------|------|---------|
| 2026-04-25 | 文档期 | 技术选型与架构设计 | `docs/tech/tech-stack.md`、`docs/tech/question-bank-architecture.md` |
| 2026-04-25 | 文档期 | 乐理框架与玩法设计 | `docs/product/guitar-fretboard-game-design.md` |
| 2026-04-25 | 文档期 | AI 交互设计方法调研 | `docs/methods/ai-interaction-design/` |
| 2026-04-25 | v0.0.1 | 项目骨架搭建 | 项目根目录（Vite + React + TS + Tailwind） |
| 2026-05-01 | v0.0.1 | 个人学习目标校准 | `docs/product/learning-goal-calibration.md` |
| 2026-05-01 | v0.0.1 | 最小练习闭环规格 | `docs/product/mvp-learning-loop-review.md` |
| 2026-05-01 | v0.0.1 | 核心闭环优先产品设计方法 | `docs/methods/core-loop-first-product-design.md` |
| 2026-05-01 | v0.0.1 | 架构合理性评审 | `docs/tech/architecture-review-2026-05-01.md` |
| 2026-05-01 | v0.0.1 | 静态产物冒烟测试脚本 | `scripts/static-preview.mjs`、`scripts/smoke-dist.mjs` |
| 2026-05-01 | v0.0.1 | Playwright 浏览器测试安装与基础用例 | `playwright.config.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-01 | v0.0.1 | 最小练习闭环原型 | `src/App.tsx`、`src/modules/fretboard-game/practiceSession.ts`、`src/components/` |
| 2026-05-01 | v0.0.1 | 随时可打开的指板记忆界面 | `src/App.tsx`、`src/components/Fretboard/index.tsx` |
| 2026-05-01 | v0.0.1 | 音名颜色与双向联动交互规格 | `docs/product/interaction-design-spec.md` |
| 2026-05-01 | v0.0.2 | 音名定位题型（N→P 多点点击） | `src/modules/fretboard-game/practiceSession.ts`、`src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-01 | v0.0.2 | 正式练习模式选择 | `src/modules/fretboard-game/practiceSession.ts`、`src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-01 | v0.0.2 | 音名定位点击即判定交互 | `src/App.tsx`、`src/components/Fretboard/index.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-01 | v0.0.2 | 音名定位本轮位置熟练度提示 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-01 | v0.0.2 | 页面版本号显示 | `src/appVersion.ts`、`src/App.tsx` |
| 2026-05-02 | v0.0.3 | 本地预览禁用 PWA 离线缓存，正式发布改用 `build:pwa` | `vite.config.ts`、`package.json`、`src/appVersion.ts` |
| 2026-05-02 | 文档期 | 前端项目基础概念入门文档 | `docs/knowledge/frontend-project-basics-for-beginners.md` |
| 2026-05-02 | 文档期 | 前端项目基础概念入门文档重构：增加游戏开发/Python 类比与拓扑顺序 | `docs/knowledge/frontend-project-basics-for-beginners.md` |
| 2026-05-03 | 文档期 | 自适应练习记忆系统规格 | `docs/product/adaptive-practice-memory-spec.md` |
| 2026-05-03 | v0.0.4 | 自适应练习记忆 MVP：版本化数据、位置级记录、弱点加权、导入导出、开发期同步 | `src/modules/fretboard-game/practiceMemory.ts`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`src/App.tsx`、`scripts/static-preview.mjs` |
