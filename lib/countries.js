/* shared: regions + lang→tz/currency + Chinese lang names + phase (classic script) */
(function (g) {
  const BJ_TZ = "Asia/Shanghai";
  const DEFAULT_USD_CNY = 7;
  const LS_KEYS = {
    fx: "wcfx_fx_cache",
    usdCny: "wcfx_usd_cny",
    langOverrideByOrigin: "wcfx_lang_override_by_origin"
  };

  /** 常用地区（时区+货币）；下拉与自动映射共用 */
  const REGIONS = [
    { id: "cn", name: "中国", city: "北京", tz: "Asia/Shanghai", cur: "CNY", curName: "人民币" },
    { id: "tw", name: "中国台湾", city: "台北", tz: "Asia/Taipei", cur: "TWD", curName: "新台币" },
    { id: "hk", name: "中国香港", city: "香港", tz: "Asia/Hong_Kong", cur: "HKD", curName: "港币" },
    { id: "us", name: "美国", city: "纽约", tz: "America/New_York", cur: "USD", curName: "美元" },
    { id: "us-la", name: "美国", city: "洛杉矶", tz: "America/Los_Angeles", cur: "USD", curName: "美元" },
    { id: "gb", name: "英国", city: "伦敦", tz: "Europe/London", cur: "GBP", curName: "英镑" },
    { id: "eu-de", name: "德国", city: "法兰克福", tz: "Europe/Berlin", cur: "EUR", curName: "欧元" },
    { id: "eu-fr", name: "法国", city: "巴黎", tz: "Europe/Paris", cur: "EUR", curName: "欧元" },
    { id: "eu-es", name: "西班牙", city: "马德里", tz: "Europe/Madrid", cur: "EUR", curName: "欧元" },
    { id: "eu-it", name: "意大利", city: "罗马", tz: "Europe/Rome", cur: "EUR", curName: "欧元" },
    { id: "eu-nl", name: "荷兰", city: "阿姆斯特丹", tz: "Europe/Amsterdam", cur: "EUR", curName: "欧元" },
    { id: "eu", name: "欧元区", city: "法兰克福", tz: "Europe/Berlin", cur: "EUR", curName: "欧元" },
    { id: "jp", name: "日本", city: "东京", tz: "Asia/Tokyo", cur: "JPY", curName: "日元" },
    { id: "kr", name: "韩国", city: "首尔", tz: "Asia/Seoul", cur: "KRW", curName: "韩元" },
    { id: "in", name: "印度", city: "新德里", tz: "Asia/Kolkata", cur: "INR", curName: "印度卢比" },
    { id: "au", name: "澳大利亚", city: "悉尼", tz: "Australia/Sydney", cur: "AUD", curName: "澳元" },
    { id: "ca", name: "加拿大", city: "多伦多", tz: "America/Toronto", cur: "CAD", curName: "加元" },
    { id: "br", name: "巴西", city: "圣保罗", tz: "America/Sao_Paulo", cur: "BRL", curName: "巴西雷亚尔" },
    { id: "mx", name: "墨西哥", city: "墨西哥城", tz: "America/Mexico_City", cur: "MXN", curName: "墨西哥比索" },
    { id: "ar", name: "阿根廷", city: "布宜诺斯艾利斯", tz: "America/Argentina/Buenos_Aires", cur: "ARS", curName: "阿根廷比索" },
    { id: "ru", name: "俄罗斯", city: "莫斯科", tz: "Europe/Moscow", cur: "RUB", curName: "俄罗斯卢布" },
    { id: "tr", name: "土耳其", city: "伊斯坦布尔", tz: "Europe/Istanbul", cur: "TRY", curName: "土耳其里拉" },
    { id: "vn", name: "越南", city: "胡志明市", tz: "Asia/Ho_Chi_Minh", cur: "VND", curName: "越南盾" },
    { id: "th", name: "泰国", city: "曼谷", tz: "Asia/Bangkok", cur: "THB", curName: "泰铢" },
    { id: "id", name: "印度尼西亚", city: "雅加达", tz: "Asia/Jakarta", cur: "IDR", curName: "印尼盾" },
    { id: "my", name: "马来西亚", city: "吉隆坡", tz: "Asia/Kuala_Lumpur", cur: "MYR", curName: "马来西亚林吉特" },
    { id: "sg", name: "新加坡", city: "新加坡", tz: "Asia/Singapore", cur: "SGD", curName: "新加坡元" },
    { id: "ph", name: "菲律宾", city: "马尼拉", tz: "Asia/Manila", cur: "PHP", curName: "菲律宾比索" },
    { id: "sa", name: "沙特阿拉伯", city: "利雅得", tz: "Asia/Riyadh", cur: "SAR", curName: "沙特里亚尔" },
    { id: "ae", name: "阿联酋", city: "迪拜", tz: "Asia/Dubai", cur: "AED", curName: "阿联酋迪拉姆" },
    { id: "eg", name: "埃及", city: "开罗", tz: "Africa/Cairo", cur: "EGP", curName: "埃及镑" },
    { id: "il", name: "以色列", city: "耶路撒冷", tz: "Asia/Jerusalem", cur: "ILS", curName: "以色列新谢克尔" },
    { id: "ir", name: "伊朗", city: "德黑兰", tz: "Asia/Tehran", cur: "IRR", curName: "伊朗里亚尔" },
    { id: "pk", name: "巴基斯坦", city: "卡拉奇", tz: "Asia/Karachi", cur: "PKR", curName: "巴基斯坦卢比" },
    { id: "bd", name: "孟加拉国", city: "达卡", tz: "Asia/Dhaka", cur: "BDT", curName: "孟加拉塔卡" },
    { id: "pl", name: "波兰", city: "华沙", tz: "Europe/Warsaw", cur: "PLN", curName: "波兰兹罗提" },
    { id: "cz", name: "捷克", city: "布拉格", tz: "Europe/Prague", cur: "CZK", curName: "捷克克朗" },
    { id: "se", name: "瑞典", city: "斯德哥尔摩", tz: "Europe/Stockholm", cur: "SEK", curName: "瑞典克朗" },
    { id: "no", name: "挪威", city: "奥斯陆", tz: "Europe/Oslo", cur: "NOK", curName: "挪威克朗" },
    { id: "dk", name: "丹麦", city: "哥本哈根", tz: "Europe/Copenhagen", cur: "DKK", curName: "丹麦克朗" },
    { id: "fi", name: "芬兰", city: "赫尔辛基", tz: "Europe/Helsinki", cur: "EUR", curName: "欧元" },
    { id: "gr", name: "希腊", city: "雅典", tz: "Europe/Athens", cur: "EUR", curName: "欧元" },
    { id: "pt", name: "葡萄牙", city: "里斯本", tz: "Europe/Lisbon", cur: "EUR", curName: "欧元" },
    { id: "ro", name: "罗马尼亚", city: "布加勒斯特", tz: "Europe/Bucharest", cur: "RON", curName: "罗马尼亚列伊" },
    { id: "hu", name: "匈牙利", city: "布达佩斯", tz: "Europe/Budapest", cur: "HUF", curName: "匈牙利福林" },
    { id: "ua", name: "乌克兰", city: "基辅", tz: "Europe/Kyiv", cur: "UAH", curName: "乌克兰格里夫纳" },
    { id: "ch", name: "瑞士", city: "苏黎世", tz: "Europe/Zurich", cur: "CHF", curName: "瑞士法郎" },
    { id: "za", name: "南非", city: "约翰内斯堡", tz: "Africa/Johannesburg", cur: "ZAR", curName: "南非兰特" },
    { id: "ng", name: "尼日利亚", city: "拉各斯", tz: "Africa/Lagos", cur: "NGN", curName: "尼日利亚奈拉" },
    { id: "ke", name: "肯尼亚", city: "内罗毕", tz: "Africa/Nairobi", cur: "KES", curName: "肯尼亚先令" },
    { id: "nz", name: "新西兰", city: "奥克兰", tz: "Pacific/Auckland", cur: "NZD", curName: "新西兰元" },
    { id: "utc", name: "世界时", city: "UTC", tz: "UTC", cur: "USD", curName: "美元" }
  ];

  /** 兼容旧 id */
  const REGION_ALIASES = { eu: "eu-de" };

  /** 精确 BCP47（小写）→ region id；先于主语言匹配 */
  const LANG_EXACT = {
    "zh-cn": "cn", "zh-hans": "cn", "zh-sg": "cn", "zh-my": "cn",
    "zh-tw": "cn", "zh-hant": "cn", "zh-hk": "cn", "zh-mo": "cn",
    "en-gb": "gb", "en-ie": "gb", "en-au": "au", "en-nz": "nz",
    "en-ca": "ca", "en-in": "in", "en-sg": "sg", "en-za": "za",
    "en-us": "us",
    "pt-br": "br", "pt-pt": "pt",
    "es-mx": "mx", "es-ar": "ar", "es-es": "eu-es", "es-us": "us-la",
    "fr-ca": "ca", "fr-fr": "eu-fr", "fr-be": "eu-fr", "fr-ch": "ch",
    "de-de": "eu-de", "de-at": "eu-de", "de-ch": "ch",
    "ar-eg": "eg", "ar-sa": "sa", "ar-ae": "ae",
    "nl-nl": "eu-nl", "nl-be": "eu-nl"
  };

  /** 主语言 → region id（覆盖主要世界语种） */
  const LANG_PRIMARY = {
    zh: "cn", yue: "hk", wuu: "cn",
    en: "us",
    ja: "jp", ko: "kr",
    de: "eu-de", fr: "eu-fr", es: "eu-es", it: "eu-it",
    nl: "eu-nl", pt: "br",
    tr: "tr", vi: "vn", th: "th", id: "id", ms: "my",
    hi: "in", bn: "bd", ta: "in", te: "in", mr: "in", gu: "in", kn: "in", ml: "in", pa: "in",
    ru: "ru", uk: "ua", be: "ru",
    pl: "pl", cs: "cz", sk: "eu", sl: "eu", hr: "eu", sr: "eu", bs: "eu", mk: "eu",
    sv: "se", da: "dk", no: "no", nb: "no", nn: "no", fi: "fi",
    el: "gr", ro: "ro", hu: "hu", bg: "eu", et: "eu", lv: "eu", lt: "eu",
    ga: "gb", cy: "gb", mt: "eu", is: "utc",
    ar: "sa", he: "il", fa: "ir", ur: "pk",
    sw: "ke", af: "za", zu: "za", xh: "za", yo: "ng", ig: "ng", ha: "ng", am: "utc",
    tl: "ph", fil: "ph",
    my: "th", km: "th", lo: "th",
    ka: "utc", az: "utc", kk: "utc", uz: "utc", mn: "cn",
    ne: "in", si: "in",
    ca: "eu-es", eu: "eu-es", gl: "eu-es",
    sq: "eu",
    und: "utc"
  };

  /** Intl 失败时常用语言中文名 */
  const LANG_ZH_FALLBACK = {
    en: "英语", "en-us": "美式英语", "en-gb": "英式英语",
    zh: "中文", "zh-cn": "简体中文", "zh-hans": "简体中文",
    "zh-tw": "繁体中文", "zh-hant": "繁体中文", "zh-hk": "繁体中文（香港）",
    ja: "日语", ko: "韩语", de: "德语", fr: "法语", es: "西班牙语",
    it: "意大利语", pt: "葡萄牙语", "pt-br": "巴西葡萄牙语", "pt-pt": "欧洲葡萄牙语",
    ru: "俄语", ar: "阿拉伯语", tr: "土耳其语", vi: "越南语", th: "泰语",
    id: "印尼语", ms: "马来语", hi: "印地语", bn: "孟加拉语",
    nl: "荷兰语", pl: "波兰语", cs: "捷克语", sv: "瑞典语", da: "丹麦语",
    no: "挪威语", nb: "书面挪威语", fi: "芬兰语", el: "希腊语",
    he: "希伯来语", uk: "乌克兰语", ro: "罗马尼亚语", hu: "匈牙利语",
    fa: "波斯语", ur: "乌尔都语", sw: "斯瓦希里语", af: "南非荷兰语",
    tl: "他加禄语", fil: "菲律宾语", my: "缅甸语", km: "高棉语",
    und: "未知语言"
  };

  let _displayNames = null;
  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      _displayNames = new Intl.DisplayNames(["zh-CN"], { type: "language" });
    }
  } catch (e) {
    _displayNames = null;
  }

  function normalizeLangCode(code) {
    let s = String(code || "").trim().replace(/\?+$/, "");
    if (!s || s === "und") return { primary: "", full: "", raw: s };
    s = s.replace(/_/g, "-").toLowerCase();
    const primary = s.split("-")[0];
    return { primary, full: s, raw: s };
  }

  /** BCP47 → 中文语言名（优先 Intl.DisplayNames） */
  function langDisplayName(code) {
    const { primary, full } = normalizeLangCode(code);
    if (!primary && !full) return "未能检测";
    if (LANG_ZH_FALLBACK[full]) return LANG_ZH_FALLBACK[full];
    if (LANG_ZH_FALLBACK[primary]) {
      // 有地区子标签时尽量用 Intl 拼完整名
      if (full !== primary && _displayNames) {
        try {
          const n = _displayNames.of(full);
          if (n && n !== full) return n;
        } catch (e) {}
      }
      return LANG_ZH_FALLBACK[primary];
    }
    if (_displayNames) {
      try {
        const n = _displayNames.of(full || primary);
        if (n && n.toLowerCase() !== (full || primary)) return n;
      } catch (e) {}
      try {
        const n = _displayNames.of(primary);
        if (n && n.toLowerCase() !== primary) return n;
      } catch (e) {}
    }
    return full || primary || "未知语言";
  }

  function regionById(id) {
    if (!id) return null;
    const mapped = REGION_ALIASES[id] || id;
    return REGIONS.find((r) => r.id === mapped) || null;
  }

  /** 兼容旧 API */
  function countryById(id) {
    return regionById(id);
  }

  /**
   * 语言 → region id；中文族一律北京；未知 → utc（绝不返回 null）
   */
  function regionIdFromLang(code) {
    const { primary, full } = normalizeLangCode(code);
    if (!primary) return "utc";
    // 中文硬规则：简繁体一律北京时钟（用户可再选手动台北/香港）
    if (primary === "zh" || primary === "yue" || primary === "wuu") {
      return "cn";
    }
    if (LANG_EXACT[full]) return LANG_EXACT[full];
    // 尝试 lang-region 两段
    const parts = full.split("-");
    if (parts.length >= 2) {
      const two = parts[0] + "-" + parts[1];
      if (LANG_EXACT[two]) return LANG_EXACT[two];
    }
    if (LANG_PRIMARY[primary]) return LANG_PRIMARY[primary];
    return "utc";
  }

  /** 兼容旧名：永不返回 null */
  function countryIdFromLang(code) {
    return regionIdFromLang(code);
  }

  function regionFromLang(code) {
    return regionById(regionIdFromLang(code));
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

  function phaseOf(H, M) {
    const hf = H + M / 60;
    if (hf >= 6 && hf < 17.5) return "day";
    if (hf >= 5 && hf < 6) return "dawn";
    if (hf >= 17.5 && hf < 19) return "dusk";
    return "night";
  }

  const PHASE_EMOJI = { day: "☀️", dawn: "🌅", dusk: "🌇", night: "🌙" };

  /** 下拉用：常用优先排序 */
  const REGION_SELECT_ORDER = [
    "cn", "us", "eu-de", "jp", "kr", "gb", "eu-fr", "eu-es", "eu-it",
    "br", "ru", "tr", "vn", "th", "id", "in", "au", "ca", "mx",
    "hk", "tw", "sg", "my", "ph", "sa", "ae", "il", "pl", "se",
    "no", "dk", "ch", "za", "nz", "ua", "pt", "eu-nl", "ar", "eg",
    "utc"
  ];

  function listRegionsForSelect() {
    const seen = new Set();
    const out = [];
    for (const id of REGION_SELECT_ORDER) {
      const r = regionById(id);
      if (r && !seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
    }
    for (const r of REGIONS) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
    }
    return out;
  }

  // 兼容旧导出名
  const COUNTRIES = REGIONS;
  const EU_LANGS = new Set([
    "de", "fr", "es", "it", "nl", "pl", "cs", "sk", "ro", "hu",
    "fi", "sv", "da", "no", "nb", "nn", "el", "bg", "hr", "sl", "et", "lv", "lt", "ga", "mt"
  ]);

  g.WCFX = g.WCFX || {};
  Object.assign(g.WCFX, {
    REGIONS, COUNTRIES, BJ_TZ, DEFAULT_USD_CNY, LS_KEYS, EU_LANGS,
    LANG_EXACT, LANG_PRIMARY, LANG_ZH_FALLBACK,
    normalizeLangCode, langDisplayName,
    regionById, countryById, regionIdFromLang, countryIdFromLang, regionFromLang,
    listRegionsForSelect, REGION_SELECT_ORDER,
    zoneOffsetMin, phaseOf, PHASE_EMOJI
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
