"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("./load-lib.js").loadWCFX();

function cityOf(lang) {
  return W.regionById(W.regionIdFromLang(lang)).city;
}

test("语言到地区：中文简繁一律北京", () => {
  for (const lang of ["zh", "zh-CN", "zh-Hans", "zh-TW", "zh-Hant", "zh_HK"]) {
    assert.equal(W.regionIdFromLang(lang), "cn", lang);
  }
  assert.equal(cityOf("zh-TW"), "北京");
});

test("语言到地区：英语纽约、日语东京、葡语巴西", () => {
  assert.equal(W.regionIdFromLang("en"), "us");
  assert.equal(cityOf("en"), "纽约");
  assert.equal(W.regionIdFromLang("ja"), "jp");
  assert.equal(cityOf("ja"), "东京");
  assert.equal(W.regionIdFromLang("pt"), "br");
  assert.equal(W.regionIdFromLang("pt-BR"), "br");
  assert.equal(cityOf("pt-BR"), "圣保罗");
});

test("语言到地区：带地区子标签按精确表", () => {
  assert.equal(W.regionIdFromLang("en-GB"), "gb");
  assert.equal(W.regionIdFromLang("pt-PT"), "pt");
  assert.equal(W.regionIdFromLang("es-MX"), "mx");
});

test("语言到地区：未知语种、空值、und 回落到 UTC", () => {
  for (const lang of ["xx", "qaa-Latn", "", null, undefined, "und", "en?".slice(3)]) {
    assert.equal(W.regionIdFromLang(lang), "utc", String(lang));
  }
  assert.equal(W.regionById("utc").tz, "UTC");
});

test("启发式检测带问号的语言码也能映射", () => {
  assert.equal(W.regionIdFromLang("en?"), "us");
  assert.equal(W.regionIdFromLang("ru?"), "ru");
});

test("regionById：旧 id 别名、不存在返回 null", () => {
  assert.equal(W.regionById("eu").id, "eu-de");
  assert.equal(W.regionById("nope"), null);
  assert.equal(W.regionById(""), null);
});

test("pickBestLang：页面强信号压过 detectLanguage", () => {
  const r = W.pickBestLang("zh-CN", "pt", "html[lang]", "https://example.com/");
  assert.deepEqual(r, { code: "pt", source: "html[lang]" });
});

test("pickBestLang：页面只有启发式时用 detectLanguage", () => {
  const r = W.pickBestLang("zh-CN", "en?", "heuristic:Latin", "https://example.com/");
  assert.deepEqual(r, { code: "zh-CN", source: "tabs.detectLanguage" });
});

test("pickBestLang：同语种取更具体的标签", () => {
  assert.deepEqual(W.pickBestLang("pt-BR", "pt", "html[lang]", ""), { code: "pt-BR", source: "tabs.detectLanguage" });
  assert.deepEqual(W.pickBestLang("pt", "pt-BR", "html[lang]", ""), { code: "pt-BR", source: "html[lang]" });
});

test("pickBestLang：两边都没有时 GitHub 默认英语，其余为空", () => {
  assert.deepEqual(W.pickBestLang("", "", "unknown", "https://github.com/a/b"), { code: "en", source: "github-default" });
  assert.deepEqual(W.pickBestLang("", "", "unknown", "https://example.com/"), { code: "", source: "" });
});

test("pickBestLang：没有 detectLanguage 时用页面弱信号", () => {
  assert.deepEqual(W.pickBestLang("und", "ja", "heuristic:CJK", ""), { code: "ja", source: "heuristic:CJK" });
});

test("langDisplayName：显示中文语言名", () => {
  assert.equal(W.langDisplayName("zh-CN"), "简体中文");
  assert.equal(W.langDisplayName("en"), "英语");
  assert.equal(W.langDisplayName(""), "未能检测");
});

test("zoneOffsetMin：北京 +480、东京 +540、UTC 0", () => {
  const d = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  assert.equal(W.zoneOffsetMin("Asia/Shanghai", d), 480);
  assert.equal(W.zoneOffsetMin("Asia/Tokyo", d), 540);
  assert.equal(W.zoneOffsetMin("UTC", d), 0);
});

test("phaseOf：白天、黎明、黄昏、夜晚的分界", () => {
  assert.equal(W.phaseOf(5, 30), "dawn");
  assert.equal(W.phaseOf(6, 0), "day");
  assert.equal(W.phaseOf(17, 29), "day");
  assert.equal(W.phaseOf(17, 30), "dusk");
  assert.equal(W.phaseOf(19, 0), "night");
  assert.equal(W.phaseOf(2, 0), "night");
});

test("listRegionsForSelect：常用优先、不重复、全部地区都在", () => {
  const list = W.listRegionsForSelect();
  assert.equal(list[0].id, "cn");
  assert.equal(new Set(list.map((r) => r.id)).size, list.length);
  assert.equal(list.length, W.REGIONS.length);
});