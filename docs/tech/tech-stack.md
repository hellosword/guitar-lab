# Guitar Lab — 技术栈选型方案

> 文档日期：2026-04-22  
> 项目背景：吉他指板记忆训练游戏 + 高级节拍器 + 节奏打分玩法  
> 核心原则：**Web-First，一套代码同时覆盖网页版与移动端 App**

---

## 1. 总体架构

采用 **Web-First + Capacitor 混合架构**。所有业务逻辑、UI、音频处理均以 Web 技术实现，通过 Capacitor 包装为 iOS/Android 原生应用。

```
┌─────────────────────────────────────────────────────┐
│              Web 应用 (React + TypeScript)           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  指板记忆游戏 │  │  高级节拍器  │  │  节奏打分   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                      │
│  共用层                                               │
│  ├── Tonal.js    (乐理计算: 音名/音程/和弦/音阶/调式)  │
│  ├── Tone.js     (音频引擎: 合成/调度/节拍器核心)      │
│  ├── Web Audio API (原始音频: 麦克风采集/频谱分析)     │
│  └── Zustand     (状态管理: 游戏进度/配置/分数)        │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
   PWA (浏览器访问)                Capacitor (iOS/Android)
   - 无需审核，即开即用              - 原生安装体验
   - 适合快速验证与分享              - App Store / 应用商店分发
   - 受限于浏览器能力                - 可扩展原生插件(推送/后台音频等)
```

### 为什么选择这套架构？

| 需求 | 匹配点 |
|------|--------|
| 快速验证原型 | Web 技术热更新最快，Vite 秒级冷启动 |
| 网页版优先 | 本身就是 Web 应用，部署到 Vercel/Netlify 即可 |
| 最终移动端 App | Capacitor 直接包装，同一套代码零改动生成 App |
| 音频处理 | Web Audio API + Tone.js 在 Capacitor 的 WebView 中完全可用 |
| 乐理计算 | Tonal.js 生态直接复用，无需跨平台适配 |

---

## 2. 前端技术栈

| 层级 | 选型 | 版本建议 | 选型理由 |
|------|------|---------|---------|
| **语言** | TypeScript | ^5.4 | 类型安全，乐理数据结构复杂，强类型可避免大量运行时错误 |
| **框架** | React | ^18.3 | 生态最成熟，组件化适合指板图、选择器等复杂交互组件的封装与复用 |
| **构建工具** | Vite | ^5.0 | 冷启动/热更新极快（比 CRA 快 10 倍以上），ESM 原生支持，配置极简 |
| **样式方案** | Tailwind CSS | ^3.4 | 原子化 CSS，快速迭代 UI；与 React 配合无需维护大量 CSS 文件 |
| **状态管理** | Zustand | ^4.5 | 轻量（~1KB），无样板代码，适合游戏状态（当前题目、得分、解锁进度）的扁平化管理 |
| **路由** | React Router | ^6.22 | 三模块切换（游戏 / 节拍器 / 打分），支持未来扩展更多页面 |
| **Web 持久化** | dexie.js (IndexedDB) | ^3.2 | 用户进度、节奏型配置、历史成绩需要本地存储，IndexedDB 容量大且支持结构化查询 |
| **App 持久化** | Capacitor Preferences | — | Capacitor 原生插件，用于移动端轻量配置存储 |

### 未选方案说明

- **未选 Vue/Svelte**：React 的社区生态（尤其是音频/乐理相关的示例和库）更丰富，TypeScript 集成更成熟。
- **未选 Redux**：游戏状态虽复杂但结构扁平，Zustand 足够且代码量更少。
- **未选 CSS-in-JS (styled-components/emotion)**：Tailwind 在快速原型阶段更高效，且运行时性能更好。

---

## 3. 乐理与音频核心库

