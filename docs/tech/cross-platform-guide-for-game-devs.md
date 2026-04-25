# 跨平台开发知识指南 — 写给游戏程序员

> 目标读者：熟悉 C++/Python/UE/Unity，但对 Web 开发和移动端跨平台应用不熟悉。
> 阅读本文后，你应该能用自己的知识框架理解 Web 技术栈和跨平台方案的本质。

---

## 1. 先建立认知框架：浏览器就是一个"运行时"

作为游戏程序员，你对"运行时"的概念很熟悉：

| 你熟悉的 | 类比 |
|---------|------|
| Unity Player | **浏览器** |
| Unreal Engine | **浏览器** |
| C# Script → Mono Runtime | **JavaScript → V8 引擎** |
| GameObject + Component | **DOM 元素 + 属性** |
| Material/Shader | **CSS 样式** |
| Scene Graph | **DOM Tree** |

**核心认知**：整个 Web 技术栈可以看作一个巨大的、分布式的"游戏引擎"。每个用户的浏览器都是这个引擎的一个实例，你的代码在这个实例中运行。

---

## 2. 前端三大核心技术（用游戏开发类比）

### 2.1 HTML ≈ 场景中的实体声明

HTML 不是"编程语言"，它是**声明式结构描述**，类似于 UE 的蓝图 XML 或 Unity 的 Scene YAML。

```html
<!-- HTML -->
<div class="card">
  <img src="guitar.png" />
  <button>点击开始</button>
</div>
```

```csharp
// Unity 伪代码
GameObject card = new GameObject("card");
GameObject img = new GameObject("img");
img.AddComponent<SpriteRenderer>().sprite = Resources.Load("guitar");
GameObject btn = new GameObject("button");
btn.AddComponent<Button>();
```

| HTML 标签 | 游戏开发类比 |
|----------|------------|
| `<div>` | 空 GameObject（容器） |
| `<img>` | 带 SpriteRenderer 的 GameObject |
| `<button>` | 带碰撞体 + 点击事件的 UI 按钮 |
| `<input>` | 带 TextMeshPro InputField 的 GameObject |
| `<canvas>` | 一个 RawImage，你获得一个 RenderTexture 自己画 |

### 2.2 CSS ≈ 材质系统 + Transform + 动画系统

CSS 是**样式描述语言**，但它做的事情远超"改颜色"——它本质上定义了每个元素的"渲染状态"。

```css
.card {
  position: absolute;     /* ≈ 世界坐标系 */
  left: 100px;
  top: 50px;
  width: 200px;
  height: 300px;
  background: #333;       /* ≈ 材质颜色 */
  border-radius: 8px;     /* ≈ Mesh 圆角 */
  transform: rotate(5deg); /* ≈ Transform.Rotate */
  opacity: 0.9;           /* ≈ 材质透明度 */
}
```

#### CSS 布局系统 ≈ 自动布局组件

| CSS 布局 | Unity 类比 | UE 类比 |
|---------|-----------|---------|
| `position: absolute` | 世界坐标，父物体为参考 | Absolute Layout |
| `position: relative` | 局部坐标 | Slot 的 Offset |
| `display: flex` | **Horizontal/Vertical Layout Group** | UMG 的 Horizontal/Vertical Box |
| `display: grid` | **Grid Layout Group** | Uniform Grid Panel |
| `margin` | Spacing | Padding |
| `z-index` | Sorting Order / Render Queue | ZOrder |

**关键理解**：Flexbox 和 Grid 就是 Web 世界里的自动布局系统。你不需要手动计算每个 UI 元素的位置，声明"水平排列、居中、间距 16px"，浏览器自动帮你算好。

#### CSS 动画 ≈ 动画状态机

```css
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

```csharp
// Unity 动画状态机
Animator.SetTrigger("pulse");
// 或 DOTween
transform.DOScale(1.1f, 0.5f).SetLoops(-1, LoopType.Yoyo);
```

CSS `transition` 和 `animation` 就是声明式的 Tween/动画系统，浏览器在合成器线程里帮你插值。

### 2.3 JavaScript ≈ C# / Python / Lua 脚本

JS 是一门**完整的编程语言**，运行在浏览器的 V8 引擎中（类似 C# 运行在 Mono/CLR 中）。

```javascript
// JavaScript
const player = {
  name: " guitarist",
  level: 5,
  score: 1200,
  levelUp() {
    this.level++;
    this.score += 100;
  }
};

