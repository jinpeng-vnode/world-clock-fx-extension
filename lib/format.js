(function (g) {
  function fmtNum(n, maxFrac) {
    if (!isFinite(n)) return "—";
    const a = Math.abs(n);
    const f = maxFrac != null ? maxFrac : (a >= 100 ? 2 : a >= 1 ? 4 : a >= 0.01 ? 4 : 6);
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: f });
  }
  function fmtTime(ms) {
    return new Date(ms).toLocaleString("zh-CN", {
      hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }
  function parseAmt(s) {
    const v = parseFloat(String(s).replace(/,/g, ""));
    return isNaN(v) ? NaN : v;
  }
  /** 输入时自动千分位，光标按左侧有效字符数保持 */
  function formatAmtInput(el) {
    const old = el.value;
    const caret = el.selectionStart == null ? old.length : el.selectionStart;
    const sigLeft = old.slice(0, caret).replace(/[^\d.]/g, "").length;
    let raw = old.replace(/[^\d.]/g, "");
    const dot = raw.indexOf(".");
    if (dot > -1) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "");
    let [ip, dp] = raw.split(".");
    ip = (ip || "").replace(/^0+(?=\d)/, "");
    const out = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dp != null ? "." + dp : "");
    el.value = out;
    let n = 0, pos = 0;
    while (pos < out.length && n < sigLeft) {
      if (/[\d.]/.test(out[pos])) n++;
      pos++;
    }
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  }

  g.WCFX = g.WCFX || {};
  Object.assign(g.WCFX, { fmtNum, fmtTime, parseAmt, formatAmtInput });
})(typeof globalThis !== "undefined" ? globalThis : self);
