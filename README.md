# 世界时钟与汇率（Chrome / Edge MV3）

按当前网页语言自动显示**一个**对应地区的世界时钟与金额换算；语言显示为**中文名**（如「简体中文」「英语」）；可搜索并手动覆盖本站地区。金额换算仅在弹窗内：市价 CUR→USD，再按可设置的 USD→CNY 倍率→人民币。**不修改页面 DOM**。

## 安装（加载未打包扩展）

1. 打开 Chrome / Edge，地址栏进入 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 打开右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序** / **Load unpacked**
4. 选择本目录：`world-clock-fx-extension`（含 `manifest.json` 的文件夹）
5. 若此前已加载过，点 **重新加载**；打开任意 `http(s)` 页面后点扩展图标

## 功能摘要

| 功能 | 说明 |
|------|------|
| 网站语言 | `tabs.detectLanguage` + `html[lang]` / meta / og:locale / 启发式；徽章显示**中文语言名** |
| 单地区时钟 | 按语言映射只显示 1 个地区；换网页自动切换；可搜索/手动覆盖（按站点 origin） |
| 语言→地区 | 简繁中文→北京 CNY；英语→纽约；日语→东京；德语等→法兰克福/巴黎/…；覆盖欧亚美非主要语种；未知语种→UTC（仍显示时钟，可手动改） |
| 金额换算 | 当前币种 → **USD（实时市价）** → **CNY（用户设定倍率，默认 7）** |
| 设置 | popup 内「1 USD = ___ CNY」；地区下拉可搜索 |

## 验证步骤（重载后）

1. `chrome://extensions` → 本扩展 → **重新加载**
2. 打开任意中文站（或本机 `lang=zh-CN` 页）：徽章应为「简体中文」，主卡为**北京**时钟，换算币种 **CNY**，输入金额应能算出 USD/CNY（非整片 —）
3. 打开 https://github.com ：徽章「英语」，纽约时钟
4. 打开日文站（如 https://www.yahoo.co.jp/）：「日语」+ 东京；德文站：「德语」+ 法兰克福/柏林
5. 在地区搜索框输入「东京」或「JPY」可筛选项；选「跟随网页语言」恢复自动

## 权限

- `storage` / `alarms` / `activeTab` / `tabs`（detectLanguage）
- host：仅汇率 API 域名

## 开发说明

- 不依赖 `file://`
- 共享逻辑在 `lib/`（classic script，挂到 `globalThis.WCFX`）
- 自测清单见 [TESTING.md](./TESTING.md)

## v1.4.0 网页浮窗

- 在 http/https 页面右上角显示可拖拽浮窗（Shadow DOM 隔离样式），内容为时钟卡片 + 金额换算，按时段变色。
- 拖动标题栏移动；位置全局保存，所有标签/新页面同一位置，窗口缩放自动拉回可见区。
- –：收起为一行（城市 + 时间）；×：关闭浮窗。弹窗中「显示浮窗」可重新打开。
- 地区按该页语言或本站手动覆盖；汇率与 USD→CNY 系数与弹窗同步。不修改页面金额。
- 限制：chrome:// / edge:// 页面、扩展商店、PDF 查看器等无法注入。

## v1.4.3 防谷歌翻译

- 浮窗宿主、Shadow 根容器与弹窗页面标记 `translate="no"` / `notranslate`（弹窗另加 `<meta name="google" content="notranslate">`），网页开启谷歌翻译时城市名、时间、金额、按钮文字保持原样。