player.levelUp();
console.log(player.level); // 6
```

```csharp
// C#
public class Player {
    public string Name = "guitarist";
    public int Level = 5;
    public int Score = 1200;
    
    public void LevelUp() {
        Level++;
        Score += 100;
    }
}

var player = new Player();
player.LevelUp();
Debug.Log(player.Level); // 6
```

#### 关键差异 1：动态类型 vs 静态类型

JavaScript 是**动态类型**（类似 Python/Lua），变量类型在运行时决定：

```javascript
let x = 5;      // number
x = "hello";    // 现在变成 string，完全合法
x = [1, 2, 3];  // 现在变成 array
```

这对 C++ 程序员来说可能很恐怖——但这正是 **TypeScript** 存在的理由。

#### TypeScript ≈ C++ 的类型系统 + JS 的运行时

TypeScript 是 JavaScript 的超集，添加了静态类型检查，编译后变成纯 JavaScript。

```typescript
// TypeScript
interface Player {
  name: string;
  level: number;
  score: number;
  levelUp(): void;
}

const player: Player = {
  name: "guitarist",
  level: 5,
  score: 1200,
  levelUp() { this.level++; }
};

player.levelUp();
// player.level = "5";  // ❌ 编译错误：Type 'string' is not assignable to type 'number'
```

**对 C++ 程序员来说**：TypeScript 的类型系统（接口、泛型、联合类型、枚举）与 C++ 的概念非常接近，学习成本极低。

---

## 3. 事件循环 vs 游戏主循环（最重要的一课）

这是游戏程序员进入 Web 开发最容易踩的坑。

### 游戏开发的主循环

```cpp
// 你熟悉的
while (running) {
    ProcessInput();   // 处理输入
    Update(dt);       // 更新逻辑
    Render();         // 渲染帧
    Sleep(16ms);      // ~60 FPS
}
```

### Web 开发的事件循环

```javascript
// Web 没有 while(true) 主循环！
// 相反，它有一个"事件队列"：

// 1. 用户点击按钮 → 事件入队
button.addEventListener('click', () => {
    console.log("clicked!");
});

// 2. 网络请求完成 → 回调入队
fetch('/api/data').then(response => {
    console.log("data loaded");
});

// 3. 定时器到期 → 回调入队
setTimeout(() => {
    console.log("1 second passed");
}, 1000);

// JavaScript 引擎不断从队列里取事件执行
// 没有事件时就空闲，有事件时立即响应
```

| 特性 | 游戏主循环 | Web 事件循环 |
|------|-----------|-------------|
| 执行模型 | 固定频率 tick（60Hz） | 事件驱动，无固定频率 |
| 输入响应 | 每帧轮询 Input | 事件触发回调 |
| 动画更新 | Update(dt) 中手动更新 | CSS 动画自动插值，或 requestAnimationFrame |
| 耗时操作 | 阻塞帧，需分帧处理 | 阻塞主线程 = UI 卡顿，必须用异步 |

### 但你可以模拟游戏循环

```javascript
function gameLoop(timestamp) {
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    
    update(dt);
    render();
    
    requestAnimationFrame(gameLoop);  // ≈ 浏览器说"下一帧叫我"
}

