(function () {
  const W = globalThis.WCFX;
  let fx = null;
  let offline = false;
  let enabled = new Set(W.COUNTRIES.map((c) => c.id));
  let tickTimer = null;

  const $ = (id) => document.getElementById(id);

  async function loadEnabled() {
    const o = await chrome.storage.local.get(W.LS_KEYS.enabled);
    if (Array.isArray(o[W.LS_KEYS.enabled])) enabled = new Set(o[W.LS_KEYS.enabled]);
  }

  async function saveEnabled() {
    await chrome.storage.local.set({ [W.LS_KEYS.enabled]: [...enabled] });
  }

  function renderToggles() {
    const box = $("countryToggles");
    box.innerHTML = W.COUNTRIES.map((c) =>
      `<label><input type="checkbox" data-id="${W.esc(c.id)}" ${enabled.has(c.id) ? "checked" : ""}/> ${W.esc(c.city)}</label>`
    ).join("");
    box.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("change", async () => {
        if (inp.checked) enabled.add(inp.dataset.id);
        else enabled.delete(inp.dataset.id);
        // 至少保留一个
        if (enabled.size === 0) {
          enabled.add(inp.dataset.id);
          inp.checked = true;
        }
        await saveEnabled();
        renderCards();
      });
    });
  }

  function renderCards() {
    const list = W.COUNTRIES.filter((c) => enabled.has(c.id));
    $("clkGrid").innerHTML = list.map((c) => W.renderCardHtml(c)).join("");
    $("clkGrid").querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", () => {
        W.formatAmtInput(inp);
        calcFx();
      });
      W.formatAmtInput(inp);
    });
    tickAll();
    calcFx();
  }

  function tickAll() {
    const now = new Date();
    const bj = W.zoneOffsetMin(W.BJ_TZ, now);
    document.querySelectorAll("#clkGrid .clk").forEach((el) => W.tickCard(el, now, bj));
  }

  function calcFx() {
    document.querySelectorAll("#clkGrid .fx-row").forEach((row) => {
      const c = row.dataset.cur;
      const v = W.parseAmt(row.querySelector("input").value) * W.cnyPer(fx, c);
      row.querySelector(".fx-res").textContent = isFinite(v) ? `${W.fmtNum(v, 2)} 人民币` : "—";
      row.querySelector(".rate").textContent =
        fx && fx.rates && fx.rates[c]
          ? `1 ${c} ≈ ${W.fmtNum(W.cnyPer(fx, c))} 人民币 · 1 人民币 ≈ ${W.fmtNum(fx.rates[c])} ${c}`
          : "暂无汇率";
    });
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
    calcFx();
  }

  async function doRefresh(manual) {
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

  async function loadLang() {
    const box = $("langBox");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || tab.id == null) {
        box.textContent = "语言 —";
        return;
      }
      const info = await chrome.tabs.sendMessage(tab.id, { type: "wcfx-get-lang" });
      if (info && info.code) {
        box.textContent = `语言 ${info.code}`;
        box.title = `来源: ${info.source || ""}`;
      } else {
        box.textContent = "语言 —";
      }
    } catch (e) {
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

  async function init() {
    await loadEnabled();
    renderToggles();
    renderCards();
    await initPageFxToggle();
    await loadLang();

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

    $("fxRefresh").onclick = () => doRefresh(true);
    tickTimer = setInterval(tickAll, 1000);
  }

  init();
})();
