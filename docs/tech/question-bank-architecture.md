# 题库系统架构设计

> 状态：设计草案
> 最后更新：2026-04-25
> 对应设计文档：`Design/guitar-fretboard-game-design.md`

---

## 1. 设计目标

题库系统是 Guitar Lab App 1（指板记忆游戏）的核心引擎。本架构设计遵循以下**不可妥协**的指导方针：

1. **可拓展性优先**：新增题目类型、形式、具体题目时，不应需要修改核心引擎代码
2. **数据驱动 / 配置驱动**：题目 = 配置数据 + 通用引擎，而非代码逻辑
3. **参数化配置**：所有可变因素（难度、范围、题型组合）均通过配置控制

---

## 2. 核心概念模型

### 2.1 题目类型的三层抽象

为避免混淆，先定义三个层级的概念：

| 层级 | 名称 | 含义 | 示例 |
|------|------|------|------|
| **L1** | 玩法映射 (PlayMode) | "已知 A 求 B" 的抽象逻辑 | P→N、N→P、P+K→S、P₁+I→P₂ |
| **L2** | 题目形式 (QuestionForm) | 用户如何与题目交互 | 单点点击、多点点击、选项选择、判断对错、顺序点击 |
| **L3** | 具体题目 (Question) | 一次练习中的具体实例 | "三弦2品是什么音名？" → 答案 A |

**关键设计**：L1 和 L2 是**正交**的——同一 PlayMode 可以用不同 QuestionForm 呈现，同一 QuestionForm 可以服务于不同 PlayMode。

### 2.2 与现有设计文档的对应

`Design/guitar-fretboard-game-design.md` 中的 6 层认知难度主要描述的是 **L1 玩法映射** 的演进：

- Level 1：P↔N（位置与音名的双向映射）
- Level 2：引入 K（调式）→ P+K→S、N+K→S
- Level 3：引入 I（音程）→ P₁+I→P₂
- Level 4：引入 C+D（和弦与音级）
- Level 5：引入 Scale + Position
- Level 6：多声部分析

本架构设计确保：Level 1~6 不是 6 套硬代码，而是**同一套引擎读取的 6 种配置**。

---

## 3. 配置 Schema 设计

### 3.1 题目类型定义（PlayMode Config）

每种 PlayMode 通过一个配置对象定义其逻辑：

```typescript
// types/question-config.ts

interface PlayModeConfig {
  id: string;                    // 唯一标识，如 "p-to-n"
  name: string;                  // 显示名称，如 "位置→音名"
  level: number;                 // 所属认知层级 1~6
  
  // 输入：题目生成时需要的"已知条件"
  inputs: InputDef[];
  
  // 输出：用户需要回答的"目标"
  output: OutputDef;
  
  // 可用的题目形式（L2 层）
  supportedForms: string[];
  
  // 题目生成策略
  generator: GeneratorConfig;
  
  // 答案校验规则
  validator: ValidatorConfig;
}

interface InputDef {
  key: string;                   // 如 "position"
  type: 'position' | 'note' | 'key' | 'interval' | 'chord' | 'degree' | 'scale-type';
  source: 'random' | 'fixed' | 'derived';  // 随机生成 / 固定值 / 由其他输入派生
}

interface OutputDef {
  key: string;                   // 如 "noteName"
  type: 'note' | 'position' | 'interval' | 'solfeggio' | 'degree' | 'boolean';
  // 答案的"媒介形式"：用户通过什么 UI 组件回答
  answerMedium: 'fretboard-click' | 'note-selector' | 'solfeggio-selector' | 'option-buttons' | 'boolean-buttons' | 'sequence-click';
}
```

### 3.2 具体题目的参数化配置

一道具体题目不是代码，而是配置数据：

```json
{
  "playModeId": "p-to-n",
  "formId": "single-fretboard-click",
  "difficulty": {
    "fretRange": [0, 3],
    "stringRange": [1, 6],
    "allowedKeys": ["C"]
  },
  "content": {
    "position": { "string": 3, "fret": 2 },
    "questionText": "这个位置是什么音名？"
  },
  "answer": {
    "noteName": "A",
    "equivalentNotes": [],
    "tolerance": "exact"
  },
  "metadata": {
    "tags": ["level-1", "open-position", "natural-notes"],
    "estimatedTime": 5,
    "hint": "三弦空弦是 G，每品升高半音"
  }
}
```

### 3.3 关卡配置（Level Config）

关卡不是"第几关 = 哪几道题"的硬编码，而是**筛选 + 生成规则**：

```json
{
  "levelId": "l1-03",
  "name": "开放把位音名识别",
  "unlockCondition": { "previousLevelCompleted": "l1-02" },
  "questionPool": {
    "mode": "generated",           // generated | fixed-list
    "playModes": ["p-to-n"],
    "forms": ["single-fretboard-click", "tab-to-n"],
    "difficultyProfile": {
      "fretRange": [0, 3],
      "stringRange": [1, 6],
      "keys": ["C", "G"],
      "noteTypes": ["natural"]
    },
    "count": 10,                   // 本关共 10 题
    "shuffle": true,
    "noRepeat": true               // 同一局内不重复相同题目
  },
  "scoring": {
    "baseScore": 100,
    "timeBonus": true,
    "streakMultiplier": true
  },
  "passCondition": {
    "minCorrect": 8,
    "minAccuracy": 0.8
  }
}
```