requestAnimationFrame(gameLoop);
```

`requestAnimationFrame` 就是 Web 版的"下一帧回调"，浏览器会在屏幕刷新前调用你（通常 60Hz，高刷屏 120Hz）。Canvas 游戏和 WebGL 游戏都用这个模式。

**对我们这个项目**：指板图用 SVG + CSS 动画（声明式），不需要手动 game loop。但节拍器的可视化指针需要和音频时钟同步，这时候会用到 `requestAnimationFrame`。

---

## 4. 跨平台方案全景图

现在进入正题：如何把一套代码跑在多个平台上？

### 4.1 类比游戏引擎的跨平台策略

游戏行业解决跨平台的方式有几种：

1. **为每个平台写渲染后端**（原生开发）
2. **中间件/虚拟机**（Unity 的 IL2CPP，UE 的跨平台抽象层）
3. **自绘引擎**（自己用 OpenGL/Vulkan 画一切）

移动端跨平台也有对应的三种思路：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        跨平台方案谱系                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【方案A】原生开发                                                        │
│  Swift (iOS) + Kotlin (Android)                                         │
│  ≈ 为 PS5/Xbox/Switch 分别写渲染后端                                      │
│  性能最好，代码 0% 复用                                                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【方案B】虚拟机/桥接方案                                                  │
│  React Native: JS → 桥接 → 原生 UI 组件                                   │
│  ≈ Unity: C# → IL2CPP → 平台原生代码                                      │
│  复用逻辑代码，UI 走原生                                                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【方案C】自绘引擎                                                        │
│  Flutter: Dart → Skia 引擎 → 直接绘制像素                                 │
│  ≈ UE: 自己管理渲染管线，不依赖平台 UI                                     │
│  跨平台一致性最好，包体积较大                                               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【方案D】WebView 包装                                                    │
│  Capacitor: Web 应用 → 全屏 WebView → 原生 API 桥接                        │
│  ≈ 在 Unity 里嵌入一个浏览器插件来显示 UI                                   │
│  代码 100% 复用，但性能受 WebView 限制                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 各方案详细分析

#### 方案A：原生开发（Swift / Kotlin）

```
你的代码
    ├── iOS App (Swift + UIKit/SwiftUI)
    └── Android App (Kotlin + Jetpack Compose)
```

| 维度 | 说明 |
|------|------|
| **原理** | 直接用平台官方语言和框架写 App |
| **性能** | ⭐⭐⭐ 最好 |
| **原生体验** | ⭐⭐⭐ 完美 |
| **代码复用** | ⭐ 0%（除非用 Kotlin Multiplatform 共享逻辑层） |
| **开发成本** | 最高，需要两个团队或一个人精通两套技术栈 |
| **适合场景** | 大型商业 App、性能敏感型应用（如 3D 游戏） |

**游戏程序员视角**：这就像为每个主机平台单独写渲染后端。性能最好，但成本最高。

---

#### 方案B：React Native

```
JavaScript/TypeScript 代码
    ├── Metro Bundler 打包
    ├── JavaScript 引擎 (Hermes) 执行
    ├── 桥接层 (Bridge/TurboModules)
    ├── iOS: 映射到 UILabel / UIButton / UIView
    └── Android: 映射到 TextView / Button / View
```

| 维度 | 说明 |
|------|------|
| **原理** | JS 代码运行在引擎中，UI 组件通过桥接映射到原生平台组件 |
| **性能** | ⭐⭐⭐ 接近原生（UI 是原生的） |
| **原生体验** | ⭐⭐⭐ 很好（因为用的是真·原生按钮、列表、导航栏） |
| **代码复用** | ⭐⭐⭐ 逻辑层 100%，UI 层 90%+ |
| **开发成本** | 中等，需要理解桥接机制和原生模块开发 |
| **适合场景** | 需要原生体验的社交/电商/工具类 App |

**关键概念：桥接（Bridge）**

React Native 的桥接 ≈ Unity 的 C# ↔ C++ 交互层：
- JS 侧调用一个方法 → 序列化为 JSON → 通过桥接 → 原生侧反序列化 → 执行原生代码 → 结果返回

**游戏程序员视角**：
- 类似 Unity 的脚本系统：C# 脚本运行在 Mono 运行时，通过内部机制调用 C++ 引擎代码。
- React Native 的"原生模块" ≈ Unity 的"原生插件"（.dll/.so/.a）。

**局限**：
- 复杂动画（如列表惯性滚动、页面转场）可能因桥接延迟而不够流畅
- 新平台 API 支持有滞后（需要社区或官方写桥接模块）

---

#### 方案C：Flutter

```
Dart 代码
    ├── Dart 编译器 (AOT) → 原生机器码
    ├── Flutter Engine (C++ + Skia/Impeller)
    ├── 自己绘制每一帧像素
    ├── iOS: 渲染到 CALayer
    └── Android: 渲染到 Surface
