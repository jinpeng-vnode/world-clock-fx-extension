(function (g) {
  const PRIMARY = "https://open.er-api.com/v6/latest/CNY";
  const FALLBACKS = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json",
    "https://latest.currency-api.pages.dev/v1/currencies/cny.json"
  ];
  const CACHE_MS = 3600e3;
  /** 用户硬性：1 USD = 7 CNY（页面金额展示用） */
  const FIXED_USD_CNY = 7;

  async function fetchJSON(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function loadCache() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const k = (g.WCFX && g.WCFX.LS_KEYS && g.WCFX.LS_KEYS.fx) || "wcfx_fx_cache";
        const o = await chrome.storage.local.get(k);
        return o[k] || null;
      }
    } catch (e) {}
    return null;
  }

  async function saveCache(fx) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const k = (g.WCFX && g.WCFX.LS_KEYS && g.WCFX.LS_KEYS.fx) || "wcfx_fx_cache";
        await chrome.storage.local.set({ [k]: fx });
      }
    } catch (e) {}
  }

  /**
   * 拉取汇率：base = CNY，rates[CUR] = 1 CNY 可换多少 CUR
   * 本国货币 → 人民币：amount * (1/rates[CUR])
   */
  async function refreshFx(force) {
    let got = null;
    try {
      const j = await fetchJSON(PRIMARY);
      if (j.result === "success" && j.rates) {
        got = { rates: j.rates, time: j.time_last_update_unix * 1000, src: "open.er-api.com" };
      }
    } catch (e) {}
    if (!got) {
      for (const u of FALLBACKS) {
        try {
          const j = await fetchJSON(u);
          if (j && j.cny) {
            const rates = {};
            for (const k in j.cny) rates[k.toUpperCase()] = j.cny[k];
            got = {
              rates,
              time: new Date((j.date || "") + "T00:00:00Z").getTime() || Date.now(),
              src: "fawazahmed0 currency-api"
            };
            break;
          }
        } catch (e) {}
      }
    }
    if (got) {
      got.fetched = Date.now();
      await saveCache(got);
      return { fx: got, offline: false };
    }
    const cached = await loadCache();
    return { fx: cached, offline: true };
  }

  async function maybeAutoRefresh() {
    const cached = await loadCache();
    if (!cached || Date.now() - (cached.fetched || 0) > CACHE_MS) {
      return refreshFx(false);
    }
    return { fx: cached, offline: false };
  }

  function cnyPer(fx, cur) {
    return fx && fx.rates && fx.rates[cur] ? 1 / fx.rates[cur] : NaN;
  }

  /** 标准汇率：CUR → USD */
  function toUsd(fx, amount, cur) {
    if (!fx || !fx.rates || !fx.rates[cur] || !fx.rates.USD) return NaN;
    // amount CUR → CNY_market → USD
    const cny = amount * cnyPer(fx, cur);
    return cny * fx.rates.USD;
  }

  /** 页面金额：CUR → USD（标准）→ ×7 → 展示人民币 */
  function pageAmountToFixedCny(fx, amount, cur) {
    const usd = toUsd(fx, amount, cur);
    return isFinite(usd) ? usd * FIXED_USD_CNY : NaN;
  }

  g.WCFX = g.WCFX || {};
  Object.assign(g.WCFX, {
    PRIMARY, FALLBACKS, CACHE_MS, FIXED_USD_CNY,
    fetchJSON, loadCache, saveCache, refreshFx, maybeAutoRefresh,
    cnyPer, toUsd, pageAmountToFixedCny
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
