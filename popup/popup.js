(function () {
  const W = globalThis.WCFX;
  let fx = null;
  let offline = false;
  let usdCny = W.DEFAULT_USD_CNY;
  let tickTimer = null;
  let tabOrigin = "";
  let tabUrl = "";
  let detectedLang = "";
  let langSource = "";
  let activeCountry = null;
  let overrideMap = {};
  let allRegionOptions = [];

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

  function fillRegionSelect(filterText) {
    const sel = $("regionSelect");
    const prev = sel.value || "auto";
    const q = String(filterText || "").trim().toLowerCase();
    sel.innerHTML = "";
    const optAuto = document.createElement("option");
    optAuto.value = "auto";
    optAuto.textContent = "跟随网页语言";
    sel.appendChild(optAuto);

    const list = W.listRegionsForSelect();
    allRegionOptions = list;
    for (const r of list) {
      const label = `${r.name} · ${r.city} · ${r.cur}`;
      const hay = (label + " " + r.tz + " " + r.id).toLowerCase();
      if (q && hay.indexOf(q) < 0) continue;
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = label;
      sel.appendChild(opt);
    }
    // 恢复选中；若被过滤掉则仍保留 auto
    if ([].some.call(sel.options, (o) => o.value === prev)) sel.value = prev;
    else sel.value = "auto";
  }

  /** 永不返回空卡：未知语种 → UTC */
  function resolveCountry() {
    const ov = tabOrigin ? overrideMap[tabOrigin] : null;
    if (ov && ov !== "auto") {
      const c = W.regionById(ov) || W.countryById(ov);
      if (c) return { country: c, mode: "manual", mappedId: c.id, guessed: false };
    }
    const mappedId = W.regionIdFromLang(detectedLang);
    const c = W.regionById(mappedId) || W.regionById("utc");
    const guessed = mappedId === "utc" && !detectedLang;
    const weak = mappedId === "utc" && !!detectedLang;
    return {
      country: c,
      mode: "auto",
      mappedId: c.id,
      guessed: guessed || weak,
      weakUtc: weak
    };
  }

  function syncRegionSelect() {
    const sel = $("regionSelect");
    const ov = tabOrigin ? overrideMap[tabOrigin] : null;
    const want = ov && ov !== "auto" ? ov : "auto";
    if ([].some.call(sel.options, (o) => o.value === want)) sel.value = want;
    else sel.value = "auto";
  }

  function renderRegionHint(res) {
    const hint = $("regionHint");
    const langZh = W.langDisplayName(detectedLang);
    if (res.mode === "manual") {
      hint.textContent = `本站手动：${res.country.city}（${res.country.cur}）；检测 ${langZh}`;
    } else if (res.weakUtc) {
      hint.textContent = `语言 ${langZh} 暂无精确地区，已用 ${res.country.city}（${res.country.cur}），可手动选择`;
    } else if (!detectedLang) {
      hint.textContent = `未能检测语言，已显示 ${res.country.city}；可手动选择地区`;
    } else {
      hint.textContent = `跟随网页：${langZh} → ${res.country.city}（${res.country.cur}）`;
    }
  }

  function renderCard(res) {
    activeCountry = res.country;
    const card = $("mainCard");
    const mount = $("clkMount");
    // 主卡始终显示
    card.hidden = false;
    if (!res.country) {
      // 理论上不应发生；兜底 UTC
      activeCountry = W.regionById("utc");
      res = { country: activeCountry, mode: "auto", mappedId: "utc", weakUtc: true };
    }
    card.dataset.z = res.country.tz;
    card.dataset.id = res.country.id;
    card.dataset.cur = res.country.cur;
    mount.innerHTML = W.renderCardHtml(res.country);
    $("amtCur").textContent = res.country.cur;
    tickAll();
    calcConvert();
  }

  function tickAll() {
    const card = $("mainCard");
    if (card.hidden || !card.dataset.z) return;
    const now = new Date();
    const bj = W.zoneOffsetMin(W.BJ_TZ, now);
    W.tickCard(card, now, bj);
  }

  function calcConvert() {
    const cur = activeCountry ? activeCountry.cur : null;
    const amt = W.parseAmt($("amtInput").value);
    const usdEl = $("usdOut");
    const cnyEl = $("cnyOut");
    const rateUsd = $("rateUsd");
    const rateCny = $("rateCny");

    rateCny.textContent = `1 USD = ${W.fmtNum(usdCny, 4)} CNY`;

    if (!cur) {
      usdEl.textContent = "—";
      cnyEl.textContent = "—";
      rateUsd.textContent = "1 CUR ≈ — USD";
      return;
    }

    const per = W.usdPer(fx, cur);
    rateUsd.textContent = isFinite(per)
      ? `1 ${cur} ≈ ${W.fmtNum(per)} USD`
      : `1 ${cur} ≈ — USD`;

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
        `数据 ${W.fmtTime(fx.time)} · 获取 ${W.fmtTime(fx.fetched)} · ${fx.src}` +
        (offline ? " · ⚠ 离线缓存" : "");
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

  function isStrongContentSource(source) {
    if (!source) return false;
    const s = String(source);
    if (s.startsWith("heuristic")) return false;
    if (s === "unknown" || s === "github-default") return false;
    return true;
  }

  function langOk(code) {
    if (!code) return false;
    const n = W.normalizeLangCode(code);
    return !!n.primary && n.primary !== "und";
  }

  function pickBestLang(chromeLang, contentLang, contentSource, url) {
    const chromeOk = langOk(chromeLang);
    const contentOk = langOk(contentLang);
    const strong = contentOk && isStrongContentSource(contentSource);

    if (strong && chromeOk) {
      const a = String(contentLang);
      const b = String(chromeLang);
      return a.length >= b.length
        ? { code: contentLang, source: contentSource }
        : { code: chromeLang, source: "tabs.detectLanguage" };
    }
    if (strong) return { code: contentLang, source: contentSource };
    if (chromeOk) return { code: chromeLang, source: "tabs.detectLanguage" };
    if (contentOk) return { code: contentLang, source: contentSource || "content" };

    try {
      const host = new URL(url).hostname || "";
      if (host.includes("github.com")) {
        return { code: "en", source: "github-default" };
      }
    } catch (e) {}
    return { code: "", source: "" };
  }

  async function loadTabLangAndOrigin() {
    const box = $("langBox");
    detectedLang = "";
    langSource = "";
    tabOrigin = "";
    tabUrl = "";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || tab.id == null) {
        box.textContent = "语言 无活动标签";
        box.title = "没有可查询的活动标签页";
        return;
      }

      tabUrl = tab.url || "";
      try {
        tabOrigin = tabUrl ? new URL(tabUrl).origin : "";
        if (
          !tabOrigin ||
          tabOrigin === "null" ||
          tabOrigin.startsWith("chrome:") ||
          tabOrigin.startsWith("edge:") ||
          tabOrigin.startsWith("about:") ||
          tabOrigin.startsWith("devtools:")
        ) {
          tabOrigin = "";
        }
      } catch (e) {
        tabOrigin = "";
      }

      let chromeLang = "";
      try {
        if (chrome.tabs.detectLanguage) {
          chromeLang = await chrome.tabs.detectLanguage(tab.id);
        }
      } catch (e) {
        chromeLang = "";
      }

      let contentLang = "";
      let contentSource = "";
      let contentErr = "";
      try {
        const info = await chrome.tabs.sendMessage(tab.id, { type: "wcfx-get-lang" });
        if (info && info.code) {
          contentLang = info.code;
          contentSource = info.source || "content";
        }
      } catch (e) {
        contentErr = "content script 未注入（如 chrome://、Web Store）";
      }

      const picked = pickBestLang(chromeLang, contentLang, contentSource, tabUrl);
      detectedLang = picked.code || "";
      langSource = picked.source || "";

      const zhName = W.langDisplayName(detectedLang);
      if (detectedLang) {
        box.textContent = `语言 ${zhName}`;
        box.title =
          `${zhName}（${detectedLang}）· 来源: ${langSource}` +
          (chromeLang ? ` · detectLanguage=${chromeLang}` : "") +
          (contentLang ? ` · content=${contentLang}` : "");
      } else {
        box.textContent = contentErr ? "语言 本页受限" : "语言 未能检测";
        box.title =
          contentErr ||
          `detectLanguage=${chromeLang || "—"}；content=${contentLang || "—"}；请手动选择地区`;
      }
    } catch (e) {
      detectedLang = "";
      langSource = "";
      box.textContent = "语言 检测失败";
      box.title = String(e && e.message ? e.message : e);
    }
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

    fillRegionSelect("");
    $("regionFilter").addEventListener("input", () => {
      fillRegionSelect($("regionFilter").value);
      syncRegionSelect();
    });

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