```

| 维度 | 说明 |
|------|------|
| **原理** | Dart 编译为原生机器码，Flutter 引擎用 Skia/Impeller 自己绘制所有 UI，不依赖平台组件 |
| **性能** | ⭐⭐⭐ 优秀（AOT 编译 + 自绘引擎） |
| **原生体验** | ⭐⭐⭐ 视觉上完美一致，但"手感"可能略不像原生（因为不是真·原生组件） |
| **代码复用** | ⭐⭐⭐ 一套代码覆盖 iOS/Android/Web/桌面 |
| **开发成本** | 中等偏高，需学 Dart，生态比 JS 小 |
| **适合场景** | 品牌 App、需要高度定制 UI、跨平台一致性要求极高 |

**游戏程序员视角**：
- Flutter 的渲染方式 **最接近游戏引擎**：自己管理渲染管线，用 Skia（2D 图形库，类似 SDL/SFML）画一切。
- 每一帧都重新计算布局和绘制（类似游戏引擎的每帧重建 UI）。
- Dart 的语法像 Java + C# 的混合体，有 GC、async/await、强类型。

**为什么没选 Flutter 对我们的项目？**
- Web 支持是"额外功能"而非一等公民，网页版体验不如纯 Web 方案
- 音频/乐理生态不如 JavaScript 丰富
- 需要学 Dart，而你已有 Python/C++ 基础，TypeScript 学习成本更低

---

#### 方案D：Capacitor / Ionic（WebView 方案）

```
你的 Web 应用 (React + TypeScript)
    ├── Vite 构建 → HTML/CSS/JS
    ├── Capacitor 包装
    │   ├── iOS: WKWebView (全屏浏览器)
    │   └── Android: WebView (Chrome 内核)
    ├── 原生插件桥接
    │   ├── Camera, FileSystem, Storage...
    │   └── 麦克风 = getUserMedia (Web API，无需插件)
    └── 输出: .ipa (iOS) / .apk (Android)
```

| 维度 | 说明 |
|------|------|
| **原理** | 本质上是一个全屏的浏览器，你的 Web 应用在里面运行，通过插件桥接访问原生功能 |
| **性能** | ⭐⭐ 足够好（现代 WebView 性能已大幅提升） |
| **原生体验** | ⭐⭐ 良好，但不是"原生手感"（滚动、转场等是 Web 的行为） |
| **代码复用** | ⭐⭐⭐ 近乎 100%（同一份代码就是网站，也是 App） |
| **开发成本** | ⭐ 最低，纯 Web 技术栈 |
| **适合场景** | 内容型 App、工具型 App、游戏、快速 MVP |

**游戏程序员视角**：
- 这就像你在 Unity 里用 **WebBrowser 插件** 或 **Coherent UI** 来渲染游戏内嵌的网页界面。
- 你的 App = 一个网页，被原生壳包装起来。
- 好处：你写的网页可以直接在手机浏览器打开（PWA），也可以打包成 App Store 应用。

**WebView 的性能真的够吗？**

这是游戏程序员最关心的问题。答案是：**对于 2D UI 应用，完全够。**

| 场景 | WebView 性能 |
|------|-------------|
| 静态 UI / 表单 / 列表 | 完美，无感知差异 |
| CSS 动画 / SVG 动画 | 流畅，GPU 加速 |
| Canvas 2D 游戏 | 流畅（60 FPS） |
| WebGL 3D 游戏 | 良好（但不是主机级） |
| 复杂音频处理 | 足够（Web Audio API 有独立音频线程） |

现代 iOS 的 WKWebView 和 Android 的 Chrome WebView 都已经非常强大。Instagram、Discord 的部分功能、许多电商 App 都在用 WebView 方案。

**为什么选 Capacitor 对我们的项目？**

1. **网页版 = App 版**：同一套代码，部署到服务器就是网站，打包就是 App
2. **音频生态直接复用**：Tone.js、Web Audio API 在 WebView 中完全可用
3. **乐理库直接复用**：Tonal.js 不需要跨平台适配
4. **快速验证**：用户扫码打开网页就能试用，零安装成本
5. **未来可扩展**：需要原生能力时（后台音频、推送通知），再写原生插件

---

### 4.3 方案对比总表

| 维度 | 原生开发 | React Native | Flutter | Capacitor |
|------|---------|-------------|---------|-----------|
| **代码复用** | 0% | ~80% | ~90% | ~100% |
| **开发速度** | 最慢 | 中等 | 中等 | **最快** |
| **性能** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **原生体验** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Web 版** | 另建 | react-native-web（有限） | 支持但体验一般 | **本身就是 Web** |
| **音频处理** | 原生 API | 需原生模块 | 第三方包 | **Web Audio API** |
| **学习成本** | 高（两套语言） | 中等 | 中等（学 Dart） | **低（JS/TS）** |
| **生态丰富度** | 最大 | 大 | 中等 | **最大（npm）** |
| **包体积** | 最小 | 中等 | 较大 | 中等 |

---

## 5. 渲染管线的深层理解

### 5.1 浏览器的渲染管线

作为游戏程序员，你熟悉 GPU 渲染管线。浏览器也有自己的渲染管线：

```
HTML + CSS
    ↓
