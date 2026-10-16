(function () {
  if (window.top !== window) return;
  // 已有存活实例则跳过；扩展重载后旧实例失效(orphan)，允许新实例接管
  try { if (window.__WCFX_ALIVE__ && window.__WCFX_ALIVE__()) return; } catch (e) {}
  const alive = () => { try { return !!chrome.runtime.id; } catch (e) { return false; } };
  window.__WCFX_ALIVE__ = alive;
  document.querySelectorAll("wcfx-float").forEach((n) => n.remove());

  const W = globalThis.WCFX;
  const K = W.LS_KEYS;
  const FK = { enabled: "wcfx_float_enabled", pos: "wcfx_float_pos", min: "wcfx_float_min" };

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
    }
  });

  langInfo = detectLanguage();

  /* ================= 浮窗 ================= */
  function langOk(code) {
    if (!code) return false;
    const n = W.normalizeLangCode(code);
    return !!n.primary && n.primary !== "und";
  }
  function strongSrc(s) {
    s = String(s || "");
    return !!s && !s.startsWith("heuristic") && s !== "unknown" && s !== "github-default";
  }

  let chromeLang = "";
  let fx = null;
  let usdCny = W.DEFAULT_USD_CNY;
  let overrideMap = {};
  let enabled = true;
  let minimized = false;
  let pos = null;
  let country = null;
  let host = null, root = null, panel = null, timer = null;

  function pickLang() {
    const c = langInfo.code, s = langInfo.source;
    if (langOk(c) && strongSrc(s)) {
      if (langOk(chromeLang) && String(chromeLang).length > String(c).length) return chromeLang;
      return c;
    }
    if (langOk(chromeLang)) return chromeLang;
    if (langOk(c)) return c;
    return "";
  }

  function resolveCountry() {
    const ov = overrideMap[location.origin];
    if (ov && ov !== "auto") {
      const c = W.regionById(ov) || W.countryById(ov);
      if (c) return c;
    }
    return W.regionById(W.regionIdFromLang(pickLang())) || W.regionById("utc");
  }

  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap { position: fixed; z-index: 2147483647; width: 236px;
  font: 12px/1.35 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  border-radius: 12px; border: 1px solid #dfe7f1; box-shadow: 0 6px 22px rgba(0,0,0,.22);
  color: #1a1c1f; text-align: center; overflow: hidden; user-select: none;
  transition: background .6s, color .6s, border-color .6s; }
