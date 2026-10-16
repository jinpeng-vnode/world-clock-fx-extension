(function () {
  const W = globalThis.WCFX;
  const MIGRATE_OVERRIDE_KEY = "wcfx_override_cleared_v131";
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
  /** 禁止程序化改 select 时误写入覆盖 */
  let suppressSelectSave = false;

  const $ = (id) => document.getElementById(id);

  async function migrateOverridesOnce() {
    const o = await chrome.storage.local.get(MIGRATE_OVERRIDE_KEY);
    if (o[MIGRATE_OVERRIDE_KEY]) return false;
    await chrome.storage.local.set({
      [W.LS_KEYS.langOverrideByOrigin]: {},
      [MIGRATE_OVERRIDE_KEY]: true
    });
    overrideMap = {};
    return true;
  }

  async function loadOverrides() {
    await migrateOverridesOnce();
    const o = await chrome.storage.local.get(W.LS_KEYS.langOverrideByOrigin);
    overrideMap = o[W.LS_KEYS.langOverrideByOrigin] || {};
    if (typeof overrideMap !== "object" || Array.isArray(overrideMap)) overrideMap = {};
    // 去掉无效/脏值：只保留真实 region id；"auto"/空 一律删除
    let dirty = false;
    for (const k of Object.keys(overrideMap)) {
      const v = overrideMap[k];
      if (!v || v === "auto" || !(W.regionById(v) || W.countryById(v))) {
        delete overrideMap[k];
        dirty = true;
      }
    }
    if (dirty) {
      await chrome.storage.local.set({ [W.LS_KEYS.langOverrideByOrigin]: overrideMap });
    }
  }

  /** 仅主动选具体地区时写入；选「跟随网页语言」必须清除该站覆盖 */
  async function saveOverride(origin, value) {
    if (!origin) return;
    if (!value || value === "auto") {
      if (overrideMap[origin] != null) {
        delete overrideMap[origin];
        await chrome.storage.local.set({ [W.LS_KEYS.langOverrideByOrigin]: overrideMap });
      }
      return;
    }
    const c = W.regionById(value) || W.countryById(value);
    if (!c) return;
    if (overrideMap[origin] === c.id) return;
    overrideMap[origin] = c.id;
    await chrome.storage.local.set({ [W.LS_KEYS.langOverrideByOrigin]: overrideMap });
  }

  function fillRegionSelect(filterText) {
    const sel = $("regionSelect");
    const prev = sel.value || "auto";
    const q = String(filterText || "").trim().toLowerCase();
    suppressSelectSave = true;
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
    if ([].some.call(sel.options, (o) => o.value === prev)) sel.value = prev;
    else sel.value = "auto";
    suppressSelectSave = false;
  }

  /**
   * 跟随网页：严格按检出语言映射（pt→圣保罗等），不被旧覆盖卡住。
   * 仅当该 origin 仍存有效手动地区 id 时才用手动。
   */
  function resolveCountry() {
    const ov = tabOrigin ? overrideMap[tabOrigin] : null;
    if (ov && ov !== "auto") {
      const c = W.regionById(ov) || W.countryById(ov);
      if (c) return { country: c, mode: "manual", mappedId: c.id, guessed: false };
      // 脏覆盖：忽略并走自动
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
    const want = ov && ov !== "auto" && (W.regionById(ov) || W.countryById(ov)) ? ov : "auto";
    suppressSelectSave = true;
    if ([].some.call(sel.options, (o) => o.value === want)) sel.value = want;
    else sel.value = "auto";
    suppressSelectSave = false;
  }

  function renderRegionHint(res) {
    const hint = $("regionHint");
    const langZh = W.langDisplayName(detectedLang);
    if (res.mode === "manual") {
      hint.textContent =
        `已手动固定：${res.country.city}（${res.country.cur}）。` +
        `网页语言为${langZh}；请改回「跟随网页语言」才会随语言自动切换地区。`;
    } else if (res.weakUtc) {
      hint.textContent =
        `跟随网页中：语言 ${langZh} 暂无精确地区，暂用 ${res.country.city}（${res.country.cur}），可手动选择`;
    } else if (!detectedLang) {
      hint.textContent =
        `跟随网页中：未能检测语言，已显示 ${res.country.city}；可手动选择地区`;
    } else {
      hint.textContent =
        `跟随网页中：${langZh} → ${res.country.city}（${res.country.cur}）`;
    }
  }

  function renderCard(res) {
    activeCountry = res.country;
    const card = $("mainCard");
    const mount = $("clkMount");
    card.hidden = false;
    if (!res.country) {
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

    const FLOAT_KEY = "wcfx_float_enabled";
    const fo = await chrome.storage.local.get(FLOAT_KEY);
    $("floatToggle").checked = fo[FLOAT_KEY] !== false;
    $("floatToggle").addEventListener("change", () => {
      chrome.storage.local.set({ [FLOAT_KEY]: $("floatToggle").checked });
    });

    $("regionSelect").addEventListener("change", async () => {
      if (suppressSelectSave) return;
      const v = $("regionSelect").value;
      // 仅用户主动选择时写入；「跟随网页语言」清除本站覆盖
      await saveOverride(tabOrigin, v === "auto" ? "auto" : v);
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