DOM Tree + CSSOM (样式对象模型)
    ↓
Render Tree (可见元素)
    ↓
Layout (计算几何位置)        ← 这里很 expensive！
    ↓
Paint (绘制图层)             ← 这里也比较 expensive
    ↓
Composite (合成图层)         ← GPU 加速，很 cheap
    ↓
GPU 渲染到屏幕
```

#### 关键概念：重排（Reflow）vs 重绘（Repaint）vs 合成（Composite）

| 操作 | 浏览器行为 | Unity 类比 |
|------|-----------|-----------|
| 改变 `width`/`height`/`top`/`left` | **重排** → 重新计算布局 → 重绘 → 合成 | 修改 Transform 导致重建场景图 |
| 改变 `color`/`background` | **重绘** → 重新绘制图层 → 合成 | 修改材质颜色，需重绘该物体 |
| 改变 `transform`/`opacity` | **仅合成** → GPU 直接变换已有图层 | 修改 Transform，不需要重建场景图 |

**优化原则**：
- 动画尽量用 `transform` 和 `opacity`（GPU 加速，不触发重排）
- 避免在 `requestAnimationFrame` 中读取会导致重排的属性（如 `offsetWidth`）
- 批量 DOM 修改：用 `DocumentFragment` 或虚拟 DOM（React 已自动处理）

### 5.2 为什么 SVG 适合指板图

SVG（Scalable Vector Graphics）≈ 矢量图格式，浏览器原生支持：

```xml
<svg viewBox="0 0 800 200">
  <!-- 画6根弦 -->
  <line x1="0" y1="20" x2="800" y2="20" stroke="#333" stroke-width="1" />
  <line x1="0" y1="40" x2="800" y2="40" stroke="#333" stroke-width="1.5" />
  <!-- ... -->
  
  <!-- 高亮一个品格 -->
  <circle cx="100" cy="20" r="12" fill="#ff6b6b" class="highlight" />
</svg>
```

| 特性 | SVG | Canvas 2D |
|------|-----|-----------|
| 元素是 DOM 节点 | ✅ 每个 `<circle>` 都是 DOM，可绑定事件 | ❌ 位图，需手动做命中检测 |
| CSS 动画 | ✅ 直接应用 `transition`/`animation` | ❌ 需手动在每帧重绘 |
| 矢量缩放 | ✅ 任意分辨率清晰 | ❌ 位图会模糊 |
| 大量元素性能 | 中等（DOM 节点多时有开销） | 优秀（GPU 批处理） |
| 适用场景 | UI、图表、指板图（元素少，需交互） | 游戏、粒子系统、频谱图（元素多，每帧重绘） |

**结论**：指板图最多 6 弦 × 22 品 = 132 个品格点，SVG 完全胜任，且事件处理方便。

---

## 6. 音频系统（对节拍器至关重要）

### 6.1 Web Audio API 架构

```
AudioContext (音频上下文)
    ├── OscillatorNode (振荡器) → 生成波形
    ├── GainNode (增益) → 控制音量
    ├── BiquadFilterNode (滤波器) → EQ
    ├── AnalyserNode (分析器) → 频谱/波形数据
    ├── DelayNode (延迟) → 回声效果
    └── Destination (扬声器输出)
