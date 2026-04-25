# Electron vs PWA 对比：对 Guitar Lab 的选型启示

> 分析日期：2026-04-25
> 对应调研文档：`electron-vs-pwa-architecture.md`
> 目标读者：Guitar Lab 项目技术决策者

---

## 1. Guitar Lab 的桌面端需求清单

在做出技术选型之前，先明确 App 1（指板记忆游戏）和 App 2（节奏工坊）在桌面端的真实需求：

| 需求 | App 1（指板记忆） | App 2（节奏工坊） | 是否需要 Electron 级别能力 |
|------|----------------|----------------|------------------------|
| 指板图 SVG 渲染 | ✅ 必须 | ✅ 必须 | ❌ 浏览器足够 |
| 音频播放（Tone.js） | ✅ 必须 | ✅ 必须 | ❌ Web Audio API 足够 |
| 麦克风采集 | ❌ 不需要 | ✅ 需要 | ❌ getUserMedia 足够 |
| 本地数据存储（进度/成绩） | ✅ 必须 | ✅ 必须 | ❌ IndexedDB 足够 |
| 数据导出（JSON 下载） | ✅ 必须 | ✅ 必须 | ❌ Blob 下载足够 |
| 文件系统深度操作 | ❌ 无此需求 | ❌ 无此需求 | 不需要 |
| 系统托盘/全局快捷键 | ❌ 无此需求 | ❌ 无此需求 | 不需要 |
| 后台节拍器播放（锁屏/后台） | ❌ App 1 不需要 | ⚠️ 需要 | ⚠️ PWA 做不到 |
| 覆盖移动端用户 | ✅ 必须 | ✅ 必须 | Electron 不支持 |

---

## 2. 核心结论：Guitar Lab 不需要 Electron

### 2.1 三个决定性论据

**论据一：Electron 能解的，PWA 都能解**

Guitar Lab 没有任何一个桌面端需求落在"PWA 做不到而 Electron 能做到"的区间：

- 不需要频繁读写文件系统（不像 Obsidian 管理成千上万的 Markdown 文件）
- 不需要系统托盘图标、全局快捷键、原生菜单栏
- 不需要调用操作系统底层 API（如 macOS Touch Bar、Windows 通知中心深度集成）
- 音频播放和采集完全在 Web Audio API / getUserMedia 能力范围内

**论据二：Electron 的代价完全不可接受**

| 代价 | Electron | PWA | Guitar Lab 的体感 |
|------|---------|-----|------------------|
| 包体积 | 100MB+（空壳） | ~5MB（应用本身） | 用户下载一个节拍器要 150MB？ |
| 内存占用 | 150~300MB | 浏览器标签页级别 | 后台挂着一个 Chromium 练吉他？ |
| 启动速度 | 3~5 秒 | <1 秒 | 用户想"打开练 5 分钟"却被启动时间劝退 |
| 更新成本 | 需下载安装包 | 刷新即更新 | 小修复也要用户重新下载？ |

**论据三：Electron 不支持移动端，而 Guitar Lab 必须覆盖移动端**

Electron 的架构决定了它只能做桌面端。Guitar Lab 的核心用户场景包含手机练习（随时随地刷几道题），这意味着：

- 如果选 Electron → 桌面端一套代码，移动端必须另起炉灶（React Native / Flutter / 原生）
- 如果选 PWA → 桌面端就是网页，移动端通过 Capacitor 打包同一套代码

> Obsidian 的教训：Obsidian 桌面用 Electron、移动用 Capacitor，虽然功能接近，但本质上是**两套运行时**，需要分别处理平台差异（如导出 PDF 在移动端不可用）。Guitar Lab 可以避免这个分裂。

---

## 3. 推荐架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Guitar Lab 技术架构                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  桌面端（Windows / macOS / Linux）                           │
│  ├── 首选：PWA（vite-plugin-pwa）                            │
│  │   └── 访问即玩，可安装到桌面，Service Worker 离线缓存      │
│  └── 备选：浏览器直接访问（不安装）                           │
│                                                              │
│  移动端（iOS / Android）                                     │
│  └── Capacitor（打包同一套 Web 代码为原生 App）               │
│      └── 上架 App Store / Google Play                        │
│                                                              │
│  统一技术栈：Vite + React + TypeScript + Tailwind            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 为什么 Capacitor + PWA 是最佳组合

| 优势 | 说明 |
|------|------|
| **一套代码** | Web / PWA / iOS / Android 共用同一份源码 |
| **零门槛访问** | 新用户扫码或点击链接即可开始练习，无需下载 |
| **渐进式转化** | 用户先在 PWA 体验，满意后"安装到桌面"或"下载 App" |
| **自动更新** | Web/PWA 刷新即更新，Capacitor App 通过 `npx cap sync` 同步 |
| **包体积极小** | 应用本体仅几 MB，无 Chromium 壳负担 |

---

## 4. 唯一例外：后台音频

### 4.1 问题定义

PWA 有一个 Guitar Lab 未来可能遇到的能力缺口：**后台音频播放**。

