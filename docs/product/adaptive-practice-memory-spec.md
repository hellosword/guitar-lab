# 自适应练习记忆系统规格 v1

> 版本目标：v0.0.4
> 当前状态：设计规格，待实现
> 最后更新：2026-05-03

---

## 1. 背景

Guitar Lab 当前已经具备基础练习循环、练习模式选择、音名定位题，以及“本轮内熟练位置预标记”能力。

但系统仍然缺少一个关键能力：

> 它还不能长期记住用户在哪些“位置 / 音名 / 唱名映射”上慢或容易错。

这会导致两个问题：

- 用户每轮练习结束后，系统不能给出清晰的薄弱点反馈。
- 后续出题仍然接近随机，无法主动把薄弱映射带回练习。

本规格定义 v1 版本的“自适应练习记忆系统”，让产品第一次具备最小的长期学习闭环。

---

## 2. 目标

### 2.1 产品目标

- 记录用户答题过程中的正确性与反应时间。
- 按映射项聚合熟练度，而不是只按整题统计。
- 找出相对慢、容易错、容易漏的位置或映射。
- 后续出题轻微提高弱点出现概率。
- 练习结束后给用户一个简短、可理解的弱点摘要。
- 支持导入/导出完整 JSON，让用户拥有自己的练习数据。
- 开发期自动同步数据到工作区 JSON，方便 Codex 直接读取并分析参数合理性。

### 2.2 学习目标

优先服务当前核心学习需求：

> 建立开放把位内“指板位置 -> 音名 -> 首调唱名”的快速映射，尤其是 G 大调。

v1 优先覆盖：

- C 大调 0-3 品
- G 大调 0-4 品
- 指板位置 -> 音名
- 指板位置 -> 唱名
- 音名 -> 唱名
- 音名 -> 所有目标位置

---

## 3. 非目标

v1 不做：

- 账号系统。
- 云同步。
- 跨设备实时同步。
- 高级统计图表。
- 成就、等级、积分系统。
- 复杂机器学习算法。
- Dexie / IndexedDB 正式数据表迁移。
- 后台管理页面。
- 把全部题库系统重构为完整配置驱动架构。

---

## 4. 核心原则

### 4.1 最小统计单位是映射项

自适应训练的最小统计单位不是“题目”，而是“映射项”。

例如“音名定位”题：

```text
题目：找出所有 B
目标：
  2 弦 0 品
  3 弦 4 品
  5 弦 2 品
```

用户可能：

- 很快点出 `2 弦 0 品`
- 很慢才点出 `3 弦 4 品`
- 漏掉 `5 弦 2 品`

这三者必须被拆开记录：

```text
B @ 2 弦 0 品：快，熟练度提高
B @ 3 弦 4 品：慢，弱点分提高
B @ 5 弦 2 品：漏点，弱点分明显提高
```

不能只记录成：

```text
本题 B 答错 / 答慢
```

### 4.2 相对慢优先，绝对阈值只用于异常过滤

用户水平差异很大。新手可能整体反应时间在 20-50 秒，熟练用户可能都在 1 秒以内。

因此 v1 不使用固定“超过 2.5 秒就是慢”的策略。

慢题判断以个人分布为主：

```text
在同类样本中明显偏慢 = 慢
```

但需要一个最长有效反应时间，用来过滤喝水、接电话、离开电脑等异常数据。

### 4.3 数据必须可拥有、可迁移、可升级

练习数据不能只“神秘地藏在浏览器里”。

v1 必须支持：

- 本地持久化。
- 导出完整 JSON。
- 导入完整 JSON。
- 数据结构版本号。
- 未来 migration 入口。
- 开发期自动同步到工作区文件。

---

## 5. 用户体验

### 5.1 练习中

用户正常答题，不需要手动管理统计。

系统后台记录：

- 题型
- 调性
- 映射类型
- 位置
- 音名
- 唱名
- 正确 / 错误 / 漏点 / 误点
- 反应时间
- 是否被忽略为异常耗时

