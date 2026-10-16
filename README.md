# 世界时钟与汇率（Chrome / Edge MV3）

按当前网页语言自动显示**一个**对应地区的世界时钟与金额换算；语言不准时可按站点手动覆盖。页面金额旁注：市价→USD，再按可设置的 USD→CNY 倍率→人民币。

## 安装（加载未打包扩展）

1. 打开 Chrome / Edge，地址栏进入 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 打开右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序** / **Load unpacked**
4. 选择本目录：`world-clock-fx-extension`（含 `manifest.json` 的文件夹）
5. 若此前已加载过，点 **重新加载**；打开任意 `http(s)` 页面后点扩展图标

## 功能摘要

| 功能 | 说明 |
|------|------|
| 网站语言 | `html[lang]` / meta / og:locale / 启发式；悬浮徽章 + popup 显示 |
| 单地区时钟 | 按语言映射只显示 1 个地区（纽约/法兰克福/伊斯坦布尔/胡志明市/圣保罗）；换网页自动切换；可按站点 origin 手动覆盖 |
| 语言→地区 | en→纽约 USD；de/fr/es/it 等欧语→法兰克福 EUR；tr→伊斯坦布尔；vi→胡志明；pt→圣保罗；zh 等无对应时提示手动选 |
| 金额换算 | 唯一面板：当前币种 → **USD（实时市价）** → **CNY（用户设定倍率，默认 7）**；写明 `1 CUR ≈ x USD`、`1 USD = y CNY` |
| 页面旁注 | 形如 `→ 10.00 USD → ≈¥70`；USD 市价、CNY 用设定倍率 |
| 设置 | popup 内「1 USD = ___ CNY」，存 `chrome.storage.local`，改完立即生效 |

## 权限

- `storage`：汇率缓存、USD→CNY、按站点语言覆盖、旁注开关
- `alarms`：后台定时检查是否需刷新汇率
- `activeTab`：popup 读取当前页语言与 origin
- host：仅汇率 API 域名

## 开发说明

- 不依赖 `file://`
- 共享逻辑在 `lib/`（classic script，挂到 `globalThis.WCFX`）
- 自测清单见 [TESTING.md](./TESTING.md)