- 用户在 PWA 中打开节拍器，然后切换到其他标签页或锁屏 → 音频停止
- 这是浏览器的安全策略限制，不是技术缺陷
- Capacitor 打包的 App 在移动端同样受 WebView 限制，锁屏后音频也会停止

### 4.2 影响范围评估

| 功能 | 是否受后台音频限制影响 | 当前阶段 |
|------|----------------------|---------|
| 指板记忆游戏（App 1） | ❌ 无影响（不需要后台音频） | Phase 1 |
| 节拍器前台使用 | ❌ 无影响（用户主动使用时在前台） | Phase 1~2 |
| 节拍器后台/锁屏使用 | ✅ 受影响 | Phase 3（可选） |

### 4.3 解决方案（如果需要）

后台音频不是 Electron 能更好解决的问题——Electron 桌面端可以后台运行，但移动端仍然不支持。

真正的跨平台后台音频方案：

| 方案 | 适用平台 | 复杂度 | 推荐度 |
|------|---------|--------|--------|
| Capacitor 原生音频插件 | iOS / Android | 中 | ⭐⭐⭐ 推荐 |
| Web Audio API + Page Visibility API | 桌面浏览器 | 低 | ⭐⭐ 仅前台保活 |
| Electron（桌面）+ Capacitor（移动） | 桌面+移动 | 高 | ⭐ 两套代码，Obsidian 式分裂 |
| 完全原生开发 | iOS / Android | 极高 | ⭐ 放弃跨平台优势 |

> **结论**：后台音频是 App 2 的远期问题，且解决方案是 Capacitor 原生插件，不是 Electron。在 Phase 1~2 完全不构成选型障碍。

---

## 5. 与 Obsidian 方案的对比

Obsidian 的架构选择（桌面 Electron + 移动 Capacitor）与 Guitar Lab 的推荐架构对比：

| 维度 | Obsidian | Guitar Lab（推荐） |
|------|---------|-------------------|
| 桌面端 | Electron | PWA |
| 移动端 | Capacitor | Capacitor |
| 桌面包体积 | 150MB+ | ~5MB |
| 桌面安装方式 | 下载安装包 | 访问即用，可选安装 |
| 代码统一度 | 两套运行时（Chromium vs WebView） | 完全统一（浏览器 / WebView） |
| 为何 Obsidian 用 Electron | 需要深度文件系统集成（Vault 即文件夹） | Guitar Lab 不需要 |

> **关键洞察**：Obsidian 用 Electron 是因为它的核心功能（本地 Markdown 文件管理）必须突破浏览器沙箱。Guitar Lab 的核心功能（指板图 + 音频 + 本地存储）完全在浏览器能力范围内。

---

## 6. 行动建议

### 近期（App 1 MVP）

- [x] **确认不引入 Electron**：PWA（桌面）+ Capacitor（移动）是唯一正确路线
- [ ] 配置 `vite-plugin-pwa`，实现 PWA 离线可用和"安装到桌面"
- [ ] 验证 PWA 在桌面端的音频自动播放策略（需用户交互后启动 AudioContext）
- [ ] 验证 Capacitor 移动端 SVG 指板图的性能和交互体验

### 中期（App 1 迭代 + App 2 预研）

- [ ] 监测用户反馈：是否有大量用户要求"后台节拍器"？
- [ ] 如果需求强烈，评估 Capacitor Community Audio 插件的可行性
- [ ] 桌面端保持 PWA，不因后台音频需求而迁移到 Electron

### 远期（App 2 开发）

- [ ] 如果后台音频是核心卖点，考虑为 Capacitor App 开发原生音频插件（iOS / Android 各一套）
- [ ] 桌面端仍然保持 PWA，后台音频需求通过浏览器扩展或原生封装（Tauri）评估

---

## 7. 总结

| 维度 | Electron | PWA | Guitar Lab 的选择 |
|------|---------|-----|------------------|
| 包体积 | 100MB+ | ~5MB | **PWA** ✅ |
| 启动速度 | 慢 | 快 | **PWA** ✅ |
| 移动端支持 | ❌ 不支持 | ✅ 支持 | **PWA** ✅ |
| 文件系统访问 | ✅ 完整 | ⚠️ 受限 | **PWA** ✅（无此需求）|
| 后台音频 | ✅ 桌面支持 | ❌ 不支持 | 远期用 Capacitor 插件解决 |
| 代码统一度 | 桌面/移动两套 | Web + Capacitor 一套 | **PWA + Capacitor** ✅ |
| 用户获取门槛 | 需下载安装 | 访问即用 | **PWA** ✅ |
| 更新成本 | 高（安装包） | 低（刷新） | **PWA** ✅ |

**最终结论**：Guitar Lab 没有任何一个需求指向 Electron。PWA（桌面）+ Capacitor（移动）在包体积、启动速度、跨平台统一度、用户获取门槛等所有维度都优于 Electron。后台音频的远期需求应通过 Capacitor 原生插件解决，而非引入 Electron。
