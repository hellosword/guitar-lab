# Electron vs PWA 客户端架构对比调研

> 调研日期：2026-04-25
> 调研范围：跨平台桌面应用两种主流技术方案的深度对比
> 信息来源：技术博客、官方文档、框架维护者分析、行业实践案例

---

## 1. 架构原理

| 维度 | Electron | PWA |
|------|---------|-----|
| **本质** | 桌面应用框架：将 Chromium 浏览器 + Node.js 运行时打包为独立可执行文件 | Web 标准：在系统浏览器中运行的增强型网页 |
| **运行时** | 每个应用自带独立的 Chromium + V8 + Node.js | 复用用户已安装的浏览器引擎 |
| **进程模型** | 主进程（Node.js）+ 渲染进程（Chromium），通过 IPC 通信 | 浏览器标签页 + Service Worker（后台代理） |
| **安装方式** | 下载安装包（.exe/.dmg/.AppImage） | 访问 URL 即可使用，可选"添加到桌面" |
| **典型代表** | VS Code、Slack、Discord、Obsidian（桌面端） | Twitter Lite、Spotify Web、Pinterest |

**核心差异**：Electron 是"把浏览器塞进你的应用"，PWA 是"让网页变得更像应用"。

---

## 2. 包体积与性能

| 指标 | Electron | PWA |
|------|---------|-----|
| **安装包体积** | 80~150 MB（仅空壳 Chromium） | ~0 MB（就是网页，无需安装包） |
| **运行时内存** | 150~300 MB+（每个实例独立 Chromium） | 与浏览器共享资源，增量极小 |
| **冷启动速度** | 较慢（需加载完整 Chromium） | 快（首次加载后 Service Worker 缓存） |
| **热启动速度** | 快（本地二进制） | 极快（从缓存加载，可离线） |
| **多开代价** | 每个窗口一个渲染进程，内存翻倍 | 浏览器标签页级别开销 |

> Electron 的硬伤：每个应用都自带一个完整的 Chromium 实例。Slack 被用户调侃"我的电脑里跑了 5 个 Chromium"。

---

## 3. 系统能力访问

| 能力 | Electron | PWA |
|------|---------|-----|
| **文件系统** | ✅ 完整读写（Node.js `fs` 模块） | ⚠️ 受限（File System Access API，需用户逐文件授权） |
| **系统通知** | ✅ 原生通知 | ✅ 推送通知（依赖浏览器实现） |
| **系统托盘/菜单栏** | ✅ 完全支持 | ❌ 不支持 |
| **全局快捷键** | ✅ 支持 | ❌ 不支持 |
| **后台运行** | ✅ 可最小化到托盘持续运行 | ⚠️ 有限（Service Worker 有生命周期限制） |
| **硬件访问（USB/蓝牙）** | ✅ 可通过 Node.js 原生模块 | ⚠️ Web Serial/Web Bluetooth API 支持有限 |
| **音频（Web Audio）** | ✅ 完整支持 | ✅ 完整支持 |
| **后台音频播放** | ✅ 支持 | ❌ **PWA 无法锁屏/切换标签后继续播放音频** |

> **关键差异**：Electron 能做任何原生应用能做的事；PWA 能做的事受限于浏览器厂商实现的 Web 标准。

---

## 4. 跨平台覆盖

| 平台 | Electron | PWA |
|------|---------|-----|
| **Windows** | ✅ | ✅（Chrome/Edge） |
| **macOS** | ✅ | ✅（Chrome/Safari） |
| **Linux** | ✅ | ✅（Chrome/Firefox） |
| **iOS** | ❌ **不支持** | ✅（Safari） |
| **Android** | ❌ **不支持** | ✅（Chrome） |

> **致命差异**：Electron 无法用于移动端。如果产品需要覆盖手机用户，Electron 不是可选项。

---

## 5. 部署与更新

| 维度 | Electron | PWA |
|------|---------|-----|
| **分发渠道** | 官网下载、GitHub Releases、应用商店（需额外打包） | 直接访问 URL，无需审核 |
| **更新机制** | 需实现自动更新逻辑（如 electron-updater） | 自动：用户下次访问即获得最新版本 |
| **版本碎片化** | 严重：用户可能长期不更新 | 无：所有用户始终使用最新版 |
| **离线可用** | ✅ 完全离线 | ✅ Service Worker 缓存后离线 |
| **网络依赖** | 首次安装后无需网络 | 首次访问需网络，缓存后可离线 |

