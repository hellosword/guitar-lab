# Next Steps — 下一步行动清单

> 记录当前项目中所有合理的下一步行动，按优先级和类别组织。
> AI 助手在对话中发现合理的 next step 时，应主动追加到本文档末尾。
> 人类完成某项后，将其移动到"已完成"区域，不要删除。
> 完成项必须记录发布状态；并行开发中的完成项先标为"待发布"，合入主线发布时再统一填写版本号。

版本记录约定：
- 页面版本号来源：`src/appVersion.ts`
- 并行开发分支不提前修改页面版本号，也不抢占版本号
- `docs/next.md` 已完成项版本列可先写"待发布"，发布时统一改为同一编号，如 `v0.0.34`
- 发布提交信息建议格式：`v0.0.34: Release practice improvements`
- Git tag 只打在主线发布提交上，建议格式：`v0.0.34`
- 普通开发提交不要求带版本号；跳过的版本号不补造 tag

---

## 高优先级（建议本周内）

### 移动端 Adaptive Shell 实施与 PWA 发布演练
- **来源**：本次对话（2026-05-04），在调研主流跨平台产品后确认“共享核心 + 分端交互壳”的方向
- **内容**：
  - 按 `docs/product/mobile-adaptive-shell-spec.md` 实现移动端 Focus Mode，不再把 PC 页面直接缩小
  - 将移动端练习模式、调性、唱名显示、音色和图选入口收纳进设置 Sheet
  - 移动端首屏优先展示当前题目和作答区，右侧详情改为反馈层或折叠详情
  - 检查手机竖屏、手机横屏、平板横屏下的练习页、指板速查、弱点地图和图选入口
  - 验证音频播放、PWA 缓存更新、版本号/构建标识在移动端是否可靠
  - 做一次“给真实用户打开就能练”的发布演练，不急于上架应用商店
- **预期产出**：移动端 Focus Mode 第一版、设置 Sheet、移动端回归测试、PWA 发布检查清单

### 移动端练习首屏与指板输入打磨
- **来源**：本次对话（2026-05-04），移动端交互 review 发现首屏可练但指板横向裁切、底部导航遮挡和设置 Sheet 信息密度仍影响日常练习效率
- **评估报告**：`docs/product/mobile-interaction-review-2026-05-04.md`
- **内容**：
  - 重新设计手机竖屏练习首屏的信息层级，保留题目、当前通路和作答区，压缩卡片边框、英文标签和重复上下文
  - 为指板输入做移动端专属方案：明确横向滚动提示、当前位置吸附反馈，必要时支持横屏或放大输入模式
  - 将“播放音高 / 下一题 / 反馈状态”等练习动作与底部主导航分层，避免被固定导航遮挡
  - 将设置 Sheet 从“全量控制台”改为渐进设置：常用项优先，图选通路、版本/构建信息和低频配置折叠
- **预期产出**：移动端首屏交互改版方案、指板输入可用性优化、手机视口截图验收与 Playwright 回归用例

### 把位范围扩展方案
- **来源**：本次对话（2026-05-04），用户提出“拓展把位”方向
- **内容**：
  - 评估从当前低把位扩展到 0-5、0-7、0-12 品的学习收益和心智负担
  - 设计按阶段解锁的范围策略，而不是一次性把全指板塞给初学者
  - 明确自适应出题、弱点地图、指板速查在更大范围下的显示和调度规则
- **预期产出**：`docs/product/fret-range-expansion-spec.md`

---

## 中优先级（建议本月内）

### 指板图视觉规范
- **来源**：`docs/product/guitar-fretboard-game-design.md` 第 10 节"后续待办方向"
- **内容**：
  - 显示品格数量（1-12 品还是 1-22 品？）
  - 空弦标记方式
  - 高亮/选中样式（单点、多点、音阶路径）
  - 响应式适配（手机横屏/竖屏）
- **预期产出**：`docs/product/fretboard-visual-spec.md`

### 音频资产与和弦播放路线规格
- **来源**：本次对话（2026-05-04），用户反馈现有采样仍不够干净，并提到未来需要和弦声音展示、可自录电吉他。
- **内容**：
  - 明确单音提示、和弦展示、扫弦/分解和弦、节奏反馈分别需要的音频资产类型
  - 决定短期采用“单音采样叠加合成和弦”，还是直接录制真实和弦/扫弦采样
  - 设计自录采样规范：调弦、弦/品范围、力度层、命名、降噪、归一化、授权归属
  - 抽象音频引擎接口，避免 UI 直接绑定某个具体采样库
- **预期产出**：`docs/tech/audio-asset-pipeline.md` 与 `src/lib/audio/` 模块化改造方案

---

## 低优先级（核心练习模式打磨后）

