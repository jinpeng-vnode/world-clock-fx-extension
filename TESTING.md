# 自测清单（TESTING）

> 约定：未全部勾选「核心」项前，不宣称可交用户安装。

## 环境

- [ ] Chrome 或 Edge 已用「加载已解压」载入本目录（或点重新加载）
- [ ] manifest.json 无报错；service worker 状态为运行中

## 1. 语言中文名 + 永不空白主卡

- [ ] 中文页（zh / zh-CN / zh-Hans / zh-TW / zh-Hant）：徽章显示「简体中文/中文/繁体中文」等，**不是** `zh-CN`
- [ ] 上述中文页主卡为**北京** Asia/Shanghai + CNY，时钟可见、换算可算
- [ ] GitHub：徽章「英语」，纽约时钟
- [ ] 日文/德文站：中文语言名 + 对应时区时钟
- [ ] 未知语种：仍显示主卡（UTC 或合理猜），提示可手动选；**不会**「无对应地区」整块消失
- [ ] 地区下拉可搜索，远多于 5 项；可选「跟随网页语言」

## 2. 世界时钟（单卡）

- [ ] SVG 时分秒针每秒走动；数字时间正确
- [ ] 日期星期、上午/下午、相对北京时差
- [ ] 日夜相位整卡变色（非统一死黑）

## 3. 金额换算

- [ ] CUR → USD（实时）→ CNY（设定倍率）；有货币时不应整片 —
- [ ] 修改「1 USD = ___ CNY」后 CNY 结果变化
- [ ] 页面 DOM **无**改动（无旁注、无徽章）

## 4. 工程

- [ ] `node --check` 全部 JS 通过
- [ ] `regionIdFromLang('zh-CN') === 'cn'` 等纯函数用例通过

## 自测执行记录

- 日期：2026-10-16（Asia/Shanghai）
- 机器：DESKTOP-PSIGP84
- 路径：W:\github仓库同步目录\world-clock-fx-extension\
- 变更：v1.3.0 全球语种映射 + 语言中文名 + 中文必出北京 + 主卡永不空白
- 结论：脚本层用例通过；请用户重新加载后人工点验

## v1.4.2 本机验收（2026-10-16）

有头 Edge + CDP（`--load-extension` 解包）：

| URL | html lang | 浮窗 region/city/cur |
|-----|-----------|----------------------|
| http://127.0.0.1:8765/br.html | pt-BR | br / 圣保罗 / BRL |
| http://127.0.0.1:8765/pt.html | pt | br / 圣保罗 / BRL |
| http://127.0.0.1:8765/cn.html | zh-CN | cn / 北京 / CNY |

另测：origin 手动覆盖为 cn 时 br 页浮窗变北京；清除覆盖后回到圣保罗。
根因：旧 `pickLang` 用字符串长度让 `tabs.detectLanguage` 的 `zh-CN` 压过页面 `pt`；现 `pickBestLang` 强页面信号优先，弹窗/浮窗共用。