```

**游戏程序员视角**：
- `AudioContext` ≈ FMOD/Wwise 的 System 对象
- `AudioNode` ≈ FMOD 的 DSP 链
- `OscillatorNode` ≈ 合成器振荡器（正弦/方波/锯齿波）
- `GainNode` ≈ Volume 控制器
- `AnalyserNode` ≈ 频谱分析仪，可以获取实时 FFT 数据

### 6.2 为什么 Tone.js 是必须的

Web Audio API 是底层 API，就像 DirectSound 或 OpenAL。Tone.js 是基于它的高级封装，类似 FMOD Studio：

| 功能 | 原生 Web Audio API | Tone.js |
|------|-------------------|---------|
| 播放一个音 | 手动创建 Oscillator + Gain + 连接 + 启动 + 停止 | `synth.triggerAttackRelease("C4", "8n")` |
| 节拍器 | 手动用 `setInterval`（不精确） | `Transport.scheduleRepeat(callback, "4n")` |
| 效果器链 | 手动连接多个 Node | `synth.connect(reverb).toDestination()` |
| 音色预设 | 无 | 内置 Synth、AMSynth、FMSynth、MembraneSynth 等 |

**Tone.js Transport 的精确性**：

```javascript
// 在绝对时间 0.5 秒后播放一个音
Tone.Transport.schedule((time) => {
    synth.triggerAttackRelease("C4", "8n", time);
}, "0:0:2");  // 第0小节，第0拍，第2个16分音符

Tone.Transport.bpm.value = 120;
Tone.Transport.start();
```

Transport 使用 **音频上下文时钟**（audio context clock），精度在亚毫秒级。这是 `setInterval` 完全无法比拟的。

### 6.3 麦克风采集与音频分析

```javascript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;

// 获取麦克风权限
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);
// 注意：不要 connect 到 destination，否则会有回声！

// 读取时域数据（用于起音检测）
const buffer = new Float32Array(analyser.fftSize);
analyser.getFloatTimeDomainData(buffer);

// 读取频域数据（用于频谱分析）
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(frequencyData);
```

**对节奏打分的意义**：
- 时域数据 → 能量阈值法检测 onset（拨弦瞬间）
- 频域数据 → 谱通量法检测 onset（更精确，抗噪声）

---

## 7. 包管理与构建系统

### 7.1 npm ≈ 游戏开发的包管理器

| 游戏开发 | Web 开发 | 说明 |
|---------|---------|------|
| Unity Asset Store | **npm registry** | 第三方库仓库 |
| `.unitypackage` | **npm package** | 库的分发格式 |
| `Packages/` 文件夹 | **`node_modules/`** | 本地安装的依赖 |
| `manifest.json` | **`package.json`** | 依赖清单 |
| 手动导入插件 | `npm install xxx` | 安装依赖的命令 |

```json
// package.json
{
  "name": "guitar-lab",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.3.0",      // ^ 表示兼容版本
    "tone": "^15.0.0",
    "tonal": "^6.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",        // 仅在开发时使用
    "typescript": "^5.4.0"
  }
}
```

### 7.2 Vite ≈ 游戏引擎的构建系统

Vite 是一个构建工具，做的事情类似于：
- 开发时：启动本地服务器，提供热更新（类似 Unity Play Mode 的代码热重载）
- 构建时：Tree Shaking（剔除未使用代码）、代码压缩、资源优化、生成生产包

```bash
npm run dev      # 启动开发服务器（热更新）
npm run build    # 构建生产包（输出到 dist/ 目录）
```

### 7.3 开发工具链

| 游戏开发 | Web 开发 |
|---------|---------|
| Visual Studio / Rider | **VS Code**（绝对主流）|
| Unity Editor Scene View | **Chrome DevTools Elements** |
| Unity Console | **Chrome DevTools Console** |
| Unity Profiler | **Chrome DevTools Performance** |
| Frame Debugger | **Chrome DevTools Rendering** |
| Asset Inspector | **Chrome DevTools Network / Application** |

**Chrome DevTools 核心面板**：

- **Elements**：实时查看和修改 DOM/CSS（类似 Scene Hierarchy + Inspector）
- **Console**：日志输出，也可以执行 JS 代码（类似 Unity Console 的 immediate mode）
- **Network**：监控所有 HTTP 请求（资源加载分析）
- **Performance**：录制性能时间线（类似 Profiler，看哪帧卡了）
- **Application**：查看 LocalStorage、IndexedDB、Service Workers
- **Sources**：断点调试（类似 Visual Studio 的 Debugger）

---

## 8. PWA：网页也能"像 App"

PWA（Progressive Web App）≈ 网页的"可安装模式"：

| 特性 | 说明 | 游戏类比 |
|------|------|---------|
| **添加到主屏幕** | 用户可以将网站添加到手机桌面，有图标 | 类似 Steam 的"创建桌面快捷方式" |
| **离线运行** | Service Worker 缓存资源，没网也能用 | 类似单机游戏的离线模式 |
| **推送通知** | 可以接收推送（需用户授权） | 类似游戏的通知系统 |
| **后台同步** | 网络恢复后自动同步数据 | 类似云存档 |

**PWA 不是 App Store 应用**，它不需要审核，但不能像原生 App 一样深度集成系统（如后台音频受限）。

**在我们的项目中**：
- **验证期**：用 PWA 让用户扫码即玩，快速收集反馈
- **发布期**：用 Capacitor 打包成真正的 App Store 应用

---

## 9. Capacitor 的详细工作流程

### 9.1 初始化项目

```bash
# 1. 创建 Vite + React 项目
npm create vite@latest guitar-lab -- --template react-ts
cd guitar-lab
npm install

