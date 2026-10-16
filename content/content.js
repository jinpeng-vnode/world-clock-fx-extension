(function () {
  if (window.__WCFX_CONTENT__) return;
  window.__WCFX_CONTENT__ = true;

  let langInfo = { code: "", source: "" };

  function detectLanguage() {
    const htmlLang = (
      document.documentElement.getAttribute("lang") ||
      document.documentElement.lang ||
      ""
    ).trim();
    if (htmlLang) return { code: htmlLang, source: "html[lang]" };

    const metaCL = document.querySelector('meta[http-equiv="content-language" i]');
    if (metaCL && metaCL.content) return { code: metaCL.content.trim(), source: "meta content-language" };

    const og = document.querySelector('meta[property="og:locale" i]');
    if (og && og.content) return { code: og.content.trim().replace("_", "-"), source: "og:locale" };

    const metaLang = document.querySelector('meta[name="language" i], meta[name="lang" i]');
    if (metaLang && metaLang.content) return { code: metaLang.content.trim(), source: "meta language" };

    const main =
      document.querySelector("main, [role='main'], #js-repo-pjax-container, .application-main, #start-of-content") ||
      document.body;
    const sample = ((main && main.innerText) || "").slice(0, 5000);
    const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (sample.match(/[A-Za-z]/g) || []).length;
    const cyr = (sample.match(/[\u0400-\u04FF]/g) || []).length;
    const arab = (sample.match(/[\u0600-\u06FF]/g) || []).length;
    if (cjk > 40 && cjk > latin) return { code: "zh-Hans?", source: "heuristic:CJK" };
    if (cyr > 40 && cyr > latin) return { code: "ru?", source: "heuristic:Cyrillic" };
    if (arab > 40) return { code: "ar?", source: "heuristic:Arabic" };
    if (latin > 80) return { code: "en?", source: "heuristic:Latin" };

    try {
      const host = (location.hostname || "").toLowerCase();
      if (host === "github.com" || host.endsWith(".github.com")) {
        return { code: "en", source: "github-default" };
      }
    } catch (e) {}

    return { code: "und", source: "unknown" };
  }

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg && msg.type === "wcfx-get-lang") {
      langInfo = detectLanguage();
      sendResponse(langInfo);
      return;
    }
  });

  // 仅缓存语言结果，不修改页面 DOM
  langInfo = detectLanguage();
})();
