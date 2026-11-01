"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("./load-lib.js").loadWCFX();

test("fmtNum：按数量级定小数位、千分位", () => {
  assert.equal(W.fmtNum(1234.567), "1,234.57");
  assert.equal(W.fmtNum(1.23456789), "1.2346");
  assert.equal(W.fmtNum(0.5), "0.5");
  assert.equal(W.fmtNum(0.0012345678), "0.001235");
  assert.equal(W.fmtNum(100), "100");
});

test("fmtNum：指定小数位、非有限值显示破折号", () => {
  assert.equal(W.fmtNum(1.23456, 2), "1.23");
  assert.equal(W.fmtNum(NaN), "—");
  assert.equal(W.fmtNum(Infinity), "—");
});

test("parseAmt：去千分位、非法输入为 NaN", () => {
  assert.equal(W.parseAmt("1,234.5"), 1234.5);
  assert.equal(W.parseAmt("100"), 100);
  assert.ok(Number.isNaN(W.parseAmt("abc")));
  assert.ok(Number.isNaN(W.parseAmt("")));
});

function fakeInput(value) {
  return {
    value,
    selectionStart: value.length,
    caret: null,
    setSelectionRange(a) { this.caret = a; }
  };
}

test("formatAmtInput：输入时加千分位、只留一个小数点、去前导零", () => {
  const a = fakeInput("1234567");
  W.formatAmtInput(a);
  assert.equal(a.value, "1,234,567");
  assert.equal(a.caret, a.value.length);
  const b = fakeInput("1234.5.6");
  W.formatAmtInput(b);
  assert.equal(b.value, "1,234.56");
  const c = fakeInput("007x");
  W.formatAmtInput(c);
  assert.equal(c.value, "7");
});

test("clock.esc：转义 HTML 特殊字符", () => {
  assert.equal(W.esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("clock.renderCardHtml：城市名转义后放进卡片", () => {
  const html = W.renderCardHtml({ name: "日本", city: "东<京" });
  assert.ok(html.includes("日本 · 东&lt;京"));
  assert.ok(html.includes('class="face"'));
});