.wrap.ph-day { background: linear-gradient(160deg, #fffdf4, #eaf4ff); }
.wrap.ph-dawn { background: linear-gradient(160deg, #ffe6cc, #ffd1dc); color: #3a2a20; border-color: #f3cdb8; }
.wrap.ph-dusk { background: linear-gradient(160deg, #ffb88a, #8a6bb8); color: #2a1630; border-color: #d9a08a; }
.wrap.ph-night { background: linear-gradient(160deg, #141a33, #0b0f1f); color: #e6e9f5; border-color: #2a3152; }
.bar { display: flex; align-items: center; gap: 4px; padding: 4px 6px 3px 9px; cursor: move;
  background: rgba(0,0,0,.05); touch-action: none; }
.wrap.ph-night .bar { background: rgba(255,255,255,.07); }
.bar .pin { font-size: 11px; }
.bar .ttl { flex: 1; text-align: left; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar .mt { font-variant-numeric: tabular-nums; font-weight: 650; display: none; }
.wrap.min .bar .mt { display: inline; }
.bar button { all: unset; cursor: pointer; width: 18px; height: 18px; line-height: 18px; text-align: center;
  border-radius: 5px; font-size: 13px; opacity: .7; }
.bar button:hover { opacity: 1; background: rgba(0,0,0,.1); }
.body { padding: 4px 9px 8px; }
.wrap.min .body { display: none; }
.cty-head { display: flex; align-items: center; gap: 5px; justify-content: center; font-weight: 650; }
.face { width: 76px; height: 76px; margin: 2px 0 0; }
.face .dial { fill: #fff; stroke: #d6dde8; stroke-width: 2; }
.face .tick { stroke: #8a94a6; stroke-width: 2; stroke-linecap: round; }
.face .hh { stroke: #1f2533; stroke-width: 4.5; stroke-linecap: round; }
.face .mh { stroke: #1f2533; stroke-width: 3; stroke-linecap: round; }
.face .sh { stroke: #e2553b; stroke-width: 1.4; stroke-linecap: round; }
.face .pin { fill: #e2553b; }
.face .apt { font-size: 9px; font-weight: 700; fill: #4f6ef0; }
.wrap.ph-dawn .face .dial { fill: #fff6ec; }
.wrap.ph-dusk .face .dial { fill: #f6e3ef; stroke: #c99ab0; }
.wrap.ph-night .face .dial { fill: #0e1428; stroke: #3a4470; }
.wrap.ph-night .face .tick { stroke: #6f7cb0; }
.wrap.ph-night .face .hh, .wrap.ph-night .face .mh { stroke: #e8ecff; }
.wrap.ph-night .face .sh, .wrap.ph-night .face .pin { stroke: #ffb35c; fill: #ffb35c; }
.wrap.ph-night .face .apt { fill: #ffb35c; }
.ampm { display: none; }
.tm { font-size: 18px; font-weight: 650; font-variant-numeric: tabular-nums; }
.dt { font-size: 10.5px; opacity: .8; }
.off { margin-top: 2px; font-size: 10px; border-radius: 20px; padding: 0 7px; display: inline-block;
  background: rgba(255,255,255,.55); color: #2f4f9a; }
.wrap.ph-night .off { background: rgba(255,255,255,.1); color: #c8d2ff; }
.conv { margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,.14); text-align: left; user-select: text; }
.wrap.ph-night .conv { border-top-color: rgba(255,255,255,.18); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 4px; }
.amt { all: unset; width: 74px; font-size: 13px; text-align: right; padding: 2px 5px; border-radius: 6px;
  border: 1px solid rgba(0,0,0,.16); background: rgba(255,255,255,.8); font-variant-numeric: tabular-nums; cursor: text; }
.wrap.ph-night .amt { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.22); }
.code { font-weight: 700; opacity: .8; font-size: 11px; }
.arr { opacity: .55; }
.out { font-weight: 700; font-variant-numeric: tabular-nums; }
.unit { opacity: .7; font-size: 10.5px; }
.rates { margin-top: 3px; font-size: 10px; opacity: .75; }
`;

  function build() {
    host = document.createElement("wcfx-float");
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap ph-day" part="wrap">
        <div class="bar"><span class="pin" title="已钉住：所有网页自动常驻显示">📌</span><span class="ttl"></span><span class="mt"></span>
          <button class="bmin" title="收起/展开">–</button><button class="bclose" title="关闭常驻浮窗（所有网页隐藏；在扩展弹窗勾选「在所有网页常驻显示浮窗」重新打开）">×</button></div>
        <div class="body">
          <div class="clk"></div>
          <div class="conv">
            <div class="row"><input class="amt" type="text" inputmode="decimal" value="100" />
              <span class="code"></span><span class="arr">→</span><span class="out usd">—</span><span class="unit">USD</span>
              <span class="arr">→</span><span class="out cny">—</span><span class="unit">CNY</span></div>
            <div class="rates"></div>
          </div>
        </div>
      </div>`;
    panel = root.querySelector(".wrap");
    const stop = (e) => e.stopPropagation();
    ["keydown", "keyup", "keypress", "input", "wheel"].forEach((t) => panel.addEventListener(t, stop));
    const amt = root.querySelector(".amt");
    amt.addEventListener("input", () => { W.formatAmtInput(amt); calc(); });
    root.querySelector(".bmin").addEventListener("click", () => {
      chrome.storage.local.set({ [FK.min]: !minimized });
    });
    root.querySelector(".bclose").addEventListener("click", () => {
      chrome.storage.local.set({ [FK.enabled]: false });
    });
    setupDrag(root.querySelector(".bar"));
    document.documentElement.appendChild(host);
    // 页面/SPA 重写 DOM 时把浮窗挂回去
    new MutationObserver(() => {
      if (alive() && window.__WCFX_ALIVE__ === alive && enabled && host && !host.isConnected) document.documentElement.appendChild(host);
    }).observe(document.documentElement, { childList: true });
    window.addEventListener("resize", () => applyPos(false));
  }

  function clamp(p) {
    const w = panel.offsetWidth || 236, h = panel.offsetHeight || 40;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.max(0, Math.min(p.x, vw - w)),
      y: Math.max(0, Math.min(p.y, vh - Math.min(h, 32)))
    };
  }
  function applyPos() {
    if (!panel) return;
    const def = { x: (document.documentElement.clientWidth || window.innerWidth) - 252, y: 16 };
    const p = clamp(pos || def);
    panel.style.left = p.x + "px";
    panel.style.top = p.y + "px";
  }

  function setupDrag(bar) {
    let sx, sy, ox, oy, drag = false;
    bar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      drag = true; sx = e.clientX; sy = e.clientY;
      ox = panel.offsetLeft; oy = panel.offsetTop;
      bar.setPointerCapture(e.pointerId); e.preventDefault();
    });
    bar.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = clamp({ x: ox + e.clientX - sx, y: oy + e.clientY - sy });
      panel.style.left = p.x + "px"; panel.style.top = p.y + "px";
    });
    const end = (e) => {
      if (!drag) return;
      drag = false;
      try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
      pos = { x: panel.offsetLeft, y: panel.offsetTop };
      chrome.storage.local.set({ [FK.pos]: pos });
    };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
  }

  function renderCountry() {
    country = resolveCountry();
    panel.dataset.z = country.tz;
    root.querySelector(".clk").innerHTML = W.renderCardHtml(country);
    root.querySelector(".ttl").textContent = `${country.city} · ${country.cur}`;
    root.querySelector(".code").textContent = country.cur;
    panel.classList.remove("ph-day", "ph-dawn", "ph-dusk", "ph-night");
    tick(); calc();
  }

  let lastUrl = location.href;
  function tick() {
    if (!panel || !country) return;
    if (!alive() || window.__WCFX_ALIVE__ !== alive) { clearInterval(timer); host.remove(); return; }
    if (location.href !== lastUrl) {
      // SPA 页面内跳转：重新检测语言（位置/收起状态不变）
      lastUrl = location.href;
      langInfo = detectLanguage();
      const prev = country && country.id;
      if (resolveCountry().id !== prev) { renderCountry(); return; }
    }
    if (enabled && !host.isConnected) document.documentElement.appendChild(host);
    const now = new Date();
    W.tickCard(panel, now, W.zoneOffsetMin(W.BJ_TZ, now));
    const tm = root.querySelector(".clk .tm");
    root.querySelector(".mt").textContent = tm ? tm.textContent.slice(0, 5) : "";
  }

  function calc() {
    if (!panel || !country) return;
    const cur = country.cur;
    const a = W.parseAmt(root.querySelector(".amt").value);
    const usd = W.toUsd(fx, a, cur), cny = W.pageAmountToCny(fx, a, cur, usdCny);
    root.querySelector(".usd").textContent = isFinite(usd) ? W.fmtNum(usd, 4) : "—";
    root.querySelector(".cny").textContent = isFinite(cny) ? W.fmtNum(cny, 2) : "—";
    const per = W.usdPer(fx, cur);
    root.querySelector(".rates").textContent =
      `1 ${cur} ≈ ${isFinite(per) ? W.fmtNum(per) : "—"} USD · 1 USD = ${W.fmtNum(usdCny, 4)} CNY`;
  }

  function updateTimer() {
    clearInterval(timer); timer = null;
    if (enabled && !document.hidden) timer = setInterval(tick, 1000);
  }

  function applyState() {
    if (!enabled) {
      if (host) host.style.display = "none";
      updateTimer();
      return;
    }
    if (!host) { build(); renderCountry(); }
    if (!host.isConnected) document.documentElement.appendChild(host);
    host.style.display = "";
    panel.classList.toggle("min", minimized);
    applyPos();
    tick();
    updateTimer();
  }

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch[FK.enabled]) enabled = ch[FK.enabled].newValue !== false;
    if (ch[FK.min]) minimized = !!ch[FK.min].newValue;
    if (ch[FK.pos]) pos = ch[FK.pos].newValue || null;
    if (ch[K.fx]) fx = ch[K.fx].newValue || fx;
    if (ch[K.usdCny]) usdCny = W.normalizeUsdCny(ch[K.usdCny].newValue);
    if (ch[K.langOverrideByOrigin]) {
      overrideMap = ch[K.langOverrideByOrigin].newValue || {};
      if (panel) renderCountry();
    }
    applyState();
    calc();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && enabled) tick();
    updateTimer();
  });

  async function init() {
    const o = await chrome.storage.local.get([FK.enabled, FK.pos, FK.min, K.fx, K.usdCny, K.langOverrideByOrigin]);
    enabled = o[FK.enabled] !== false;
    minimized = !!o[FK.min];
    pos = o[FK.pos] || null;
    fx = o[K.fx] || null;
    usdCny = W.normalizeUsdCny(o[K.usdCny] == null ? W.DEFAULT_USD_CNY : o[K.usdCny]);
    overrideMap = o[K.langOverrideByOrigin] || {};
    try {
      const r = await chrome.runtime.sendMessage({ type: "wcfx-detect-lang" });
      if (r && r.code) chromeLang = r.code;
    } catch (e) {}
    langInfo = detectLanguage();
    applyState();
    try {
      const r = await chrome.runtime.sendMessage({ type: "wcfx-get-fx" });
      if (r && r.fx) { fx = r.fx; calc(); }
    } catch (e) {}
  }
  init();
})();