### 交互设计：用户旅程图
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 1-2 建议；本次对话（2026-05-03）重新评估后保留
- **内容**：在当前所有核心练习模式打磨完成后，梳理用户从首次打开到形成稳定练习习惯的完整旅程
  - 阶段：首次打开 → 首次练习 → 发现弱点 → 针对复练 → 日常练习 → 进阶挑战
  - 标注每个阶段的困惑点、反馈需求、继续练习的动机和产品机会
- **预期产出**：`docs/product/user-journey.md`

### 交互设计：核心流程图
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 3 建议；本次对话（2026-05-03）重新评估后保留
- **内容**：在核心练习模式稳定后，整理 Guitar Lab 的主循环和异常流
  - 主循环：选择练习 → 出题 → 作答 → 反馈 → 弱点更新 → 下一题 / 总结
  - 异常流：答错、漏点、误点、自动下一题、数据导入导出、清空记忆
- **预期产出**：`docs/product/interaction-flow.md`

### 交互设计：可交互原型
- **来源**：`docs/methods/ai-interaction-design/ai-era-interaction-design-methods.md` Day 4-5 建议；本次对话（2026-05-03）重新评估后保留
- **内容**：在练习模式、弱点地图和复练路径稳定后，按真实产品流生成可点击原型
  - 练习首页 / 模式选择
  - 答题界面
  - 弱点地图与复练入口
  - 总结与数据管理