# 2. 安装 Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init GuitarLab com.yourname.guitarlab --web-dir dist

# 3. 添加平台
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 9.2 开发循环

```bash
# 开发阶段（纯 Web，浏览器调试）
npm run dev

# 构建 Web 应用
npm run build

# 同步到原生项目
npx cap sync

# 打开原生 IDE
npx cap open ios      # 打开 Xcode
npx cap open android  # 打开 Android Studio

# 在 IDE 中编译、签名、打包、上传到 App Store
```

### 9.3 原生插件的使用

Capacitor 的核心价值在于**原生插件桥接**：

```typescript
// Web 代码中调用原生功能
import { Camera } from '@capacitor/camera';

const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri
});
```

在浏览器中，`@capacitor/camera` 会调用浏览器的 `<input type="file">` 或 `getUserMedia`。  
在 App 中，它会调用 iOS 的 `UIImagePickerController` 或 Android 的 `CameraX`。

**对我们项目有用的插件**：

| 插件 | 用途 |
|------|------|
| `@capacitor/preferences` | 替代 LocalStorage，App 中更可靠 |
| `@capacitor/app` | 监听 App 生命周期（进入后台/恢复） |
| `@capacitor/screen-orientation` | 锁定横屏/竖屏 |
| `@capacitor-community/keep-awake` | 防止屏幕休眠（练习时很有用） |
| `@capacitor-community/audio` | 后台音频播放（预留） |

---

## 10. 总结：为什么这套方案适合你

作为游戏程序员，你已经具备的核心能力：

| 你的能力 | 如何映射到本项目 |
|---------|---------------|
| C++ 的严谨和性能思维 | TypeScript 的类型系统 + Web Audio API 的精确计时 |
| Unity 的组件化思维 | React 的组件化 + 状态管理 |
| 游戏循环和实时系统 | requestAnimationFrame + 音频时钟调度 |
| 音频处理基础（DSP）| Web Audio API 的 Node 链 + AnalyserNode |
| 跨平台开发经验 | Capacitor = 另一种形式的"中间件" |

**选择 Capacitor + React + TypeScript 的核心原因**：

1. **学习曲线最平缓**：TypeScript 的类型系统对 C++ 程序员极度友好
2. **验证速度最快**：网页版部署后立刻能用，扫码分享零门槛
3. **代码复用率最高**：网站 = App，100% 代码共用
4. **音频生态最丰富**：Tone.js、Tonal.js 直接可用，无需写原生桥接
5. **未来可扩展**：需要原生能力时，再写原生插件，不影响已有代码

---

## 附录：推荐阅读

1. **MDN Web Docs** — Web 开发的"官方文档"，质量极高
   - https://developer.mozilla.org/
   - 重点看：Web Audio API、SVG、Flexbox、Grid

2. **Tone.js 文档** — 节拍器实现的核心参考
   - https://tonejs.github.io/docs/

3. **Tonal.js 文档** — 乐理计算的核心参考
   - https://tonaljs.github.io/

4. **Capacitor 文档** — 移动端打包的核心参考
   - https://capacitorjs.com/docs

5. **Vite 文档** — 构建工具
   - https://vitejs.dev/guide/
