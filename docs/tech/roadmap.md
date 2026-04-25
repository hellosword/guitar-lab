# Guitar Lab 暂定技术路线

> 本文档是项目当前阶段的执行纲领，聚焦「做什么、不做什么、按什么顺序做」。
> 详细技术设计见同目录下的 `tech-stack.md`，代码规范见根目录 `AGENTS.md`。
> 最后更新：2026-04-25

---

## 1. 产品路线：双 App，分阶段推进

| 阶段 | 产品 | 核心功能 | 状态 |
|------|------|---------|------|
| **Phase 1** | **App 1：指板记忆游戏** | 指板记忆训练（Level 1~6 认知难度） | **当前重点** |
| **Phase 2** | App 1 迭代 | 解锁高阶玩法、收集反馈、评估 App 2 | 远期 |
| **Phase 3** | **App 2：节奏工坊**（可选） | 高级节拍器 + 节奏打分 | 视数据决定 |

> 详细分析见 `docs/product/two-app-architecture.md`。

---

## 2. 跨平台方案：PWA + Capacitor，拒绝 Electron

```
桌面端（Win / macOS / Linux） → PWA（vite-plugin-pwa）
移动端（iOS / Android）      → Capacitor（同一套 Web 代码打包）
```

**不选 Electron 的核心原因**：包体积 100MB+、不支持移动端、能力过剩（Guitar Lab 无深度文件系统需求）。详细论证见 `docs/research/electron-vs-pwa-lessons-for-guitarlab.md`。

---

## 3. 技术选型结论

| 层级 | 选型 | 详细论证 |
|------|------|---------|
| 构建 | Vite 5 | `tech-stack.md` 第 2 节 |
| 框架 | React 18 + TypeScript 5 | `tech-stack.md` 第 2 节 |
| 样式 | Tailwind CSS 3 | `tech-stack.md` 第 2 节 |
| 状态 | Zustand 4 | `tech-stack.md` 第 2 节 |
| 路由 | React Router 6 | `tech-stack.md` 第 2 节 |
| 乐理 | Tonal.js | `tech-stack.md` 第 3 节 |
| 音频 | Tone.js + Web Audio API | `tech-stack.md` 第 3、5 节 |
| 存储 | Dexie.js (IndexedDB) | `tech-stack.md` 第 2 节 |
| PWA | vite-plugin-pwa | `tech-stack.md` 第 7 节 |
| 移动端 | Capacitor 6 | `tech-stack.md` 第 7 节 |

> 完整技术选型、架构图、节拍器实现、节奏打分算法、目录结构规划等见 `tech-stack.md`。

---

## 4. 数据策略：Local-first，用户完全拥有数据

- **所有数据本地存储**：IndexedDB（Web）/ Capacitor Preferences（App）
- **开放格式**：进度/成绩可导出 JSON，题库用 JSON/YAML 配置
- **无强制云端**：App 1 完全单机化，不做同步，降低复杂度
- **隐私承诺**：音频数据仅本地分析，不上传服务器

> 受 Obsidian Local-first 架构启发。详见 `docs/research/obsidian-lessons-for-guitarlab.md`。

---

## 5. 题库系统：数据驱动，高可拓展

**核心原则**：题目 = 配置数据 + 通用引擎，禁止硬编码分支。

- **PlayMode 注册表**：每种新题型注册配置即可，不改核心代码
- **三层抽象**：玩法映射（L1）/ 题目形式（L2）/ 具体题目（L3），L1 与 L2 正交
- **参数化配置**：难度曲线（品格范围、调式、音阶类型）全部通过配置控制
- **答案与交互解耦**：答案类型决定交互组件，不由题型硬编码

> 详细设计见 `docs/tech/question-bank-architecture.md`。

---

## 6. 关键「不做」决策

| 不做的事项 | 原因 | 替代方案 |
|-----------|------|---------|
| ❌ Electron | 包体积大、不支持移动端、能力过剩 | PWA |
| ❌ MVP 阶段插件系统 | 安全隐患、维护负担、非核心需求 | 后期用 JSON/YAML 数据驱动扩展 |
| ❌ App 1 同步功能 | 复杂度极高、非刚需 | 本地导出/导入 JSON |
| ❌ Canvas 渲染指板 | 事件处理不便、CSS 动画受限 | **SVG 唯一方案** |
| ❌ 后台节拍器（Phase 1） | PWA 无法后台播放音频 | Phase 1 不需要；远期用 Capacitor 原生插件 |

---

## 7. 落地优先级

### 近期（App 1 MVP）

- [ ] 搭建项目骨架（Vite + React + TS + Tailwind + Capacitor）
- [ ] 核心组件：SVG 指板图、音名选择器、唱名选择器
- [ ] 乐理引擎封装：Tonal.js 统一入口
- [ ] 音频引擎封装：Tone.js Transport 初始化与自动播放策略处理
- [ ] PlayMode 注册表 + 题目生成器框架
- [ ] Level 1~3 题库配置与难度曲线
- [ ] PWA 离线缓存配置
- [ ] Capacitor 移动端打包验证

### 中期（App 1 迭代）

- [ ] 自定义题库（JSON/YAML 导入）
- [ ] 用户进度统计与可视化
- [ ] 解锁 Level 4~6 高阶玩法
- [ ] 收集用户反馈与留存数据

### 远期（App 2 评估）

- [ ] 决定是否启动节奏工坊
- [ ] 评估后台音频需求：Capacitor 原生音频插件可行性
- [ ] 高精度节拍器的 Tone.js 复杂节奏型调度验证

---

## 8. 代码风格与规范

- 源代码与注释用**中文**，变量/函数/类型命名用**英文**
- TS 严格模式，禁止 `any`
- 状态变更通过 Zustand store，禁止直接修改状态对象
- 指板渲染唯一方案为 **SVG**
- 交互规范以 `docs/product/guitar-fretboard-game-design.md` 第 4 节为准

> 完整规范见根目录 `AGENTS.md`。

---

## 9. 文档索引

| 类别 | 文档 | 内容 |
|------|------|------|
| 产品 | `docs/product/guitar-fretboard-game-design.md` | 6 层认知难度、玩法组合、答题交互规范 |
| 产品 | `docs/product/two-app-architecture.md` | 双 App 拆分逻辑、成本对比、决策树 |
| 技术 | `docs/tech/tech-stack.md` | 完整技术选型、架构图、节拍器/打分算法、目录结构 |
| 技术 | `docs/tech/question-bank-architecture.md` | 题库系统架构设计 |
| 调研 | `docs/research/obsidian-architecture.md` | Obsidian 技术架构调研 |
| 调研 | `docs/research/obsidian-lessons-for-guitarlab.md` | Obsidian 对 Guitar Lab 的启示 |
| 调研 | `docs/research/electron-vs-pwa-architecture.md` | Electron vs PWA 通用对比 |
| 调研 | `docs/research/electron-vs-pwa-lessons-for-guitarlab.md` | Electron vs PWA 选型结论 |
