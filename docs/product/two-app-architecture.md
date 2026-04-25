# 双 App 架构方案分析

> 核心思路：将"精度要求极高"的功能拆分到独立的原生 App，主 App 保持轻量跨平台。  
> 分析日期：2026-04-23

---

## 1. 方案概述

```
┌─────────────────────────────────────────────────────────────────────┐
│                           双 App 架构                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  【App A：Guitar Lab Core】                                          │
│  ├── 指板记忆游戏（P↔N，P+K→S，音程，和弦...）                        │
│  ├── 基础节拍器（标准节拍，简单节奏型）                               │
│  ├── 乐理学习 / 题库 / 进度追踪                                     │
│  └── 技术：Capacitor + React + Web Audio API                        │
│       ├── 平台：iOS / Android / Web（PWA）                           │
│       └── 特点：一套代码，快速迭代，零硬件门槛                        │
│                                                                      │
│                    ↓ 数据同步（云端 / 本地）                          │
│                                                                      │
│  【App B：Guitar Lab Pro / 节奏工坊】                                │
│  ├── 高精度节奏打分（±10ms 专业级）                                  │
│  ├── 高级节拍器（复杂节奏型，每一拍独立配置）                         │
│  ├── 深度音频分析（频谱图，onset 可视化）                             │
│  └── 技术：原生开发                                                 │
│       ├── iOS：Swift + Core Audio / AudioKit                        │
│       ├── Android：Kotlin + AAudio / Oboe                         │
│       └── 特点：极低延迟，专业精度，付费解锁                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 为什么这个思路有价值？

### 2.1 解决了"不可能三角"

之前讨论过的音频 App 三难选择：

```
         低延迟
          /\
         /  \
        /    \
       /  ?   \
      /________\
  跨平台    开发效率
```

**双 App 架构破解了这个三角**：

| App | 追求 | 放弃 | 结果 |
|-----|------|------|------|
| **Core（主App）** | 跨平台 + 开发效率 | 极致延迟 | 用 Capacitor，一套代码跑遍 Web/iOS/Android |
| **Pro（专业App）** | 低延迟 + 开发效率 | 跨平台 | 分别用 Swift/Kotlin 写两套，但代码量小 |

### 2.2 商业层面的合理性

| 维度 | 单 App（纯跨平台） | 双 App 架构 |
|------|------------------|------------|
| **用户获取** | 一个入口，简单直接 | Core App 作为免费获客漏斗 |
| **变现路径** | 应用内订阅 | Core 免费/低价 → Pro 付费升级 |
| **技术风险** | 全部绑定一个技术栈 | 隔离风险，Pro 可以独立迭代 |
| **用户分层** | 所有用户用同一套功能 | 爱好者用 Core，专业用户买 Pro |
| **App Store 审核** | 一次审核 | 两次审核，但 Pro 更新频率可以更低 |

**经典案例**：
- **BandLab**（免费云端 DAW）+ **BandLab Membership**（高级功能）
- **Soundbrenner**（免费节拍器 App）+ **Soundbrenner Plus**（订阅解锁）+ **Pulse 硬件**
- **Fender Tune**（免费调音器）+ **Fender Play**（付费课程）

---

## 3. 功能拆分方案

### 3.1 哪些功能留在 Core App？

| 功能 | 精度要求 | 留在 Core 的理由 |
|------|---------|----------------|
| 指板图所有游戏 | 无音频处理 | 纯 UI + 乐理计算 |
| 基础节拍器 | ±50ms 足够 | Web Audio API 完全胜任 |
| 简单节奏型（4/4，3/4） | 标准节拍 | Tone.js Transport 精确调度 |
| 题库 / 进度 / 成就 | 无 | 纯数据逻辑 |
| 和弦库 / 音阶参考 | 无 | 静态内容 + 计算 |
| 基础调音器 | ±5音分足够 | 自相关算法 JS 可实现 |

### 3.2 哪些功能拆到 Pro App？

| 功能 | 精度要求 | 需要原生的理由 |
|------|---------|---------------|
| **专业节奏打分** | ±10ms | Web Audio API 在移动端延迟 30-80ms，无法满足 |
| **高级节拍器** | 每一拍独立配置节奏型 | 复杂调度 + 后台播放需要原生音频服务 |
| **频谱可视化** | 实时 FFT 30fps+ | WebView 中 Canvas 性能受限 |
| **录音分析** | 高质量音频采集 | 原生可访问更低层音频 API |
| **后台节拍器** | 锁屏继续播放 | Web 技术无法实现后台音频 |

---

## 4. 技术实现路径

### 4.1 数据同步机制

两个 App 需要共享用户数据（进度、配置、成绩）：

```
┌─────────────┐         ┌─────────────┐
│  Core App   │ ←────→ │  Pro App    │
│  (Capacitor)│  同步   │  (Native)   │
└──────┬──────┘         └──────┬──────┘
       │                       │
       └───────────┬───────────┘
                   ↓
            ┌─────────────┐
            │  云端服务    │
            │  (Supabase/  │
            │   Firebase)  │
            └─────────────┘