---

## 4. 引擎架构

### 4.1 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         题库引擎                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ PlayMode    │    │ Question    │    │ Level               │  │
│  │ Registry    │    │ Generator   │    │ Config              │  │
│  │ (玩法定义)   │    │ (题目生成)   │    │ (关卡配置)          │  │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘  │
│         │                  │                       │             │
│         ▼                  ▼                       ▼             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Game Engine                            │  │
│  │  1. 加载关卡配置 → 解析 playModeId + difficultyProfile   │  │
│  │  2. 调用对应 Generator 生成具体题目实例                   │  │
│  │  3. 根据 output.answerMedium 选择渲染组件               │  │
│  │  4. 用户作答 → 调用对应 Validator 校验                  │  │
│  │  5. 记录结果 → 进入下一题                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 PlayMode 注册表

每种 PlayMode 向系统注册时，只需提供：

```typescript
// modules/fretboard-game/play-modes/p-to-n.ts

export const pToNPlayMode: PlayModeConfig = {
  id: 'p-to-n',
  name: '位置→音名',
  level: 1,
  inputs: [
    { key: 'position', type: 'position', source: 'random' }
  ],
  output: {
    key: 'noteName',
    type: 'note',
    answerMedium: 'note-selector'
  },
  supportedForms: ['single-fretboard-click', 'tab-display'],
  generator: {
    type: 'position-to-note',
    // 生成器逻辑由通用乐理引擎处理
    // 这里只声明依赖
    dependsOn: ['theory-engine']
  },
  validator: {
    type: 'exact-match',
    // 是否接受等音（如 Gb 是否算 F# 的答案）
    acceptEnharmonic: false,
    // 大小写敏感
    caseSensitive: false
  }
};

// 注册到系统
playModeRegistry.register(pToNPlayMode);
```

### 4.3 渲染组件映射表

答题交互组件根据 `answerMedium` 自动选择，**不由题型硬编码**：

```typescript
// components/answer-mediums/registry.ts

const answerMediumComponents: Record<string, React.FC<AnswerMediumProps>> = {
  'fretboard-click': FretboardInput,
  'fretboard-multi-click': FretboardMultiInput,
  'note-selector': NoteSelector,
  'solfeggio-selector': SolfeggioSelector,
  'option-buttons': OptionButtons,
  'boolean-buttons': BooleanButtons,
  'sequence-click': SequenceFretboardInput,
};

// 在题目展示时自动路由
function AnswerRouter({ medium, ...props }: { medium: string }) {
  const Component = answerMediumComponents[medium];
  if (!Component) throw new Error(`Unknown answer medium: ${medium}`);
  return <Component {...props} />;
}
```

---

## 5. 生成器（Generator）设计

### 5.1 生成器的职责

生成器负责将"配置 + 难度参数"转化为"具体的、可展示的题目实例"。

```typescript
interface QuestionGenerator {
  // 根据难度配置和随机种子，生成一道具体题目
  generate(config: GeneratorConfig, difficulty: DifficultyProfile, seed?: string): Question;
}
```

### 5.2 生成器类型

| 生成器类型 | 用途 | 示例 |
|-----------|------|------|
| `RandomPosition` | 随机生成指板位置，反查音名 | P→N、P+K→S |
| `RandomNote` | 随机生成音名，反查所有位置 | N→P |
| `IntervalWalk` | 从根音出发，按音程计算目标位置 | P₁+I→P₂ |
| `ChordBuilder` | 根据和弦类型和根音，生成构成音位置 | C+D+RootP→P |
| `ScaleMap` | 根据调式和把位，生成音阶音位置 | K+Scale+Position→AllP |
| `SequencePath` | 生成唱名序列对应的位置路径 | S序列→P序列 |

每种生成器独立实现，通过 `generator.type` 字段由引擎路由调用。

### 5.3 随机性与可复现性

- 每局游戏使用一个**随机种子**（可由用户分享）
- 相同种子 + 相同关卡配置 = 相同题目序列
- 支持"重玩同一局"、"分享挑战给朋友"等功能

---

## 6. 校验器（Validator）设计

### 6.1 校验器的职责

校验器负责判定用户的回答是否正确，以及计算得分。

```typescript
interface AnswerValidator {
  // 判定正误
  validate(userAnswer: unknown, correctAnswer: unknown, config: ValidatorConfig): ValidationResult;
  
  // 计算得分（可选，部分校验器只返回对错）
  calculateScore?(result: ValidationResult, timeSpent: number, streak: number): number;
}

interface ValidationResult {
  isCorrect: boolean;
  // 部分正确（如多点点击题中答对部分位置）
  partialCorrect?: boolean;
  // 正确答案提示（用于显示给用户）
  correctAnswer?: unknown;
  // 详细反馈（如"漏掉了四弦4品"）
  feedback?: string;
}
```

### 6.2 校验器类型

