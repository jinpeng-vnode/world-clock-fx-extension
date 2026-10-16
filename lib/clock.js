(function (g) {
  const FACE_SVG = `<svg class="face" viewBox="0 0 100 100" aria-hidden="true">
    <circle class="dial" cx="50" cy="50" r="46"/>
    ${Array.from({ length: 12 }, (_, k) =>
      `<line class="tick" x1="50" y1="8" x2="50" y2="${k % 3 ? 14 : 18}" transform="rotate(${k * 30} 50 50)"/>`
    ).join("")}
    <text class="apt" x="50" y="77" text-anchor="middle"></text>
    <line class="hh" x1="50" y1="50" x2="50" y2="28"/>
    <line class="mh" x1="50" y1="50" x2="50" y2="16"/>
    <line class="sh" x1="50" y1="57" x2="50" y2="12"/>
    <circle class="pin" cx="50" cy="50" r="3"/>
  </svg>`;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderCardHtml(c) {
    return `<div class="cty clk" data-z="${esc(c.tz)}" data-id="${esc(c.id)}" data-cur="${esc(c.cur)}">
      <div class="cty-head"><span class="cn">${esc(c.name)} · ${esc(c.city)}</span><span class="ph"></span></div>
      ${FACE_SVG}
      <div class="ampm">--</div>
      <div class="tm">--:--:--</div>
      <div class="dt"></div>
      <div class="off"></div>
      <div class="fx-row" data-cur="${esc(c.cur)}">
        <div class="fx-in">
          <input type="text" inputmode="decimal" value="100" autocomplete="off" aria-label="${esc(c.curName)}金额">
          <span class="code">${esc(c.cur)}</span>
        </div>
        <div class="fx-eq">= <span class="fx-res">—</span></div>
        <div class="rate"></div>
        <div class="cur-name">${esc(c.curName)}</div>
      </div>
    </div>`;
  }

  function tickCard(el, now, bj) {
    const z = el.dataset.z;
    const W = g.WCFX;
    try {
      const p = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: z, hourCycle: "h23",
        hour: "numeric", minute: "numeric", second: "numeric"
      }).formatToParts(now).forEach((x) => { p[x.type] = x.value; });
      const H = +p.hour % 24, M = +p.minute, S = +p.second;
      const ph = W.phaseOf(H, M);
      if (!el.classList.contains("ph-" + ph)) {
        el.classList.remove("ph-day", "ph-dawn", "ph-dusk", "ph-night");
        el.classList.add("ph-" + ph);
        el.querySelector(".ph").textContent = W.PHASE_EMOJI[ph];
      }
      const ap = H < 12 ? "上午" : "下午";
      el.querySelector(".ampm").textContent = ap;
      const apt = el.querySelector(".apt");
      if (apt) apt.textContent = ap;
      el.querySelector(".hh").setAttribute("transform", `rotate(${(H % 12) * 30 + M * 0.5} 50 50)`);
      el.querySelector(".mh").setAttribute("transform", `rotate(${M * 6 + S * 0.1} 50 50)`);
      el.querySelector(".sh").setAttribute("transform", `rotate(${S * 6} 50 50)`);
      el.querySelector(".tm").textContent = new Intl.DateTimeFormat("zh-CN", {
        timeZone: z, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
      }).format(now);
      el.querySelector(".dt").textContent = new Intl.DateTimeFormat("zh-CN", {
        timeZone: z, year: "numeric", month: "long", day: "numeric", weekday: "short"
      }).format(now);
      const diff = W.zoneOffsetMin(z, now) - bj;
      const h = Math.abs(diff) / 60;
      el.querySelector(".off").textContent =
        diff === 0 ? "与北京同时" :
        `${diff > 0 ? "比北京快" : "比北京慢"} ${Number.isInteger(h) ? h : h.toFixed(1)} 小时`;
    } catch (e) {
      const dt = el.querySelector(".dt");
      if (dt) dt.textContent = "无效时区";
    }
  }

  g.WCFX = g.WCFX || {};
  Object.assign(g.WCFX, { FACE_SVG, esc, renderCardHtml, tickCard });
})(typeof globalThis !== "undefined" ? globalThis : self);