### 5.2 练习结束

总结页增加轻量“本轮重点”区域。

示例：

```text
本轮重点
- G 大调：D -> So 反应偏慢
- 3 弦 4 品 B 漏点 2 次
- F# 相关位置建议复练
```

不做沉重排行榜，不制造考试感。

### 5.3 数据管理

提供轻量数据操作：

- 导出练习数据
- 导入练习数据
- 清空练习记忆

放置位置可以先在总结页或设置区域，v1 不需要独立设置页。

---

## 6. 数据存储

### 6.1 正式用户存储

v1 使用 `localStorage` 保存 typed JSON。

建议 key：

```text
guitarLab.practiceMemory.v1
```

理由：

- 实现成本低。
- 适合当前 MVP。
- 配合导入/导出后，用户仍然可以拥有数据。
- 等数据模型稳定后，再考虑迁移到 IndexedDB / Dexie。

### 6.2 导出 JSON

导出文件命名建议：

```text
guitar-lab-practice-memory-YYYYMMDD-HHmmss.json
```

导出内容必须是完整数据，不只导出摘要。

### 6.3 导入 JSON

导入时必须：

- 校验 JSON 结构。
- 校验 `schemaVersion`。
- 旧版本走 migration。
- 未来版本提示不兼容，不强行导入。
- 导入前提示会覆盖当前本地练习记忆。

### 6.4 开发期自动同步

开发期为了便于参数分析，App 可在答题后自动把完整数据同步到本地静态服务器。

建议接口：

```text
POST /__dev/practice-data
GET  /__dev/practice-data
```

服务器写入：

```text
.dev/practice-data.json
```

`.dev/` 必须加入 `.gitignore`，不提交。

如果当前服务器不支持该接口，App 应静默跳过，不影响正式使用。

---

## 7. 数据 Schema v1

顶层结构建议：

```ts
export interface PracticeMemoryDocumentV1 {
  schemaVersion: 1;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  profile: PracticeMemoryProfile;
  configSnapshot: AdaptivePracticeConfigSnapshot;
  masteryMap: Record<string, MasteryEntryV1>;
  recentEvents: PracticeEventV1[];
}
```

### 7.1 profile

```ts
export interface PracticeMemoryProfile {
  id: string;
  displayName?: string;
}
```

v1 可生成本地匿名 id，不需要账号。

### 7.2 recentEvents

用于保留近期答题事件，方便练习总结和参数分析。

```ts
export interface PracticeEventV1 {
  id: string;
  createdAt: string;
  questionId: string;
  questionType: MvpQuestionType;
  key: SupportedKey;
  mappingKind: MappingKind;
  itemKey: string;
  outcome: PracticeOutcome;
  responseMs: number | null;
  ignoredReason?: PracticeIgnoredReason;
}
```

### 7.3 masteryMap

用于聚合长期熟练度。

```ts
export interface MasteryEntryV1 {
  itemKey: string;
  mappingKind: MappingKind;
  key: SupportedKey;
  noteName?: NoteName;
  solfeggio?: Solfeggio;
  positionId?: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  slowCount: number;
  ignoredCount: number;
  averageMs: number | null;
  lastMs: number | null;
  recentResponseMs: number[];
  lastSeenAt: string;
  weaknessScore: number;
  fastCorrectStreak: number;
}
```

### 7.4 枚举

```ts
export type MappingKind =
  | 'position-to-note'
  | 'position-to-solfeggio'
  | 'note-to-solfeggio'
  | 'note-to-position';

export type PracticeOutcome =
  | 'correct'
  | 'wrong'
  | 'slow-correct'
  | 'fast-correct'
  | 'missed-position'
  | 'extra-position'
  | 'ignored';

export type PracticeIgnoredReason =
  | 'response-too-long'
  | 'no-response-time'
  | 'unsupported-question';
```

---