- **预期产出**：可点击 HTML 原型或产品稿

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
| 2026-05-03 | v0.0.5 | 自适应统计逻辑校准：全局分组慢题判断与漏点计分修正 | `src/modules/fretboard-game/practiceMemory.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.6 | 音名定位全对后自动进入下一题，修复全对停留在 1/1 的卡住感 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.7 | 音名定位题锁定开题时的预提示集合，避免点击后突然出现已掌握标记 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.8 | 音名定位全对后延迟自动进入下一题，保留最后对钩并避免音频重叠 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.9 | 随时可打开的弱点地图：指板热度、Top 5 弱点、调外误触与位置详情 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.10 | 音名定位按弱位置加权出题：从弱位置反推音名，并提示同音名非弱位置 | `src/modules/fretboard-game/practiceSession.ts`、`src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.11 | 音名定位出题调度校准：弱题比例降至 50%、普通覆盖去弱点权重、音名冷却与调外误触唱名修正 | `src/modules/fretboard-game/practiceSession.ts`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`src/modules/fretboard-game/practiceMemory.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | 文档期 | 音名定位调度器 V2 产品规格：位置静态权重 + 本轮动态权重 + 熟练位置动态复查 | `docs/product/note-to-position-scheduler-v2-spec.md` |
| 2026-05-03 | v0.0.12 | 音名定位调度器 V2：按位置综合权重出题、同音名动态权重清空、熟练位置动态复查 | `src/modules/fretboard-game/practiceSession.ts`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.13 | 弱点地图显示校准：用近期压力分和相对分位替代永久累计慢错染色 | `src/App.tsx`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`docs/product/adaptive-practice-memory-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.14 | 全局唱名显示模式：支持 Do/Re/Mi 与 1/2/3，并同步影响练习、反馈、指板记忆、映射面板和弱点地图 | `src/lib/solfeggioDisplay.ts`、`src/App.tsx`、`src/components/SolfeggioSelector/index.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.15 | 练习页统一题目/作答布局：所有单选题答案区移到题面下方，右侧保留详情、播放、反馈和统计 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.16 | 练习节奏统一优化：所有题型答对后短暂停顿自动下一题，并移除六线谱题额外重复的指板位置面板 | `src/App.tsx`、`src/modules/fretboard-game/practiceInteractionConfig.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.17 | 答对自动进入下一题节奏调优：延迟从 800ms 缩短到 600ms | `src/modules/fretboard-game/practiceInteractionConfig.ts` |
| 2026-05-03 | 文档期 | 练习通路式交互框架规格：练习/速查主行为、通路图选择器与通路级弱点入口 | `docs/product/practice-path-interaction-framework-spec.md` |
| 2026-05-03 | v0.0.18 | 练习通路式交互框架第一版：练习/速查主导航、通路图选择器、通路级开始练习与弱点入口 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.19 | 练习通路布局校准：日常页恢复紧凑题型按钮，通路 graph 改为“图选”弹窗 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.20 | 图选弹窗布局校准：放大 graph、移除右侧 Current Path 面板、综合练习入口移入图内角落 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.21 | 练习模式区层级校准：先选模式，再在当前通路下切换开始练习/查看弱点 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md` |
| 2026-05-03 | v0.0.22 | 练习模式说明去重：移除当前通路说明块，改用模式按钮 tooltip 承载说明 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.23 | 图选入口收纳：将“图选”移到练习模式标题旁，模式按钮行只保留真实练习模式 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md` |
| 2026-05-03 | v0.0.24 | 通路视图 tab 化：将练习/查看弱点改为同一通路下的 tab，并统一下方内容区布局 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.25 | 日常练习密度优化：压缩顶部 Header 和练习模式工具栏，让题目与作答区更早进入首屏 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.26 | 音名唱名练习升级：按 `key + noteName -> solfeggio` 记录历史、自适应出题，并新增对应弱点地图 | `src/modules/fretboard-game/practiceSession.ts`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.27 | 剩余位置输入类练习补齐弱点地图：指板音名、指板唱名、六线谱音名、六线谱唱名接入位置级历史记录与自适应复盘 | `src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-03 | v0.0.28 | 位置输入类出题调度校准：移除 G 大调 F# 固定插队，增加位置与音名双层本轮覆盖权重，降低高弱点连发 | `src/modules/fretboard-game/practiceSession.ts`、`src/modules/fretboard-game/adaptivePracticeConfig.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.33 | 吉他采样音色切换：加入真实吉他采样资源、音色选择界面与采样播放实现，并同步版本号 | `src/lib/audio.ts`、`src/App.tsx`、`src/appVersion.ts`、`package.json`、`package-lock.json`、`public/audio/samples/guitar/` |
| 2026-05-04 | v0.0.34 | 开发期构建标识显示：页面同时展示正式版本号与 Git 分支/短提交号，便于确认刷新后的实际代码来源 | `vite.config.ts`、`src/vite-env.d.ts`、`src/App.tsx` |
| 2026-05-04 | v0.0.34 | 音名唱名题播放音高修正：按当前调性选定一组连续首调八度，避免同一练习中音名被播放到不同八度 | `src/modules/fretboard-game/practiceSession.ts` |
| 2026-05-04 | v0.0.34 | 答对自动下一题节奏修正：同时满足最小等待 500ms 和当前音高播放结束后才进入下一题，减少音频重叠 | `src/lib/audio.ts`、`src/App.tsx`、`src/modules/fretboard-game/practiceInteractionConfig.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.34 | 音名唱名总结页去位置化：总结重点和慢错项按当前通路展示 `音名 -> 唱名`，不再泄漏内部播放位置 | `src/App.tsx`、`src/modules/fretboard-game/practiceMemory.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 练习模式层级改造：以“综合、位置音名、位置唱名、音名唱名、六线谱”作为一级训练组，组内提供两个方向与混合，并补齐 `唱名 -> 音名`、`唱名 -> 位置` 题型及历史记录 | `src/App.tsx`、`src/modules/fretboard-game/practiceSession.ts`、`src/modules/fretboard-game/practiceMemory.ts`、`src/modules/fretboard-game/types.ts`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 组内混合抽题修复：过滤 0 权重题型，避免音名唱名混合等组内混合误抽到组外题型，并增加回归测试 | `src/modules/fretboard-game/practiceSession.ts`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 六线谱练习取消二级混合入口：只保留 `六线谱 -> 音名` 与 `六线谱 -> 唱名`，避免读谱训练过早混合导致任务目标不清晰 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 指板记忆训练组整合：将一级“位置音名/位置唱名”合并为“指板记忆”，二级横向分为音名组与唱名组，并将速查页命名为“指板速查” | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 指板记忆二级分类简化：移除唱名组内局部当前调选择，统一复用页面顶部全局调性控件 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | v0.0.35 | 图选通路图布局优化：改为分层节点、平行双向边和底部外围弧线，减少交叉、遮挡和按钮压线 | `src/App.tsx`、`docs/product/practice-path-interaction-framework-spec.md` |
| 2026-05-04 | 文档期 | 移动端 Adaptive Shell 交互规格：明确共享训练核心、PC Web 壳层和移动端 Focus Mode 的边界与实施阶段 | `docs/product/mobile-adaptive-shell-spec.md` |
| 2026-05-04 | v0.0.36 | 移动端第一轮交互打磨：指板图在窄屏中保持更大的可点击宽度并在卡片内横向滚动，图选通路图改为窄屏内部横向滚动，补充页面横向溢出回归测试 | `src/components/Fretboard/index.tsx`、`src/App.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-04 | 待发布 | 移动端开发架构准备：抽离 `domain` 核心层、`app` 应用服务层与 `desktop` 桌面交互壳，保留现有行为不变 | `src/domain/`、`src/app/`、`src/desktop/DesktopApp.tsx`、`src/App.tsx` |
| 2026-05-04 | 待发布 | 移动端 Focus Mode 第一版：手机端改用顶部上下文栏、设置 Sheet、底部练习/速查/弱点导航与移动端题后反馈区，桌面端保持原布局 | `src/desktop/DesktopApp.tsx`、`src/components/NoteSelector/index.tsx`、`src/components/SolfeggioSelector/index.tsx`、`tests/e2e/mvp-practice.spec.ts` |
| 2026-05-06 | 待发布 | 移动端导航结构校准：底部改为练习/速查/我，弱点进入练习页顶部二级 tab，练习通路改为顶部折叠面板，低频偏好和数据管理移入“我” | `src/desktop/DesktopApp.tsx`、`tests/e2e/mvp-practice.spec.ts` |