---

## 6. 安全性

| 维度 | Electron | PWA |
|------|---------|-----|
| **安全模型** | 应用自身负责（需手动配置 CSP、沙箱、contextIsolation） | 浏览器安全沙箱（同源策略、CSP、HTTPS 强制） |
| **代码注入风险** | ⚠️ 较高：XSS 可能演变为 RCE（远程代码执行） | ✅ 极低：受浏览器沙箱限制 |
| **权限粒度** | 应用获得全部 Node.js 权限 | 按 API 逐项申请用户授权 |
| **自动播放策略** | 需处理 Chromium 自动播放限制 | 同样受浏览器自动播放策略限制 |

> Electron 的 Node.js 集成是双刃剑：强大但危险。如果渲染进程被注入恶意脚本，攻击者可以直接操作文件系统。

---

## 7. 开发与维护成本

| 维度 | Electron | PWA |
|------|---------|-----|
| **技术栈** | HTML/CSS/JS + Node.js + Electron API | 纯 HTML/CSS/JS + Web API |
| **学习成本** | 中：需理解主进程/渲染进程、IPC、原生打包 | 低：标准 Web 开发 |
| **调试体验** | 好：内置 Chromium DevTools | 好：浏览器 DevTools |
| **构建工具** | electron-builder / electron-forge | Vite / Webpack + Workbox（PWA 插件） |
| **CI/CD 复杂度** | 高：需为每个平台构建签名安装包 | 低：静态文件部署到 CDN |
| **第三方依赖** | 可使用任何 Node.js 模块 | 仅限浏览器兼容的 npm 包 |

---

## 8. 决策矩阵：何时选哪个？

| 你的需求 | 推荐方案 | 原因 |
|---------|---------|------|
| 需要深度系统集成（文件管理器、IDE、系统托盘） | Electron | PWA 做不到 |
| 需要覆盖移动端用户 | PWA | Electron 不支持手机 |
| 需要后台运行/锁屏播放 | Electron 或原生 | PWA 后台能力受限 |
| 追求最小包体积、最快启动 | PWA | Electron 壳子 100MB+ |
| 需要自动更新、零版本碎片化 | PWA | 刷新即更新 |
| 追求最高安全性（金融/医疗） | PWA | 浏览器沙箱更可靠 |
| 团队只有 Web 前端经验 | PWA | 零额外学习成本 |
| 需要运行 C++/Rust 原生代码 | Electron | 可通过 Node.js NAPI |
| 需要像素级一致的跨平台渲染 | Electron | 自带固定版本 Chromium |

---

## 9. 替代方案速览

Electron 和 PWA 并非唯二选择，近年来还出现了新的竞争者：

| 方案 | 原理 | 包体积 | 适用场景 |
|------|------|--------|---------|
| **Tauri** | Rust 写原生壳 + 系统 WebView 渲染 | ~5 MB | 需要原生能力但嫌 Electron 太重 |
| **Wails** | Go 写后端 + 系统 WebView 渲染 | ~10 MB | Go 生态团队 |
| **Flutter Desktop** | 自研 Skia 渲染引擎 | ~20 MB | 需要高度自定义 UI |
| **PWA + Capacitor** | PWA 打包为移动端 App | ~0 MB（Web 代码） | 一套代码覆盖 Web + 移动端 |

> 对于需要"桌面 + 移动"统一覆盖的场景，**PWA + Capacitor** 是目前最主流的组合，Obsidian 正是采用此方案（桌面 Electron、移动 Capacitor）。

---

## 10. 参考资料

1. Felix Rieseberg（Electron 核心维护者）的分析：https://felixrieseberg.com/progressive-web-apps-electron/
2. Cleancommit - PWA vs Electron 对比：https://cleancommit.io/blog/pwa-vs-electron-which-architecture-wins/
3. Electron 官方文档：https://electronjs.org/
4. Progressive Web Apps 官方指南：https://web.dev/progressive-web-apps/
5. Tauri 官方文档（Electron 替代方案）：https://tauri.app/