| 校验器类型 | 用途 | 示例 |
|-----------|------|------|
| `ExactMatch` | 精确匹配 | 音名、唱名、音程类型 |
| `PositionSetMatch` | 位置集合匹配 | N→P（多点点击），支持：全对/漏点/误点 |
| `SequenceMatch` | 顺序匹配 | S序列→P序列，检查顺序和位置 |
| `BooleanMatch` | 布尔判断 | 判断对错题 |
| `ToleranceMatch` | 容差匹配 | 音分容忍（未来调音器功能） |

### 6.3 多点点击题的评分策略

以 N→P（音名→所有位置）为例：

```json
{
  "validator": {
    "type": "position-set-match",
    "scoring": {
      "mode": "partial",
      "correctPoint": 10,
      "wrongPointPenalty": 5,
      "missedPointPenalty": 3,
      "requireAllCorrect": false,
      "minScoreToPass": 0.6
    }
  }
}
```

---

## 7. 难度曲线的配置化

### 7.1 难度维度

`Design/guitar-fretboard-game-design.md` 中定义了多个独立的难度维度，这些维度全部参数化：

```typescript
interface DifficultyProfile {
  // 品格范围
  fretRange: [number, number];
  
  // 弦范围
  stringRange: [number, number];
  
  // 把位限制
  positionConstraints?: ('open' | 'caged-c' | 'caged-a' | 'caged-g' | 'caged-e' | 'caged-d')[];
  
  // 调式范围
  allowedKeys: string[];
  
  // 音阶类型
  allowedScales?: string[];
  
  // 和弦类型
  allowedChords?: string[];
  
  // 音程类型
  allowedIntervals?: string[];
  
  // 音符类型
  noteTypes?: ('natural' | 'sharp' | 'flat')[];
  
  // 时间限制（秒）
  timeLimit?: number;
  
  // 选项数量（选择题用）
  optionCount?: number;
}
```

### 7.2 难度组合配置

关卡配置通过组合难度维度来控制体验：

```json
{
  "levelId": "l3-01",
  "name": "音程初探",
  "questionPool": {
    "playModes": ["p1-plus-i-to-p2"],
    "difficultyProfile": {
      "fretRange": [0, 5],
      "stringRange": [1, 6],
      "allowedKeys": ["C", "G", "F"],
      "allowedIntervals": ["P4", "P5", "M3", "m3"],
      "noteTypes": ["natural"],
      "timeLimit": 15
    }
  }
}
```

---

## 8. 与 Obsidian 借鉴的关联

本架构直接应用了 Obsidian 调研中的两条核心经验：

1. **数据驱动扩展**（Obsidian 的 Markdown 即数据）
   - Guitar Lab 的题目即配置，配置即数据
   - 无需发布新版本即可更新题库
   - 用户可导入/导出/分享题库配置

2. **分层 API 抽象**（Obsidian 的 Vault / Workspace / MetadataCache）
   - PlayMode Registry ≈ Vault（数据定义层）
   - Game Engine ≈ Workspace（编排调度层）
   - Question Generator ≈ MetadataCache（生成/索引层）

---

## 9. 待决策事项

| 事项 | 选项 | 建议 |
|------|------|------|
| 配置格式 | JSON vs YAML | JSON 优先（TypeScript 生态友好），YAML 后期支持 |
| 配置校验 | JSON Schema vs Zod | Zod（运行时校验 + 类型推断） |
| 题库热更新 | 运行时加载 vs 构建时打包 | MVP 构建时打包，后续支持运行时加载 |
| 用户自定义题库 | 文件导入 vs 内置编辑器 | 文件导入优先（JSON/YAML），降低复杂度 |
| 随机种子 | 时间戳 vs 可分享字符串 | 可分享短字符串（如 `guitar-lab.io/challenge/abc123`） |

---

## 10. 文件目录规划（预期）

```
src/modules/fretboard-game/
├── play-modes/                    # PlayMode 配置与注册
│   ├── index.ts                   # 注册表入口
│   ├── p-to-n.ts                  # 位置→音名
│   ├── n-to-p.ts                  # 音名→位置
│   ├── p-k-to-s.ts                # 位置+调式→唱名
│   ├── p1-i-to-p2.ts             # 位置+音程→目标位置
│   └── ...                        # 其他玩法映射
│
├── generators/                    # 题目生成器
│   ├── index.ts
│   ├── random-position.ts
│   ├── random-note.ts
│   ├── interval-walk.ts
│   └── ...
│
├── validators/                    # 答案校验器
│   ├── index.ts
│   ├── exact-match.ts
│   ├── position-set-match.ts
│   └── ...
│
├── levels/                        # 关卡配置
│   ├── index.ts                   # 关卡加载器
│   ├── level-1/                   # Level 1 关卡配置
│   ├── level-2/
│   └── ...
│
├── engine/                        # 游戏引擎核心
│   ├── GameEngine.ts              # 主引擎：加载→生成→校验→计分
│   ├── QuestionLoader.ts          # 题目配置加载与校验
│   └── ScoreCalculator.ts         # 得分计算
│
└── types/
    └── question.ts                # 题目相关类型定义
```
