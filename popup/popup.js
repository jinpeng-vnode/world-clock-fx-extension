
(function () {
  const W = globalThis.WCFX;
  let fx = null;
  let offline = false;
  let usdCny = W.DEFAULT_USD_CNY;
  let tickTimer = null;
  let tabOrigin = "";
  let detectedLang = "";
  let activeCountry = null; // resolved country object or null
  let overrideMap = {}; // origin -> countryId | "auto"

  const $ = (id) => document.getElementById(id);

  async function loadOverrides() {
    const o = await chrome.storage.local.get(W.LS_KEYS.langOverrideByOrigin);
    overrideMap = o[W.LS_KEYS.langOverrideByOrigin] || {};
    if (typeof overrideMap !== "object" || Array.isArray(overrideMap)) overrideMap = {};
  }

  async function saveOverride(origin, value) {
    if (!origin) return;
    if (!value || value === "auto") delete overrideMap[origin];
    else overrideMap[origin] = value;
    await chrome.storage.local.set({ [W.LS_KEYS.langOverrideByOrigin]: overrideMap });
  }

  function resolveCountry() {
    const ov = tabOrigin ? overrideMap[tabOrigin] : null;
    if (ov && ov !== "auto") {
      const c = W.countryById(ov);
      if (c) return { country: c, mode: "manual", mappedId: ov };
    }
    const mapped = W.countryIdFromLang(detectedLang);
    if (mapped) {
      return { country: W.countryById(mapped), mode: "auto", mappedId: mapped };
    }
    return { country: null, mode: "none", mappedId: null };
  }

  function syncRegionSelect() {
    const sel = $("regionSelect");
    const ov = tabOrigin ? overrideMap[tabOrigin] : null;
    sel.value = ov && ov !== "auto" ? ov : "auto";
  }

  function renderRegionHint(res) {
    const hint = $("regionHint");
    if (!tabOrigin) {
      hint.textContent = "当前标签页无法识别站点（如特殊页）";
      return;
    }
    if (res.mode === "manual") {
      hint.textContent = `本站手动：${res.country.city}（${res.country.cur}）；检测语言 ${detectedLang || "—"}`;
    } else if (res.mode === "auto") {
      hint.textContent = `跟随网页：语言 ${detectedLang || "—"} → ${res.country.city}（${res.country.cur}）`;
    } else {
      hint.textContent = `语言 ${detectedLang || "—"} 无对应地区，请手动选择`;
    }
  }

  function renderCard(res) {
    activeCountry = res.country;
    const wrap = $("clkSingle");
    const empty = $("noRegion");
    const panel = $("convertPanel");
    if (!res.country) {
      wrap.innerHTML = "";
      empty.hidden = false;
      panel.hidden = true;
      return;
    }
    empty.hidden = true;
    panel.hidden = false;
    wrap.innerHTML = W.renderCardHtml(res.country);
    $("amtCur").textContent = res.country.cur;
    tickAll();
    calcConvert();
  }

  function tickAll() {
    const now = new Date();
    const bj = W.zoneOffsetMin(W.BJ_TZ, now);
    document.querySelectorAll("#clkSingle .clk").forEach((el) => W.tickCard(el, now, bj));
  }

  function calcConvert() {
    const cur = activeCountry ? activeCountry.cur : null;
    const amt = W.parseAmt($("amtInput").value);
    const usdEl = $("usdOut");
    const cnyEl = $("cnyOut");
    const rateUsd = $("rateUsd");
    const rateCny = $("rateCny");

    rateCny.textContent = `1 USD = ${W.fmtNum(usdCny, 4)} CNY（可设置）`;

    if (!cur) {
      usdEl.textContent = "—";
      cnyEl.textContent = "—";
      rateUsd.textContent = "1 CUR ≈ — USD（实时）";
      return;
    }

    const per = W.usdPer(fx, cur);
    rateUsd.textContent = isFinite(per)
      ? `1 ${cur} ≈ ${W.fmtNum(per)} USD（实时）`
      : `1 ${cur} ≈ — USD（实时）`;

    if (!isFinite(amt)) {
      usdEl.textContent = "—";
      cnyEl.textContent = "—";
      return;
    }
    const usd = W.toUsd(fx, amt, cur);
    const cny = W.pageAmountToCny(fx, amt, cur, usdCny);
    usdEl.textContent = isFinite(usd) ? W.fmtNum(usd, 4) : "—";
    cnyEl.textContent = isFinite(cny) ? W.fmtNum(cny, 2) : "—";
  }

  function renderFxNote() {
    const note = $("fxNote");
    if (fx) {
      note.textContent =
        `数据时间 ${W.fmtTime(fx.time)} · 获取于 ${W.fmtTime(fx.fetched)} · 来源 ${fx.src}` +
        (offline ? " · ⚠ 离线，显示缓存" : "");
      note.classList.toggle("warn", offline);
    } else {
      note.textContent = offline ? "⚠ 无法获取汇率，且没有缓存" : "正在获取汇率…";
      note.classList.toggle("warn", offline);
    }
    calcConvert();
  }

  async function doRefresh() {
    const btn = $("fxRefresh");
    btn.disabled = true;
    btn.textContent = "⟳ 更新中…";
    try {
      const r = await chrome.runtime.sendMessage({ type: "wcfx-refresh-fx" });
      if (r) {
        fx = r.fx;
        offline = !!r.offline;
      }
    } catch (e) {
      const r = await W.refreshFx(true);
      fx = r.fx;
      offline = r.offline;
    }
    btn.disabled = false;
    btn.textContent = "⟳ 刷新汇率";
    renderFxNote();
  }

  async function loadTabLangAndOrigin() {
    const box = $("langBox");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || tab.id == null) {
        box.textContent = "语言 —";
        tabOrigin = "";
        detectedLang = "";
        return;
      }
      try {
        tabOrigin = tab.url ? new URL(tab.url).origin : "";
        if (tabOrigin === "null" || tabOrigin.startsWith("chrome") || tabOrigin.startsWith("edge")) {
          tabOrigin = "";
        }
      } catch (e) {
        tabOrigin = "";
      }
      const info = await chrome.tabs.sendMessage(tab.id, { type: "wcfx-get-lang" });
      if (info && info.code) {
        detectedLang = info.code;
        box.textContent = `语言 ${info.code}`;
        box.title = `来源: ${info.source || ""}`;
      } else {
        detectedLang = "";
        box.textContent = "语言 —";
      }
    } catch (e) {
      detectedLang = "";
      box.textContent = "语言 (本页不可用)";
      box.title = "当前标签页未注入 content script（如 chrome://）";
    }
  }

  async function initPageFxToggle() {
    const o = await chrome.storage.local.get(W.LS_KEYS.pageFx);
    const on = o[W.LS_KEYS.pageFx] !== false;
    const el = $("pageFxToggle");
    el.checked = on;
    el.addEventListener("change", async () => {
      await chrome.storage.local.set({ [W.LS_KEYS.pageFx]: el.checked });
    });
  }

  function applyResolved() {
    const res = resolveCountry();
    syncRegionSelect();
    renderRegionHint(res);
    renderCard(res);
  }

  async function init() {
    await loadOverrides();
    usdCny = await W.loadUsdCny();
    $("usdCnyInput").value = String(usdCny);

    await initPageFxToggle();
    await loadTabLangAndOrigin();
    applyResolved();

    const cached = await W.loadCache();
    if (cached) {
      fx = cached;
      offline = false;
      renderFxNote();
    }
    try {
      const r = await chrome.runtime.sendMessage({ type: "wcfx-get-fx" });
      if (r) {
        fx = r.fx;
        offline = !!r.offline;
        renderFxNote();
      }
    } catch (e) {
      const r = await W.maybeAutoRefresh();
      fx = r.fx;
      offline = r.offline;
      renderFxNote();
    }

    $("fxRefresh").onclick = () => doRefresh();

    $("regionSelect").addEventListener("change", async () => {
      const v = $("regionSelect").value;
      await saveOverride(tabOrigin, v);
      applyResolved();
    });

    let usdTimer = null;
    $("usdCnyInput").addEventListener("input", () => {
      clearTimeout(usdTimer);
      usdTimer = setTimeout(async () => {
        usdCny = await W.saveUsdCny($("usdCnyInput").value);
        $("usdCnyInput").value = String(usdCny);
        calcConvert();
      }, 250);
    });

    $("amtInput").addEventListener("input", () => {
      W.formatAmtInput($("amtInput"));
      calcConvert();
    });
    W.formatAmtInput($("amtInput"));

    tickTimer = setInterval(tickAll, 1000);
  }

  init();
})();
