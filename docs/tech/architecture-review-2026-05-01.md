# Guitar Lab — 架构合理性评审

> 日期：2026-05-01  
> 评审对象：`docs/tech/tech-stack.md`、`docs/tech/question-bank-architecture.md`  
> 背景：当前架构主要来自早期设想，需要在进入代码实现前评估其合理性与 MVP 落地方式。

---

## 1. 总体结论

当前架构方向总体合理，但需要分阶段落地。

更准确地说：

```text
长期架构：基本正确
MVP 实现：需要明显收缩
```

技术选型中的 React、TypeScript、Vite、Tailwind、SVG、Tonal.js、Zustand 都适合当前产品。题库系统的数据驱动方向也正确，但如果第一版就完整实现 PlayMode 注册表、配置加载器、生成器、校验器、难度曲线、热加载等全套机制，会产生过度工程风险。

建议采用：

```text
轻量核心闭环实现 -> 保留可演进边界 -> 验证有效后再抽象成完整题库引擎
```

---

## 2. 技术栈评审

### 2.1 React + TypeScript：合理

适合当前项目。

原因：

- 指板、六线谱、选择器、反馈面板都天然是组件化 UI
- 乐理数据结构复杂，TypeScript 能减少大量边界错误
- 后续题型增多时，组件复用价值高

注意事项：

- 源代码和注释使用中文，变量/函数/类型命名使用英文
- 禁止 `any`
- 类型先覆盖核心域模型，不急着为未来所有高级玩法建模

### 2.2 Vite + Tailwind：合理

适合快速原型。

注意事项：

- MVP 阶段不要过度设计视觉系统
- Tailwind 配置保持轻量
- 先保证练习体验清晰，而不是追求完整品牌视觉

### 2.3 SVG 指板：非常合理

这是当前架构中最稳的决策之一。

原因：

- 指板位置天然是可点击图形元素
- SVG 元素可直接绑定事件
- 高亮、选中、错题反馈都容易实现
- 适合未来扩展多点点击、音阶图、音程形状

结论：

```text
指板图和六线谱继续坚持 SVG，不改 Canvas。
```

### 2.4 Tonal.js：合理，但首版不必完全依赖

Tonal.js 适合长期乐理扩展，尤其是音程、和弦、音阶。

但 MVP 的核心计算很小：

```text
标准调弦位置 -> 半音 -> 音名
C/G 大调音名 -> 唱名
0-5 品位置池
```

这些可以在 `src/lib/theory.ts` 中先做薄封装。内部可以使用简单表驱动，也可以调用 Tonal.js，但对上层暴露项目自己的函数。

推荐原则：

```text
上层永远依赖 Guitar Lab 自己的 theory API，不直接散落调用 Tonal.js。
```

### 2.5 Zustand：合理，但 MVP 可少用

Zustand 适合管理游戏状态，但第一版不需要复杂全局 store。

建议：

- 单局练习状态可以先在页面组件或轻量 store 中管理
- 用户长期练习记录后续再接 Dexie
- 不要为了“规范”过早把每个 UI 状态都塞进全局 store

推荐首版 store 只管理：

```text
当前练习配置
当前题目
题目序号
答题记录
错题/慢题队列
练习总结
```

### 2.6 Dexie / IndexedDB：合理，但不阻塞 MVP

长期需要本地记录练习数据，Dexie 是合理选择。

但第一版可以先用：

```text
内存状态 -> localStorage -> Dexie
```

演进顺序：

1. 内存记录，验证练习闭环
2. localStorage 保存最近结果
3. Dexie 保存完整历史和统计

### 2.7 Tone.js / 音频能力：暂缓

Tone.js 对节拍器和听力训练有价值，但当前 MVP 目标是六线谱/指板到音名/唱名的反应训练。

建议：

```text
首版不引入任何音频功能。
```

保留依赖没有问题，但不要让它进入第一版实现路径。

### 2.8 Capacitor / PWA：方向合理，执行延后

Web-first 是正确方向。

但 Capacitor 打包不应进入第一阶段关键路径。

推荐阶段：

1. 本地 Web 原型跑通
2. PWA 基础体验可用
3. 真实练习验证有效
4. 再考虑 Capacitor

---

## 3. 题库架构评审

### 3.1 数据驱动方向正确

当前题库架构中最重要的判断是正确的：

```text
题目 = 配置数据 + 通用生成/渲染/校验逻辑
```

这对 Guitar Lab 很重要，因为未来题型确实会扩展：

- 位置 -> 音名
- 位置 + 调性 -> 唱名
- 音名 -> 位置
- 音程
- 和弦内音
- 音阶路径
- 多声部分析

如果从第一天就把每种题型写成散落的 `if/else`，后面会很难维护。

### 3.2 PlayMode / QuestionForm / Question 三层抽象合理

这个抽象值得保留。

| 层级 | 评价 |
|------|------|
| PlayMode | 合理，描述训练的认知映射 |
| QuestionForm | 合理，描述题目如何呈现/交互 |
| Question | 合理，描述一次具体题目实例 |

它解决了一个关键问题：

```text
训练目标和交互形式解耦
```

例如 `P -> N` 可以用指板展示，也可以用六线谱展示；答案同样都是音名选择器。

