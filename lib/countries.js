/* shared: country list + lang→region + phase helpers (classic script) */
(function (g) {
  const COUNTRIES = [
    { id: "us", name: "美国", city: "纽约", tz: "America/New_York", cur: "USD", curName: "美元", langs: ["en"] },
    { id: "eu", name: "欧元区", city: "法兰克福", tz: "Europe/Berlin", cur: "EUR", curName: "欧元", langs: ["de", "fr", "es", "it"] },
    { id: "tr", name: "土耳其", city: "伊斯坦布尔", tz: "Europe/Istanbul", cur: "TRY", curName: "土耳其里拉", langs: ["tr"] },
    { id: "vn", name: "越南", city: "胡志明市", tz: "Asia/Ho_Chi_Minh", cur: "VND", curName: "越南盾", langs: ["vi"] },
    { id: "br", name: "巴西", city: "圣保罗", tz: "America/Sao_Paulo", cur: "BRL", curName: "巴西雷亚尔", langs: ["pt"] }
  ];
  const BJ_TZ = "Asia/Shanghai";
  const DEFAULT_USD_CNY = 7;
  const LS_KEYS = {
    fx: "wcfx_fx_cache",
    pageFx: "wcfx_page_fx_enabled",
    pageFxHint: "wcfx_page_fx_hint",
    usdCny: "wcfx_usd_cny",
    langOverrideByOrigin: "wcfx_lang_override_by_origin"
  };

  /** 欧语等映射到法兰克福 */
  const EU_LANGS = new Set([
    "de", "fr", "es", "it", "nl", "pl", "cs", "sk", "ro", "hu",
    "fi", "sv", "da", "no", "nb", "nn", "el", "bg", "hr", "sl", "et", "lv", "lt", "ga", "mt"
  ]);

  function normalizeLangCode(code) {
    let s = String(code || "").trim().replace(/\?+$/, "");
    if (!s || s === "und") return { primary: "", full: "" };
    s = s.replace(/_/g, "-").toLowerCase();
    const primary = s.split("-")[0];
    return { primary, full: s };
  }

  /** 语言码 → 国家 id；无对应返回 null（如 zh） */
  function countryIdFromLang(code) {
    const { primary, full } = normalizeLangCode(code);
    if (!primary) return null;
    if (primary === "en") return "us";
    if (primary === "tr") return "tr";
    if (primary === "vi") return "vn";
    if (primary === "pt" || full.startsWith("pt")) return "br";
    if (EU_LANGS.has(primary)) return "eu";
    return null;
  }

  function countryById(id) {
    return COUNTRIES.find((c) => c.id === id) || null;
  }

  function zoneOffsetMin(z, d) {
    const p = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: z, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric"
    }).formatToParts(d).forEach((x) => { p[x.type] = x.value; });
    const asUTC = Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUTC - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  }

  /** 日夜相位：5–6黎明、6–17:30昼、17:30–19黄昏、19–5夜 */
  function phaseOf(H, M) {
    const hf = H + M / 60;
    if (hf >= 6 && hf < 17.5) return "day";
    if (hf >= 5 && hf < 6) return "dawn";
    if (hf >= 17.5 && hf < 19) return "dusk";
    return "night";
  }

  const PHASE_EMOJI = { day: "☀️", dawn: "🌅", dusk: "🌇", night: "🌙" };

  g.WCFX = g.WCFX || {};
  Object.assign(g.WCFX, {
    COUNTRIES, BJ_TZ, DEFAULT_USD_CNY, LS_KEYS, EU_LANGS,
    normalizeLangCode, countryIdFromLang, countryById,
    zoneOffsetMin, phaseOf, PHASE_EMOJI
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
