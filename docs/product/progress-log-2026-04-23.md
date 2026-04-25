# Guitar Lab — 阶段性进展日志

> 日期：2026-04-23  
> 今日主题：技术选型深度探讨与竞品调研  
> 状态：设计阶段完成，技术方案定型，准备进入开发

---

## 一、今日完成事项

### 1. 项目初始化
- ✅ 创建 GitHub 仓库 `git@github.com:hellosword/guitar-lab.git`
- ✅ 初始化 Git 并推送初始提交
- ✅ 建立 `Design/` 文档目录

### 2. 技术选型方案（tech-stack.md）
**核心结论**：Web-First + Capacitor 混合架构

| 层级 | 选型 | 理由 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 生态成熟，类型安全 |
| 构建工具 | Vite | 热更新极快，配置极简 |
| 样式 | Tailwind CSS | 原子化CSS，快速迭代 |
| 状态管理 | Zustand | 轻量，适合游戏状态 |
| 乐理计算 | Tonal.js | 业界标准，避免自研 |
| 音频引擎 | Tone.js + Web Audio API | 精确调度，生态丰富 |
| 指板渲染 | SVG | 事件处理方便，矢量缩放 |
| 移动端打包 | Capacitor | 一套代码覆盖 Web + App |

### 3. 跨平台开发知识指南（cross-platform-guide-for-game-devs.md）
从游戏程序员视角系统讲解 Web/移动端跨平台开发：
- 浏览器 ≈ 游戏引擎运行时
- HTML/CSS/JS ≈ GameObject + Material + Script
- 事件循环 vs 游戏主循环（关键差异）
- 四种跨平台方案对比（原生/RN/Flutter/Capacitor）
- Capacitor 的详细工作流程

### 4. Rocksmith 技术调研（rocksmith-tech-analysis.md）
**关键发现**：
- Rocksmith 使用 **Gamebryo 引擎**（非 Unity/UE）
- 自研 C++ DSP 模块实现多音实时检测
- Real Tone Cable：48kHz/16-bit，原始波形传输（非 MIDI）
- 核心算法：FFT 频谱分析 + 基频峰值检测 + 泛音列验证
- 我们的差异化：不做音高检测（最难），做 onset 检测（简单一个量级）

### 5. App Store 音频 App 调研（audio-apps-tech-survey.md）
**竞品技术栈**：
| App | 技术栈 | 关键洞察 |
|-----|--------|---------|
| Yousician / GuitarTuna | React Native + C++ 原生音频 | UI 跨平台，音频下沉原生 |
| BandLab | 原生 UI + 云端音频处理 | 取巧路线，不适用我们 |
| GarageBand | Swift + Core Audio（Apple独占） | 标杆但无法照搬 |
| Soundbrenner | 原生 + 硬件生态 | 触觉反馈是差异化亮点 |

**RevenueCat 2026 数据**：框架选择对收入影响远小于执行质量。

### 6. 双 App 架构分析（two-app-architecture.md）
**提出的创新架构**：
- **Core App**（Capacitor）：指板游戏 + 基础节拍器 + 爱好者级打分
- **Pro App**（原生 iOS/Android）：高精度节奏打分 + 高级节拍器

**推荐实施策略**：先单 App 验证，3-6 个月后评估是否拆分。

---

## 二、关键决策记录

| 决策项 | 结论 | 时间 |
|--------|------|------|
| 跨平台方案 | **Capacitor**（Web-First） | 2026-04-23 |
| 后台音频 | 前台优先，保留原生扩展可能性 | 2026-04-23 |
| 节奏打分精度 | 爱好者级 ±50ms（MVP），专业级 ±10ms 预留 | 2026-04-23 |
| 双 App 架构 | 先单 App，数据驱动后评估拆分 | 2026-04-23 |
| 音高检测 | **暂不做**（复杂度太高，非核心需求） | 2026-04-23 |

---

## 三、核心认知升级

### 1. Web Audio API 的能力边界
- ✅ 节拍器精确计时（亚毫秒级）
- ✅ 麦克风采集 + onset 检测（±50ms 够用）
- ✅ 音频合成 + 效果器链（Tone.js）
- ❌ 专业级音高检测（多音分离，需要 C++ DSP）
- ❌ 后台音频播放（需要原生服务）

### 2. 音频 App 的"不可能三角"
```
         低延迟
          /\
         /  \
        /    \
       /  ?   \
      /________\
  跨平台    开发效率
```
破解方案：双 App 架构（Core 追求跨平台+效率，Pro 追求低延迟）

### 3. 竞品避开的"坑"
- Rocksmith/Yousician：投入大量资源解决多音实时检测（DSP 难题）
- BandLab：云端处理解决性能问题（但需要联网）
- **我们的选择**：不做音高检测，做 onset 检测（难度降一个量级）

---

## 四、下一步待办（明日继续）

### 高优先级
- [ ] 搭建项目骨架（Vite + React + TypeScript）
- [ ] 配置 Tailwind CSS + Zustand
- [ ] 初始化 Capacitor（添加 iOS/Android 平台）
- [ ] 安装核心依赖（Tone.js, Tonal.js, dexie.js）

### 中优先级
- [ ] 设计指板图 SVG 组件原型
- [ ] 实现基础乐理计算层（基于 Tonal.js 封装）
- [ ] 实现基础节拍器（Tone.js Transport）
- [ ] **调研 AI Agent 时代的设计类工具**（交互设计 / AI 自动化设计 / 图片生成）

### 低优先级（后续迭代）
- [ ] 节奏打分 MVP（onset 检测 + 对齐评分）
- [ ] 题库系统 + 难度曲线
- [ ] 用户进度/成就系统
- [ ] PWA 配置

---

## 五、文档清单

| 文档 | 路径 | 说明 |
|------|------|------|
| 游戏设计文档 | `Design/guitar-fretboard-game-design.md` | 核心玩法与交互设计 |
| 技术选型方案 | `Design/tech-stack.md` | 完整技术栈与架构 |
| 跨平台开发指南 | `Design/cross-platform-guide-for-game-devs.md` | 面向游戏程序员的 Web 开发入门 |
| Rocksmith 技术分析 | `Design/rocksmith-tech-analysis.md` | 竞品技术调研 |
| 音频 App 调研 | `Design/audio-apps-tech-survey.md` | App Store 音频 App 技术栈分析 |
| 双 App 架构 | `Design/two-app-architecture.md` | 拆分方案与实施策略 |
| **本进展日志** | `Design/progress-log-2026-04-23.md` | 今日成果总结 |

---

> 今日结束。明天开始写代码！🎸