| 功能领域 | 选型 | 说明 |
|---------|------|------|
| **乐理计算** | [Tonaljs](https://tonaljs.github.io/) | 业界标准乐理库。覆盖：音名解析、音程计算、和弦构建与识别、音阶生成、调式转调、MIDI 转换等。完全避免自研乐理逻辑带来的边界错误（如等音、增减音程）。 |
| **音频合成与调度** | [Tone.js](https://tonejs.github.io/) | 基于 Web Audio API 的高级音乐库。核心能力：精确到音频采样时钟的 Transport 调度（解决 `setInterval` 不精确问题）、多种合成器音色、效果器链、节拍器循环。是高级节拍器的基石。 |
| **麦克风采集** | Web Audio API (原生) | `navigator.mediaDevices.getUserMedia()` + `AudioContext.createMediaStreamSource()` + `AnalyserNode`。标准 API，Capacitor 中完全支持。 |
| **后台音频 (预留)** | Capacitor Community Audio 或自定义原生插件 | 若未来需要锁屏/切换 App 时节拍器继续播放，需用原生音频服务替代 Tone.js 的输出层。节奏型配置和调度逻辑保持复用，仅替换"发声"这一层。 |

---

## 4. 指板渲染方案

### 决策：**SVG 作为唯一渲染方案**

吉他指板图、六线谱、音程高亮等所有图形元素均使用 SVG 绘制。

#### SVG 的优势

| 维度 | SVG | Canvas |
|------|-----|--------|
| **事件处理** | DOM 元素天然支持 `onClick`/`onMouseOver`，无需手动坐标命中检测 | 需手动计算点击坐标落在哪个图形上，代码复杂 |
| **矢量缩放** | 任意分辨率清晰显示，适配手机/平板/桌面 | 位图，高 DPI 屏会模糊（需额外处理） |
| **CSS 动画** | 可直接用 CSS `transition`/`animation` 做高亮闪烁、点击反馈 | 需手动在 `requestAnimationFrame` 中重绘 |
| **可访问性** | 可添加 `aria-label`，支持屏幕阅读器 | 无语义信息 |
| **开发效率** |  JSX 中直接写 `<rect>`/`<circle>`，声明式直观 | 命令式 API，状态管理复杂 |

#### 适用场景划分

| 媒介 | 渲染方式 | 用途 |
|------|---------|------|
| **指板图 (P_board)** | SVG | 高亮品格、多点点击输入、音阶形状绘制 |
| **六线谱 (P_tab)** | SVG | 数字标记、旋律走向、和弦按法图 |
| **节拍器可视化** | SVG | 摆动指针、节拍点闪烁 |
| **节奏波形/频谱** | Canvas (预留) | 若需要实时绘制音频波形，Canvas 性能更优 |

---

## 5. 节拍器实现方案

### 5.1 核心问题：为什么不用 `setInterval`？

JavaScript 的 `setInterval`/`setTimeout` 精度受事件循环影响，误差可达 10~50ms，对于节拍器来说 unacceptable。必须使用 **Web Audio API 的音频时钟**。

### 5.2 Tone.js Transport 调度模型

```
节奏型配置(JSON) → Tone.Transport.scheduleRepeat() → Web Audio API 精确发声
                           ↓
                    requestAnimationFrame 同步可视化
```

- `Tone.Transport` 以音频采样率为基准计时，精度在亚毫秒级
- `scheduleRepeat` 注册回调，在精确时间点触发发声
- 可视化指针通过 `requestAnimationFrame` 读取 `Transport.position` 同步，人眼无感知延迟

### 5.3 节奏型数据模型

```typescript
// 一个完整小节的可能配置
type Subdivision = "rest" | "down" | "up" | "down-up" | "down-down-up" | ...;

interface RhythmPattern {
  name: string;           // e.g., "民谣扫弦基础型"
  timeSignature: [4, 4];  // 拍号：4/4
  bpm: number;            // 速度
  beats: {
    subdivision: Subdivision[];  // 该拍内的细分动作
    accent: boolean;             // 是否重拍
    velocity: number;            // 力度 0~1
  }[];
}

// 示例：下 下下上 下上下 下下上
const example: RhythmPattern = {
  name: "下 下下上 下上下 下下上",
  timeSignature: [4, 4],
  bpm: 80,
  beats: [
    { subdivision: ["down"], accent: true, velocity: 1.0 },        // 第1拍：下
    { subdivision: ["down", "down", "up"], accent: false, velocity: 0.7 }, // 第2拍：下下上
    { subdivision: ["down", "up", "down"], accent: false, velocity: 0.7 }, // 第3拍：下上下
    { subdivision: ["down", "down", "up"], accent: false, velocity: 0.7 }, // 第4拍：下下上
  ],
};
```

### 5.4 发声与音色设计

- **重拍**：低沉的木鱼声或底鼓声（`MembraneSynth`）
- **弱拍**：清脆的金属声或 hi-hat（`MetalSynth`）
- **上下扫弦提示**：短促的拨弦合成音，通过 `velocity` 区分力度
- **预备拍**：开始前 1 小节的弱音滴答提示

### 5.5 后台播放（预留方案）

当前阶段仅支持前台播放。若未来需要后台/锁屏播放：

1. **配置层不变**：节奏型 JSON、BPM、拍号等逻辑保持复用
2. **调度层替换**：用 Capacitor 原生音频插件替代 Tone.js Transport
3. **iOS**：`AVAudioSession` + `BGTaskScheduler` 保持音频会话活跃
4. **Android**：`ForegroundService` + `MediaSession` 实现后台音频

---

## 6. 节奏打分实现方案

### 6.1 整体流程

```
用户启动打分模式
    ↓
系统同时开始：①播放节拍器  ②开启麦克风采集
    ↓
麦克风 → getUserMedia → MediaStreamSource → AnalyserNode
    ↓
起音检测算法 (Onset Detection)
    ↓
对比 "预期节拍时间戳数组" vs "实际检测到的 onset 时间戳数组"
    ↓
计算偏移量 → 统计分布 → 生成反馈建议
```

### 6.2 起音检测算法（Onset Detection）

#### MVP 方案：能量阈值法（爱好者级，±50ms 精度）

```
步骤：
1. 从 AnalyserNode 获取时域数据 (Float32Array)
2. 计算当前帧的 RMS 能量：sqrt(Σ(x²) / N)
3. 若当前能量 > 阈值 且 相比前一帧能量突增比例 > ratio
   → 判定为一个 onset（拨弦/击弦时刻）
4. 设置最小间隔（如 80ms）防同一音的多次触发
```

**优点**：实现简单，计算量极小，在安静环境下对吉他弹拨的瞬态响应足够好。  
**局限**：在嘈杂环境或快速连奏时可能漏检/误检。

#### 进阶方案：谱通量法（Spectral Flux，专业级 ±10ms，预留）

```
步骤：
1. 对音频做 STFT（短时傅里叶变换），得到频谱
2. 计算相邻两帧频谱的差值（仅取正向变化）
3. 对差值求和得到 Spectral Flux
4. Flux 超过局部自适应阈值 → onset
```

**优点**：对噪声鲁棒性更强，能检测出能量不强但频谱突变的音符（如闷音）。  
**实现**：可引入 [essentia.js](https://essentiajs.pages.dev/)（WebAssembly 封装的专业音频分析库）。

### 6.3 对齐评分算法

```typescript
interface ScoringResult {
  totalBeats: number;      // 总拍点数
  hits: number;            // 命中数 (|offset| < 50ms)
  misses: number;          // 漏击数
  earlyCount: number;      // 提前次数
  lateCount: number;       // 延迟次数
  meanOffset: number;      // 平均偏移 (ms, 正=延迟, 负=提前)
  stdDev: number;          // 偏移标准差 (稳定性指标)
  score: number;           // 总分 0~100
  feedback: string[];      // 建议文本
}

function analyze(
  expectedBeats: number[],   // 预期拍点时间戳 (ms)
  detectedOnsets: number[],  // 检测到的 onset 时间戳 (ms)
  tolerance: number = 50     // 容忍窗口 (ms)
): ScoringResult {
  // 对每个预期拍点，在 [t-tolerance, t+tolerance] 范围内找最近的 onset
  // 统计所有命中的 offset
  // meanOffset → 判断整体提前/延迟倾向
  // stdDev → 判断稳定性
}
```

### 6.4 反馈生成规则

| 条件 | 反馈文本 |
|------|---------|
| meanOffset < -30ms | "整体偏快，尝试稍微放慢，让每个音"落"在拍点上" |
| meanOffset > +30ms | "整体偏慢，注意提前准备，在拍点响之前就拨弦" |
| stdDev > 40ms | "节奏不够稳定，注意保持动作的连贯性" |
| earlyCount >> lateCount | "习惯性抢拍，可以尝试在心里数"1-and-2-and"帮助对齐" |
| lateCount >> earlyCount | "习惯性拖拍，注意手腕放松，减少多余动作" |
| hits / total < 0.5 | "建议先降低速度，从慢速开始建立肌肉记忆" |

---

## 7. 移动端打包方案

### 7.1 两阶段策略

| 阶段 | 方案 | 目的 |
|------|------|------|
| **原型验证期** | PWA | 部署到服务器，二维码分享即开即玩，无需应用商店审核，最快获取用户反馈 |
| **正式发布期** | Capacitor | 生成 iOS/Android 原生项目，上架 App Store / 应用商店，获得更好的安装率和留存 |

### 7.2 Capacitor 集成要点

```bash
# 初始化
npm install @capacitor/core @capacitor/cli
npx cap init GuitarLab com.yourname.guitarlab --web-dir dist

# 添加平台
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# 开发循环
npm run build          # 构建 Web
npx cap sync           # 同步到 iOS/Android
npx cap open ios       # 打开 Xcode
npx cap open android   # 打开 Android Studio
```

- **原生项目纳入版本控制**：`ios/` 和 `android/` 目录应提交到 git，但仅保留配置文件和插件声明，不提交构建产物。
- **图标与启动屏**：使用 `@capacitor/assets` 自动生成各尺寸图标。
- **权限处理**：麦克风权限在 Capacitor 中通过 `Capacitor Permissions API` 统一管理，比浏览器更一致。

### 7.3 PWA 配置

- `vite-plugin-pwa` 自动生成 Service Worker 和 manifest
- 支持离线运行（核心逻辑 + 资源缓存）
- 可添加到手机主屏幕，体验接近原生

---

## 8. 项目目录结构（预留）

```
guitar-lab/
├── public/                     # 静态资源
│   ├── sounds/                 # 备用音频采样（若不用合成器）
│   └── icons/                  # PWA 图标
├── src/
│   ├── main.tsx                # 应用入口
│   ├── App.tsx                 # 根组件（路由布局）
│   ├── index.css               # Tailwind 入口
│   │
│   ├── components/             # 通用组件（跨模块复用）
│   │   ├── Fretboard/          # 指板图 SVG 组件
│   │   ├── NoteSelector/       # 音名选择器（7字母+升降号）
│   │   ├── SolfeggioSelector/  # 唱名选择器（Do/Re/Mi...）
│   │   ├── Tablature/          # 六线谱 SVG 组件
│   │   └── RhythmVisualizer/   # 节拍器可视化指针
│   │
│   ├── modules/                # 三大业务模块
│   │   ├── fretboard-game/     # 指板记忆游戏
│   │   │   ├── GameEngine.ts   # 题库生成与校验逻辑
│   │   │   ├── levels.ts       # 难度曲线配置
│   │   │   └── ...
│   │   ├── metronome/          # 高级节拍器
│   │   │   ├── MetronomeEngine.ts  # Tone.js Transport 封装
│   │   │   ├── RhythmPattern.ts    # 节奏型数据模型
│   │   │   ├── PatternEditor.tsx   # 节奏型编辑器 UI
│   │   │   └── ...
│   │   └── rhythm-score/       # 节奏打分
│   │       ├── AudioRecorder.ts    # 麦克风采集封装
│   │       ├── OnsetDetector.ts    # 起音检测算法
│   │       ├── ScoringEngine.ts    # 对齐评分逻辑
│   │       └── ...
│   │
│   ├── lib/                    # 底层库封装
│   │   ├── theory.ts           # Tonal.js 封装（乐理计算）
│   │   ├── audio.ts            # Tone.js 封装（音频引擎）
│   │   └── storage.ts          # IndexedDB / Capacitor Preferences 统一封装
│   │
│   ├── stores/                 # Zustand 状态
│   │   ├── gameStore.ts        # 游戏进度、分数、解锁状态
│   │   ├── metronomeStore.ts   # 节拍器配置
│   │   └── userStore.ts        # 用户设置、主题等
│   │
│   └── types/                  # TypeScript 类型定义
│       ├── theory.ts           # 乐理相关类型
│       ├── game.ts             # 游戏相关类型
│       └── audio.ts            # 音频相关类型
│
├── ios/                        # Capacitor iOS 项目
├── android/                    # Capacitor Android 项目
├── capacitor.config.ts         # Capacitor 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # Tailwind 配置
├── tsconfig.json
└── package.json
```

---

## 9. 关键决策记录

| 决策项 | 最终选择 | 放弃方案 | 决策原因 |
|--------|---------|---------|---------|
| 跨平台方案 | **Capacitor** | React Native, Flutter | 一套代码同时覆盖 Web + App，开发效率最高；乐理/音频生态直接复用 |
| 前端框架 | **React + TS** | Vue, Svelte | 生态最丰富，音频/乐理相关示例和库更多，TS 集成更成熟 |
| 构建工具 | **Vite** | Webpack, CRA | 冷启动和热更新速度碾压，配置极简 |
| 样式方案 | **Tailwind CSS** | CSS-in-JS, SCSS | 原型阶段开发最快，运行时性能最好 |
| 状态管理 | **Zustand** | Redux, MobX | 游戏状态扁平，Zustand 代码量最少 |
| 指板渲染 | **SVG** | Canvas, HTML+CSS | 事件处理方便（天然 DOM 事件），CSS 动画足够，矢量缩放 |
| 乐理计算 | **Tonal.js** | 自研 | 成熟稳定，覆盖全面，避免自研边界错误 |
| 节拍器核心 | **Tone.js** | 自研 Web Audio API | Transport 精确调度是难点，Tone.js 已完美解决 |
| 起音检测(MVP) | **能量阈值法** | 谱通量法 | 实现简单，对吉他拨弦瞬态足够，计算量极小 |
| 后台音频 | **前台优先，预留原生插件** | 立即实现 | 降低 MVP 复杂度，节奏型配置层保持复用，后续仅需替换输出层 |

---

## 10. 后续可扩展点（二期预留）

| 功能 | 技术路径 | 优先级 |
|------|---------|--------|
| **听力训练** | Web Audio API 合成标准音 → 用户回答音名/位置 | 高 |
| **后台节拍器** | Capacitor 原生音频插件替换 Tone.js 输出层 | 中 |
| **专业级节奏分析** | 引入 essentia.js (WebAssembly) 实现谱通量法 onset 检测 | 中 |
| **和弦识别** | 频域分析 + 和弦模板匹配，从录音识别用户弹奏的和弦 | 低 |
| **云端同步** | Supabase / Firebase，用户进度、自定义节奏型跨设备同步 | 低 |
| **社交/排行榜** | 后端 + 分享卡片生成 | 低 |
| **多语言 i18n** | react-i18next，中文/英文/日文优先 | 低 |
| **深色模式** | Tailwind `dark:` 前缀，跟随系统或手动切换 | 低 |

---

## 附录：核心依赖清单

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "tonal": "^6.0.0",
    "tone": "^15.0.0",
    "dexie": "^3.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite-plugin-pwa": "^0.19.0",
    "tailwindcss": "^3.4.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/cli": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/android": "^6.0.0"
  }
}
```