```

**同步内容**：
- 用户账户 / 登录状态
- 练习时长 / 连续打卡天数
- 成就解锁状态
- 自定义设置（主题、难度偏好）

**技术选择**：
- **Supabase**：开源 Firebase 替代品，PostgreSQL 后端，实时订阅
- **Firebase**：Google 生态，实时数据库，认证齐全
- **自建后端**：Node.js + PostgreSQL，完全可控

### 4.2 深度链接（Deep Link）打通体验

用户在 Core App 中点击"开启专业节奏训练"→跳转到 Pro App：

```
// Core App 中
coreApp.openProFeature('rhythm_score', {
  bpm: 120,
  timeSignature: [4, 4],
  difficulty: 'advanced'
});

// 唤起 Pro App（通过 URL Scheme / Universal Link）
// guitarlabpro://rhythm_score?bpm=120&timeSig=4/4&diff=advanced
```

### 4.3 Pro App 的最小可行范围（MVP）

如果 Pro App 只做一件事，应该是什么？

**推荐：只做「高精度节奏打分」**

理由：
1. 功能单一，原生代码量可控（预计 iOS + Android 各 5k-10k 行）
2. 与 Core App 形成明确的能力分层
3. 付费意愿最强（"帮我提升节奏感"是明确的痛点）
4. 可以复用 Superpowered / Oboe 等现成音频库

---

## 5. 成本对比分析

### 5.1 开发成本

| 方案 | 人力投入 | 时间估算 |
|------|---------|---------|
| **单 App（Capacitor）** | 1个全栈前端 | 3-4个月 MVP |
| **单 App（React Native）** | 1个 RN + 0.5个原生音频 | 4-5个月 MVP |
| **双 App（Core + Pro）** | 1个前端 + 0.5个 iOS + 0.5个 Android | 5-6个月 MVP |

**双 App 的增量成本**：
- Pro App 的原生开发：+2-3个月
- 数据同步后端：+0.5个月
- 两套 App 的发布/维护：+20% 持续成本

### 5.2 长期维护成本

| 方案 | 维护复杂度 | 灵活性 |
|------|-----------|--------|
| 单 App | 低（一套代码） | 中（受限于跨平台框架） |
| 双 App | 中高（两套代码 + 同步逻辑） | 高（Pro 可独立迭代） |

---

## 6. 风险评估

### 6.1 双 App 架构的风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 用户不愿意下载第二个 App | ⚠️ 高 | Core App 内充分预热，Pro 提供不可替代的价值 |
| 数据同步延迟/失败 | ⚠️ 中 | 离线缓存 + 冲突解决策略 |
| Pro App 下载量低 | ⚠️ 中 | 捆绑订阅优惠，Core 内频繁引导 |
| 两个团队节奏不一致 | ⚠️ 中 | 统一产品规划，API 契约先行 |
| App Store 审核两次 | ⚠️ 低 | 提前沟通，Pro 功能边界清晰 |

### 6.2 不拆分的技术风险

| 风险 | 等级 | 说明 |
|------|------|------|
| 节奏打分精度不够 | ⚠️ 高 | Web Audio API 移动端延迟 30-80ms，无法做到±10ms |
| 后台节拍器无法实现 | ⚠️ 中 | Capacitor 需要原生插件，复杂度接近写 Pro App |
| 用户流失到竞品 | ⚠️ 中 | 专业用户会因精度问题转向原生 App |

---

## 7. 推荐实施策略

### 阶段 1：先做单 App（MVP 验证）

```
Guitar Lab Core（Capacitor）
├── 指板记忆游戏
├── 基础节拍器
├── 爱好者级节奏打分（±50ms，Web Audio API）
└── 基础调音器
```

**目标**：验证核心用户群，收集反馈，建立品牌认知。
**时间**：3-4个月。

### 阶段 2：评估是否拆分

决策依据：
- Core App 的 DAU/留存是否健康？
- 用户是否频繁反馈"节奏检测不够准"？
- 是否有足够的预算和人力支持 Pro App？
- 竞品是否有高精度功能形成威胁？

### 阶段 3：开发 Pro App（如果需要）

```
Guitar Lab Pro（Native）
├── 高精度节奏打分（±10ms）
├── 高级节拍器（复杂节奏型）
├── 频谱可视化
└── 深度练习报告
```

**定价策略**：
- Core App：免费（广告或基础功能）
- Pro App：一次性购买 $9.99 或订阅 $2.99/月
- 捆绑优惠：Core 用户首购 Pro 享 5 折

---

## 8. 替代方案：渐进式拆分

如果不希望一开始就拆成两个 App，还有一个折中方案：

### "原生模块插件"方案

```
Guitar Lab（单 App，Capacitor）
├── UI 层：React（跨平台）
├── 核心逻辑：TypeScript（跨平台）
└── 音频模块：原生插件（按需加载）
    ├── iOS：Swift + AudioKit（本地编译为 framework）
    └── Android：Kotlin + Oboe（本地编译为 AAR）
