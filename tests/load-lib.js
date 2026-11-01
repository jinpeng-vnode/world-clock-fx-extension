"use strict";
// 测试共用：按 manifest 里内容脚本的顺序加载 lib 四个普通脚本，它们把函数挂到 globalThis.WCFX 上。
// 只加载、不联网：fx.js 的汇率请求只在调用 refreshFx() 时才发，测试里不调。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const LIB = ["countries.js", "format.js", "fx.js", "clock.js"];

function loadWCFX() {
  if (!globalThis.WCFX) {
    for (const name of LIB) {
      const file = path.join(__dirname, "..", "lib", name);
      vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
    }
  }
  return globalThis.WCFX;
}

module.exports = { loadWCFX };