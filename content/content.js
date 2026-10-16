(function () {
  if (window.__WCFX_CONTENT__) return;
  window.__WCFX_CONTENT__ = true;

  const W = globalThis.WCFX;
  const AMT_RE = /(?:(?:US\s*)?\$|€|₺|₫|R\$|£|¥|￥)\s*-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:USD|EUR|TRY|VND|BRL|GBP|JPY|美元|欧元|里拉|越南盾|雷亚尔)/gi;

  let fxState = { fx: null, offline: false };
  let pageFxOn = true;
  let badgeEl = null;
  let langInfo = { code: "", source: "" };
  let scanning = false;
  let suppressMo = false;

  function detectLanguage() {
    const htmlLang = (document.documentElement.lang || "").trim();
    if (htmlLang) return { code: htmlLang, source: "html[lang]" };

    const metaCL = document.querySelector('meta[http-equiv="content-language" i]');
    if (metaCL && metaCL.content) return { code: metaCL.content.trim(), source: "meta content-language" };

    const og = document.querySelector('meta[property="og:locale" i]');
    if (og && og.content) return { code: og.content.trim().replace("_", "-"), source: "og:locale" };

    const metaLang = document.querySelector('meta[name="language" i], meta[name="lang" i]');
    if (metaLang && metaLang.content) return { code: metaLang.content.trim(), source: "meta language" };

    const sample = ((document.body && document.body.innerText) || "").slice(0, 4000);
    const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (sample.match(/[A-Za-z]/g) || []).length;
    const cyr = (sample.match(/[\u0400-\u04FF]/g) || []).length;
    const arab = (sample.match(/[\u0600-\u06FF]/g) || []).length;
    if (cjk > 40 && cjk > latin) return { code: "zh-Hans?", source: "heuristic:CJK" };
    if (cyr > 40 && cyr > latin) return { code: "ru?", source: "heuristic:Cyrillic" };
    if (arab > 40) return { code: "ar?", source: "heuristic:Arabic" };
    if (latin > 80) return { code: "en?", source: "heuristic:Latin" };
    return { code: "und", source: "unknown" };
  }

  function ensureBadge() {
    if (badgeEl && badgeEl.isConnected) return badgeEl;
    badgeEl = document.createElement("div");
    badgeEl.className = "wcfx-lang-badge";
    badgeEl.setAttribute("data-wcfx", "lang");
    document.documentElement.appendChild(badgeEl);
    return badgeEl;
  }

  function updateBadge() {
    langInfo = detectLanguage();
    const el = ensureBadge();
    el.textContent = "语言 " + langInfo.code;
    el.title = "来源: " + langInfo.source;
    el.hidden = false;
  }

  function guessCur(text) {
    if (/(?:US\s*)?\$|USD|美元/i.test(text)) return "USD";
    if (/€|EUR|欧元/i.test(text)) return "EUR";
    if (/₺|TRY|\bTL\b|里拉/i.test(text)) return "TRY";
    if (/₫|VND|越南盾/i.test(text)) return "VND";
    if (/R\$|BRL|雷亚尔/i.test(text)) return "BRL";
    if (/£|GBP/i.test(text)) return "GBP";
    if (/JPY|日元/i.test(text)) return "JPY";
    if (/¥|￥|CNY|RMB|人民币/i.test(text)) return "CNY";
    return null;
  }

  function parseMoneyToken(tok) {
    const cur = guessCur(tok);
    let numPart = tok.replace(/(?:US\s*)?\$|€|₺|₫|R\$|£|¥|￥|USD|EUR|TRY|VND|BRL|CNY|RMB|GBP|JPY|美元|欧元|里拉|越南盾|雷亚尔|人民币/gi, "");
    numPart = numPart.trim();
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(numPart)) {
      numPart = numPart.replace(/\./g, "").replace(",", ".");
    } else {
      numPart = numPart.replace(/,/g, "");
    }
    const amount = parseFloat(numPart);
    return { cur, amount: isNaN(amount) ? NaN : amount };
  }

  function clearNotes() {
    suppressMo = true;
    document.querySelectorAll(".wcfx-amt-note").forEach((n) => n.remove());
    suppressMo = false;
  }

  function annotateVisibleAmounts() {
    if (scanning) return;
    if (!pageFxOn || !fxState.fx) {
      clearNotes();
      return;
    }
    scanning = true;
    suppressMo = true;
    try {
      clearNotes();
      if (!document.body) return;

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !/\d/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA" || tag === "INPUT" || tag === "CODE" || tag === "PRE") {
            return NodeFilter.FILTER_REJECT;
          }
          if (p.closest(".wcfx-amt-note, .wcfx-lang-badge, [contenteditable='true']")) {
            return NodeFilter.FILTER_REJECT;
          }
          AMT_RE.lastIndex = 0;
          if (!AMT_RE.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          AMT_RE.lastIndex = 0;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const targets = [];
      let n;
      while ((n = walker.nextNode())) {
        targets.push(n);
        if (targets.length > 60) break;
      }

      for (const textNode of targets) {
        if (!textNode.isConnected) continue;
        const text = textNode.nodeValue;
        AMT_RE.lastIndex = 0;
        let m;
        const parts = [];
        let last = 0;
        let matched = false;
        while ((m = AMT_RE.exec(text))) {
          matched = true;
          const tok = m[0];
          parts.push(document.createTextNode(text.slice(last, m.index)));
          parts.push(document.createTextNode(tok));
          const { cur, amount } = parseMoneyToken(tok);
          if (cur && isFinite(amount) && cur !== "CNY") {
            let cny;
            let usd;
            if (cur === "USD") {
              usd = amount;
              cny = amount * W.FIXED_USD_CNY;
            } else {
              usd = W.toUsd(fxState.fx, amount, cur);
              cny = W.pageAmountToFixedCny(fxState.fx, amount, cur);
            }
            if (isFinite(cny)) {
              const note = document.createElement("span");
              note.className = "wcfx-amt-note";
              note.textContent = "≈¥" + W.fmtNum(cny, 2);
              note.title =
                tok +
                " → " +
                (isFinite(usd) ? W.fmtNum(usd, 4) + " USD" : "?") +
                " → ×7 = " +
                W.fmtNum(cny, 2) +
                " CNY（固定）";
              parts.push(note);
            }
          }
          last = m.index + tok.length;
        }
        if (!matched) continue;
        parts.push(document.createTextNode(text.slice(last)));
        const parent = textNode.parentNode;
        if (!parent) continue;
        const frag = document.createDocumentFragment();
        parts.forEach((p) => frag.appendChild(p));
        parent.replaceChild(frag, textNode);
      }
    } finally {
      suppressMo = false;
      scanning = false;
    }
  }

  async function loadSettingsAndFx() {
    try {
      const o = await chrome.storage.local.get([W.LS_KEYS.pageFx, W.LS_KEYS.fx]);
      pageFxOn = o[W.LS_KEYS.pageFx] !== false;
      if (o[W.LS_KEYS.fx]) fxState = { fx: o[W.LS_KEYS.fx], offline: false };
    } catch (e) {}
    try {
      const r = await chrome.runtime.sendMessage({ type: "wcfx-get-fx" });
      if (r && r.fx) fxState = r;
    } catch (e) {}
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[W.LS_KEYS.pageFx]) {
      pageFxOn = changes[W.LS_KEYS.pageFx].newValue !== false;
      if (pageFxOn) annotateVisibleAmounts();
      else clearNotes();
    }
    if (changes[W.LS_KEYS.fx]) {
      fxState.fx = changes[W.LS_KEYS.fx].newValue;
      if (pageFxOn) annotateVisibleAmounts();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg && msg.type === "wcfx-get-lang") {
      sendResponse(langInfo && langInfo.code ? langInfo : detectLanguage());
      return;
    }
    if (msg && msg.type === "wcfx-rescan") {
      annotateVisibleAmounts();
      sendResponse({ ok: true });
    }
  });

  (async function init() {
    updateBadge();
    await loadSettingsAndFx();
    annotateVisibleAmounts();
    let t = null;
    const mo = new MutationObserver(() => {
      if (!pageFxOn || suppressMo || scanning) return;
      clearTimeout(t);
      t = setTimeout(annotateVisibleAmounts, 900);
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  })();
})();