### 3.3 当前架构的主要风险：抽象太早太完整

风险不在方向，而在实现时机。

如果第一版就实现：

- 通用 PlayMode registry
- 通用 generator registry
- 通用 validator registry
- JSON 配置 schema
- 关卡 loader
- 随机种子系统
- 难度曲线配置
- 多种 answer medium router

那么 MVP 会被架构拖慢。

当前更适合：

```text
先实现 4 个硬边界清晰的题型
再把重复模式抽象成注册表
```

注意：这里的“先实现题型”不是写乱七八糟的分支，而是用小而清楚的模块实现。

### 3.4 推荐的 MVP 题库落地方式

第一版可以采用轻量结构：

```text
src/modules/fretboard-game/
├── theory-adapter.ts
├── questionTypes.ts
├── createQuestion.ts
├── validateAnswer.ts
├── practiceSession.ts
└── types.ts
```

首版只支持：

```text
board-to-note
board-to-solfeggio
tab-to-note
tab-to-solfeggio
```

内部可以先用对象映射：

```typescript
const questionFactories = {
  'board-to-note': createBoardToNoteQuestion,
  'board-to-solfeggio': createBoardToSolfeggioQuestion,
  'tab-to-note': createTabToNoteQuestion,
  'tab-to-solfeggio': createTabToSolfeggioQuestion,
};
```

这已经避免了核心流程中的大量 `if/else`，但比完整注册表轻。

### 3.5 配置文件：MVP 可先内置，后续再 JSON 化

长期支持 JSON/YAML 是合理的。

但第一版建议先用 TypeScript 常量：

```typescript
const mvpPracticeConfig = {
  keys: ['G major', 'C major'],
  fretRange: [0, 5],
  questionCount: 20,
  questionTypeWeights: {
    'board-to-note': 0.3,
    'board-to-solfeggio': 0.3,
    'tab-to-note': 0.2,
    'tab-to-solfeggio': 0.2,
  },
};
```

原因：

- 类型检查更直接
- 修改成本低
- 不需要 schema 校验
- 验证核心闭环更快

等 MVP 有效后，再把这些配置迁移为 JSON/Zod schema。

### 3.6 AnswerMedium Router 可以保留，但先做小

答案媒介决定交互组件，这个原则正确。

首版只需要：

```text
note-selector
solfeggio-selector
```

`fretboard-multi-click`、`option-buttons`、`sequence-click` 可以先不实现。

---

## 4. 建议的分阶段架构路线

### 阶段 1：MVP 闭环

目标：

```text
能练，能反馈，能记录一次结果。
```

实现：

- `theory.ts` 基础乐理函数
- SVG 指板
- 单音六线谱
- 音名/唱名选择器
- 4 种题型
- 简单 session 状态
- 练习总结

暂不做：

- 通用题库配置
- Dexie 历史记录
- 路由系统
- Capacitor
- 音频

### 阶段 2：轻量题库引擎

目标：

```text
让新增题型不破坏现有流程。
```

加入：

- QuestionFactory 映射
- Validator 映射
- AnswerMedium 映射
- TS 配置对象
- 错题/慢题权重

### 阶段 3：配置驱动

目标：

```text
把训练配置从代码中抽离。
```

加入：

- JSON 配置
- Zod 校验
- 难度曲线配置
- 练习预设

### 阶段 4：完整扩展系统

目标：

```text
支持 Level 3-6、用户自定义题库、长期练习数据。
```

加入：

- 完整 PlayMode registry
- 完整 generator/validator registry
- Dexie 历史统计
- 自定义题库导入
- PWA/Capacitor 发布链路

---

## 5. 需要修正的架构表述

### 5.1 “禁止 if/else 或 switch”应改成“禁止业务散落式硬编码”

当前文档中“不允许 if/else 或 switch”作为原则有点过硬。

更合理的表述：

```text
禁止在核心流程中用散落的 if/else 处理大量题型差异；
允许在局部、清晰、封闭的工厂函数或映射表中做必要分支。
```

原因：

- 完全没有分支不现实
- 映射表和工厂函数本质上也是选择逻辑
- 关键是让差异被封装，而不是散落在 UI 和游戏循环里

### 5.2 “无需修改代码即可增加新关卡或新题”应作为后期目标

这对长期很好，但 MVP 不必做到。

建议改为：

```text
MVP 阶段允许通过 TypeScript 配置新增题目；
后期再支持 JSON/YAML 热加载。
```

### 5.3 “App 2 预研”继续保持冻结

当前用户核心痛点和 App 2 节奏工坊无关。

建议：

```text
在第一个 MVP 验证完成前，不再推进 App 2 技术预研。
```

---

## 6. 最终建议

保留当前架构的长期方向，但代码落地时采用更小的第一步：

1. 不推翻 React/Vite/TS/Tailwind/SVG/Tonal/Zustand 的选择
2. 不急着实现完整题库系统
3. 先实现 `docs/product/mvp-learning-loop-review.md` 定义的 4 个题型
4. 用模块边界为未来抽象留接口
5. 当第一个闭环有效后，再把重复逻辑提升为注册表和配置驱动

一句话：

> 架构方向对，但第一版要小；先让训练闭环活起来，再让架构长完整。