```

**Capacitor 原生插件开发**：

```typescript
// 在 Capacitor App 中调用原生模块
import { RhythmAnalyzer } from 'guitar-lab-rhythm';

// 如果设备支持原生插件，用原生实现
// 如果不支持，回退到 Web Audio API
const result = await RhythmAnalyzer.analyze({
  mode: 'auto', // auto / native / web
  tolerance: 'professional', // casual / professional
  duration: 30 // 秒
});
```

**优缺点**：

| 优点 | 缺点 |
|------|------|
| 用户感知上是一个 App | 需要同时维护 JS + Swift + Kotlin |
| 可以渐进式引入原生能力 | Capacitor 插件开发有学习成本 |
| 不需要数据同步 | 原生模块的调试更复杂 |
| 发布时是一个包 | App 体积会增加 |

**结论**：这个方案在技术上可行，但本质上和双 App 架构的工作量是相似的（都要写 Swift/Kotlin 音频代码），只是打包方式不同。

---

## 9. 最终建议

### 推荐路线：**先单 App，后评估拆分**

理由：
1. **验证优先**：在不知道用户规模和付费意愿之前，不要过早拆分
2. **MVP 原则**：Core App 的爱好者级功能已经能服务 80% 的用户
3. **资源聚焦**：单 App 阶段可以全力打磨产品体验
4. **数据驱动**：用真实用户反馈决定是否值得投入 Pro App

### 决策树

```
开始开发 Guitar Lab
    ↓
Phase 1: 单 App（Capacitor）
    ├── 指板游戏
    ├── 基础节拍器
    └── 爱好者级节奏打分
    ↓
发布后 3-6 个月评估
    ↓
用户反馈中"精度不够"的占比 > 30%？
    ├── 是 → 规划 Pro App（Native）
    └── 否 → 继续完善 Core App
    ↓
Phase 2（可选）: Pro App
    ├── iOS：Swift + AudioKit
    ├── Android：Kotlin + Oboe
    └── 付费解锁高级功能
```

---

## 附录：原生音频模块开发资源

### iOS（Swift + AudioKit）

```swift
import AudioKit
import AVFoundation

class RhythmAnalyzer: ObservableObject {
    private var engine: AudioEngine!
    private var mic: AudioEngine.InputNode!
    private var tracker: RhythmTracker!
    
    func start() {
        engine = AudioEngine()
        mic = engine.input
        tracker = RhythmTracker(mic)
        engine.output = tracker
        try? engine.start()
    }
}
```

### Android（Kotlin + Oboe）

```kotlin
import com.google.oboe.samples.*

class RhythmAnalyzer : AudioStreamCallback {
    private var stream: AudioStream? = null
    
    fun start() {
        val builder = AudioStreamBuilder()
            .setDirection(Direction.Input)
            .setPerformanceMode(PerformanceMode.LowLatency)
            .setSharingMode(SharingMode.Exclusive)
            .setCallback(this)
        
        stream = builder.build()
        stream?.start()
    }
    
    override fun onAudioReady(stream: AudioStream, audioData: Void*, numFrames: Int): DataCallbackResult {
        // 实时处理音频数据
        return DataCallbackResult.Continue
    }
}
```

### 推荐的跨平台音频库

| 库 | 平台 | 用途 |
|----|------|------|
| **Superpowered** | iOS / Android / macOS | C++ 音频引擎，极低延迟 |
| **AudioKit** | iOS / macOS | Swift 音频框架，易用 |
| **Oboe** | Android | Google 官方低延迟音频 C++ API |
| **JUCE** | 全平台 | 专业音频应用框架 |
