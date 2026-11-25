# 下班工资计数器 V3.1.5

这是一个轻量的 Windows / macOS 固定桌面小组件，使用 Tauri + 系统 WebView，不再把 Electron / Chromium 整套运行时打进安装包。

## 桌面小组件显示

- 首次启动默认在主显示器工作区右上角显示 **520 × 524** 小组件。
- 直接复用用户确认的原版深蓝金色面板、原有排版和全部实时数据；只对完整面板等比例缩小，不另做一套简化版 UI。
- 画布精确裁切到原设计面板边界，去掉四周多余背景和黑边；透明窗口，不显示额外标题栏、窗口边框或阴影。
- 固定在右上角，不可拖动；可用左下角缩放手柄或设置中的宽度调整，始终保持原版面板比例。置顶默认关闭，可自由切换并保存。
- Windows 不占任务栏，只在系统托盘保留入口；macOS 使用菜单栏状态图标并隐藏 Dock 图标。
- 托盘菜单可打开完整面板、添加/显示桌面小组件、移除桌面小组件或退出程序。
- 移除小组件只隐藏桌面显示，不退出后台程序、不删除工资设置；点击托盘图标可打开原完整面板。
- 设置为独立可滚动的小窗口，不改变主组件尺寸；工资说明与月度统计仍可打开完整面板。
- 设置中也可以勾选“显示桌面小组件”；托盘菜单提供相同的添加/移除操作。
- 保留原工资计算、工时、节假日、设置导入/导出、逐秒累计、进度环、收入图表、月度统计和所有原始数据项。
- 启动时尝试迁移旧 Electron 版本的 config.json，尽量沿用原工资与工时设置。

## 构建

需要 Node.js 20+、Rust stable（1.90+）、Tauri v2 系统构建依赖。

```bash
npm install
npm run build:assets
npm run tauri:build
```

Windows 输出 NSIS EXE；macOS 输出 DMG。Windows 使用系统 WebView2，安装程序采用小型在线 bootstrapper，不再把 Chromium 运行时打入安装包。Windows 10（2018 年 4 月更新及以后）和 Windows 11 通常随系统提供 WebView2。

## 测试

```bash
npm run build:assets
npm run test:syntax
node scripts/test-html.js
python scripts/test-ui.py
cargo test --manifest-path src-tauri/Cargo.toml
```

CI 在 Ubuntu 上执行原版 UI、计薪与设置测试，在 Windows 原生环境执行 Rust 后端单元测试并构建安装包，同时在 macOS Apple Silicon 和 Intel 环境分别构建 DMG、校验 APP 归档与 SHA-256。

## 文件

- `assets/logo.svg`：用户确认的原始矢量 Logo。
- `assets/icon.png`、`assets/icon.ico`、`assets/icon.icns`、`assets/tray.png`：由确认的 SVG 自动生成的各平台图标。
- `src-tauri/src/main.rs`：托盘、固定窗口、配置持久化和自动启动。
- `index.html`：原版完整面板、计薪逻辑和等比缩放布局。
- `source/`：完整 HTML 原始分片，便于审计和还原。

代码签名和 Apple 公证按用户要求暂不配置。

## 3.1.5 设置界面
独立设置窗口采用深蓝金色卡片、分类导航、切换开关和组件尺寸滑块；保留工资、工时、日历、导入导出等原有设置。主组件视觉素材与计薪逻辑不变。

## 3.1.5 原图完整性修复
恢复顶部原版睡猫与睡眠符号；透明画布包含全部原图非透明像素，面板宽度及内部布局不变。
