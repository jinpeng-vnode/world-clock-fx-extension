"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("./load-lib.js").loadWCFX();

// 假汇率，形状和 refreshFx() 存的一样：base = CNY，rates[CUR] = 1 CNY 可换多少 CUR。不联网。
const FX = { rates: { CNY: 1, USD: 0.14, JPY: 20, EUR: 0.125 } };

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
}

test("cnyPer：1 单位外币值多少人民币", () => {
  assert.equal(W.cnyPer(FX, "CNY"), 1);
  near(W.cnyPer(FX, "JPY"), 0.05);
  assert.ok(Number.isNaN(W.cnyPer(FX, "XXX")));
  assert.ok(Number.isNaN(W.cnyPer(null, "JPY")));
});

test("toUsd：当前币种按市价换成美元", () => {
  assert.equal(W.toUsd(FX, 100, "USD"), 100);
  near(W.toUsd(FX, 100, "CNY"), 14);
  near(W.toUsd(FX, 2000, "JPY"), 14);
  near(W.toUsd(FX, 10, "EUR"), 11.2);
});

test("toUsd：缺汇率时为 NaN（美元自身除外）", () => {
  assert.ok(Number.isNaN(W.toUsd(FX, 1, "XXX")));
  assert.ok(Number.isNaN(W.toUsd(null, 1, "CNY")));
  assert.ok(Number.isNaN(W.toUsd({ rates: { JPY: 20 } }, 1, "JPY")));
  assert.equal(W.toUsd(null, 5, "USD"), 5);
});

test("usdPer：1 单位当前币种兑多少美元", () => {
  assert.equal(W.usdPer(FX, "USD"), 1);
  near(W.usdPer(FX, "JPY"), 0.007);
});

test("normalizeUsdCny：非法值退回默认 7", () => {
  assert.equal(W.normalizeUsdCny(7.2), 7.2);
  assert.equal(W.normalizeUsdCny("6.9"), 6.9);
  for (const bad of [0, -1, "abc", NaN, Infinity]) {
    assert.equal(W.normalizeUsdCny(bad), 7, String(bad));
  }
});

test("pageAmountToCny：当前币种 → USD（市价）→ × 用户倍率 → CNY", () => {
  near(W.pageAmountToCny(FX, 2000, "JPY", 7), 98);
  near(W.pageAmountToCny(FX, 100, "USD", 7.2), 720);
  // 倍率非法时按默认 7 算。
  near(W.pageAmountToCny(FX, 100, "USD", 0), 700);
  assert.ok(Number.isNaN(W.pageAmountToCny(FX, 1, "XXX", 7)));
  near(W.pageAmountToFixedCny(FX, 2000, "JPY", 7), 98);
});