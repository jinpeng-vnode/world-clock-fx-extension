# 世界时钟与汇率（Chrome / Edge MV3）

自动识别当前网站语言、世界时钟（5 国）、时钟卡货币→人民币换算，以及页面可见金额旁注（标准汇率→USD→固定 ×7 人民币）。

## 安装（加载未打包扩展）

1. 打开 Chrome / Edge，地址栏进入 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 打开右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序** / **Load unpacked**
4. 选择本目录：`world-clock-fx-extension`（含 `manifest.json` 的文件夹）
5. 固定扩展图标；打开任意 `http(s)` 页面，右下角可见语言徽章；点击图标打开 popup 查看时钟与汇率

## 功能摘要

| 功能 | 说明 |
|------|------|
| 网站语言 | `html[lang]` / meta / og:locale / 启发式；悬浮徽章 + popup 显示 |
| 世界时钟 | 纽约 / 法兰克福 / 伊斯坦布尔 / 胡志明市 / 圣保罗；SVG 表盘每秒刷新；相对北京时差；日夜相位整卡变色；国家可开关 |
| 时钟卡汇率 | 本国货币→人民币（市场汇率）；主源 open.er-api.com，备用 fawazahmed0；缓存 >1h 才自动刷新 |
| 页面金额 | 标准汇率转 USD，再按 **1 USD = 7 CNY** 旁注；popup 可开关 |

## 权限

- `storage`：汇率缓存与开关
- `alarms`：后台定时检查是否需刷新汇率
- `activeTab`：popup 读取当前页语言
- host：仅汇率 API 域名

## 开发说明

- 不依赖 `file://`
- 共享逻辑在 `lib/`（classic script，挂到 `globalThis.WCFX`）
- 自测清单见 [TESTING.md](./TESTING.md)