## 8. itemKey 设计

`itemKey` 必须稳定、可读、可迁移。

建议格式：

```text
{mappingKind}|{key}|{noteName}|{solfeggio}|{positionId}
```

示例：

```text
position-to-note|G|B||string-2-fret-0
position-to-solfeggio|G|B|Mi|string-2-fret-0
note-to-solfeggio|G|D|So|
note-to-position|G|B||string-3-fret-4
```

注意：

- `note-to-position` 是位置级记录，不是整题级记录。
- 同一个音名的多个目标位置必须拥有不同 `itemKey`。
- 后续若位置命名规则变化，必须通过 migration 处理。

---

## 9. 策略配置文件

自适应参数不应散落在代码里。

v1 新增配置文件：

```text
src/modules/fretboard-game/adaptivePracticeConfig.ts
```

示例：

```ts
export const ADAPTIVE_PRACTICE_CONFIG = {
  schemaVersion: 1,
  recentWindowSize: 50,
  minSamplesForRelativeSlow: 10,
  slowPercentile: 0.7,
  slowMedianMultiplier: 1.35,
  maxValidResponseMs: 60_000,
  weaknessScore: {
    wrong: 3,
    missedPosition: 3,
    extraPosition: 3,
    slow: 1,
    fastCorrect: -1,
    repeatedFastCorrectBonus: -1,
  },
  weighting: {
    baseWeight: 1,
    maxWeaknessBonus: 3,
    maxFinalWeight: 4,
  },
};
```

后续可以演进为后台配置页；v1 先集中在项目配置文件中。

---

## 10. 慢题判断

### 10.1 异常耗时过滤

如果：

```text
responseMs > maxValidResponseMs
```

则认为用户可能离开练习，不将该反应时间计入慢题分布，也不增加弱点分。

记录为：

```text
outcome = ignored
ignoredReason = response-too-long
```

### 10.2 相对慢判断

按分组计算个人分布。

分组维度：

```text
questionType + key + mappingKind
```

当同组有效样本数小于 `minSamplesForRelativeSlow` 时：

- 只记录数据。
- 不判定 slow。
- 不因慢而增加弱点分。

当样本数足够后：

```text
候选慢题 = 反应时间位于同组后 30%
```

但还要满足：

```text
responseMs >= medianMs * slowMedianMultiplier
```

才真正记为慢。

这样可以避免熟练用户在 `0.7s` 与 `0.8s` 的微小差异中被硬标慢。

### 10.3 不使用统一固定慢题阈值

v1 不使用：

```text
responseMs > 2500ms => slow
```

这类规则。

原因：

- 新手整体慢时，固定阈值没有区分度。
- 熟练用户整体快时，固定阈值无法发现相对短板。
- 不同题型天然耗时不同。

---

## 11. 弱点评分

每个映射项维护 `weaknessScore`。

建议规则：

```text
答错：+3
漏点：+3
误点：+3
相对慢但正确：+1
快且正确：-1
连续快答：额外 -1
异常耗时：0，不参与评分
```

边界：

```text
weaknessScore >= 0
```

是否设置最大值可在实现时决定，但出题权重必须有上限。

---

## 12. 出题加权

### 12.1 原则

自适应出题不应把练习变成纯错题本。

v1 只做轻微加权：

- 保留原有题型权重。
- 在题目内部选择位置 / 音名 / 唱名时，弱点项更容易出现。
- 加权有上限。

### 12.2 权重公式

建议：

```text
finalWeight = min(
  baseWeight + weaknessBonus,
  maxFinalWeight
)
```

其中：

```text
baseWeight = 1
weaknessBonus = clamp(weaknessScore, 0, maxWeaknessBonus)
```

默认：

```text
baseWeight = 1
maxWeaknessBonus = 3
maxFinalWeight = 4
```

也就是弱点最多变成普通项的 4 倍概率。

### 12.3 音名定位题的特殊处理

对于 `note-to-positions`：

