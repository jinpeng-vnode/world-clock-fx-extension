/* MV3 service worker: 后台刷新汇率（>1h） + 覆盖缓存迁移 */
importScripts("lib/countries.js", "lib/format.js", "lib/fx.js");

const ALARM = "wcfx-fx-refresh";
const MIGRATE_OVERRIDE_KEY = "wcfx_override_cleared_v131";

async function ensureAlarm() {
  const a = await chrome.alarms.get(ALARM);
  if (!a) {
    chrome.alarms.create(ALARM, { periodInMinutes: 30 });
  }
}

/** 一次性清掉旧版误写入的 origin→地区覆盖（如永远卡在纽约） */
async function migrateOverridesOnce() {
  const o = await chrome.storage.local.get(MIGRATE_OVERRIDE_KEY);
  if (o[MIGRATE_OVERRIDE_KEY]) return;
  await chrome.storage.local.set({
    [WCFX.LS_KEYS.langOverrideByOrigin]: {},
    [MIGRATE_OVERRIDE_KEY]: true
  });
}

/** 安装/更新后给已打开的网页补注入浮窗，无需逐页刷新或点击 */
async function injectIntoOpenTabs() {
  try {
    const cs = chrome.runtime.getManifest().content_scripts[0];
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const t of tabs) {
      if (t.id == null || t.discarded) continue;
      chrome.scripting.executeScript({ target: { tabId: t.id }, files: cs.js }).catch(() => {});
    }
  } catch (e) {}
}

chrome.runtime.onInstalled.addListener(async () => {
  injectIntoOpenTabs();
  await ensureAlarm();
  await migrateOverridesOnce();
  await WCFX.maybeAutoRefresh();
  const o = await chrome.storage.local.get([
    WCFX.LS_KEYS.usdCny,
    WCFX.LS_KEYS.langOverrideByOrigin
  ]);
  if (o[WCFX.LS_KEYS.usdCny] == null) {
    await chrome.storage.local.set({ [WCFX.LS_KEYS.usdCny]: WCFX.DEFAULT_USD_CNY });
  }
  if (o[WCFX.LS_KEYS.langOverrideByOrigin] == null) {
    await chrome.storage.local.set({ [WCFX.LS_KEYS.langOverrideByOrigin]: {} });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await migrateOverridesOnce();
  await WCFX.maybeAutoRefresh();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM) await WCFX.maybeAutoRefresh();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === "wcfx-refresh-fx") {
    WCFX.refreshFx(true).then((r) => sendResponse(r));
    return true;
  }
  if (msg.type === "wcfx-get-fx") {
    WCFX.maybeAutoRefresh().then((r) => sendResponse(r));
    return true;
  }
  if (msg.type === "wcfx-detect-lang") {
    const tabId = _sender && _sender.tab && _sender.tab.id;
    if (tabId == null || !chrome.tabs.detectLanguage) { sendResponse({ code: "" }); return; }
    chrome.tabs.detectLanguage(tabId).then(
      (code) => sendResponse({ code: code || "" }),
      () => sendResponse({ code: "" })
    );
    return true;
  }
  if (msg.type === "wcfx-migrate-overrides") {
    migrateOverridesOnce().then(() => sendResponse({ ok: true }));
    return true;
  }
});