- 选音名时，可以参考该音名下各位置弱点的聚合分。
- 展示题目时，已熟练位置可以继续预标为音名圆点。
- 需要用户点击的位置，应优先包含尚不熟练或弱点高的位置。
- 如果一个音名下所有位置都熟练，则回退为普通全位置练习，避免空题。

---

## 13. 开发期数据分析流程

开发阶段推荐流程：

```text
用户练习几轮
  -> App 写 localStorage
  -> App 自动 POST 到 /__dev/practice-data
  -> 静态服务器写 .dev/practice-data.json
  -> Codex 读取该 JSON
  -> 分析当前参数是否合理
```

Codex 可分析：

- 后 30% 慢题是否太激进。
- `slowMedianMultiplier` 是否太高或太低。
- `maxValidResponseMs` 是否合理。
- 弱点加权是否导致题目重复过多。
- 哪些题型统计维度不够细。
- 是否存在 UI 点击难度被误判为认知弱点。
- G 大调首调唱名是否确实比 C 大调弱。

---

## 14. UI 设计要求

### 14.1 总结页

增加“本轮重点”。

优先显示 2-4 条，不做长列表。

示例：

```text
本轮重点
G 大调 D -> So 偏慢
3 弦 4 品 B 容易漏
F# 相关位置建议复练
```

### 14.2 数据操作

提供：

- 导出练习数据
- 导入练习数据
- 清空练习记忆

v1 可使用普通按钮，不需要完整设置页。

### 14.3 开发期状态

如果开发同步成功，可不显示 UI。

如果需要调试，可在控制台输出简短信息，但不要打扰正式体验。

---

## 15. 测试计划

### 15.1 单元测试 / 纯函数测试

覆盖：

- itemKey 生成。
- schema 校验。
- migration v1。
- 相对慢判断。
- 异常耗时过滤。
- weaknessScore 更新。
- 加权选择。

### 15.2 E2E

覆盖：

- 答错后刷新页面，练习记忆仍存在。
- 导出 JSON 包含 `schemaVersion`、`appVersion`、`masteryMap`、`recentEvents`。
- 导入 JSON 后统计恢复。
- 清空练习记忆后统计消失。
- 音名定位题按位置记录漏点、误点、慢点。
- 后续题目更容易出现高弱点项。
- 现有练习模式选择不受影响。
- 指板记忆页不受影响。

### 15.3 开发期同步

覆盖：

- `POST /__dev/practice-data` 能写入 `.dev/practice-data.json`。
- 服务器不支持该接口时，前端静默失败，不影响练习。
- `.dev/` 不进入 Git。

---

## 16. v0.0.4 推荐实施顺序

1. 新增配置文件 `adaptivePracticeConfig.ts`。
2. 新增数据类型与 schema v1。
3. 实现 localStorage 读写。
4. 实现答题事件记录。
5. 实现音名定位的位置级记录。
6. 实现相对慢判断与异常耗时过滤。
7. 实现 weaknessScore 聚合。
8. 实现轻量出题加权。
9. 实现总结页“本轮重点”。
10. 实现导出 / 导入 / 清空。
11. 扩展静态服务器开发接口，写 `.dev/practice-data.json`。
12. 补测试。
13. 版本升至 `v0.0.4`。

---

## 17. 验收标准

v0.0.4 完成时，应满足：

- 页面显示版本 `v0.0.4`。
- 用户练习数据跨刷新保留。
- 用户可以导出完整 JSON。
- 用户可以导入完整 JSON。
- 数据结构带 `schemaVersion`。
- 异常超长反应时间不会污染慢题统计。
- 慢题判断基于个人相对分布，而不是统一固定阈值。
- 音名定位题按每个目标位置独立记录。
- 后续出题能轻微提高弱点项出现概率。
- 练习总结能显示 2-4 条本轮重点。
- 开发期能自动写 `.dev/practice-data.json`，Codex 可直接读取分析。

