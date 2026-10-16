/* MV3 service worker: 后台刷新汇率（>1h） */
importScripts("lib/countries.js", "lib/format.js", "lib/fx.js");

const ALARM = "wcfx-fx-refresh";

async function ensureAlarm() {
  const a = await chrome.alarms.get(ALARM);
  if (!a) {
    chrome.alarms.create(ALARM, { periodInMinutes: 30 });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm();
  await WCFX.maybeAutoRefresh();
  const k = WCFX.LS_KEYS.enabled;
  const o = await chrome.storage.local.get([k, WCFX.LS_KEYS.pageFx]);
  if (o[k] == null) {
    await chrome.storage.local.set({
      [k]: WCFX.COUNTRIES.map((c) => c.id)
    });
  }
  if (o[WCFX.LS_KEYS.pageFx] == null) {
    await chrome.storage.local.set({ [WCFX.LS_KEYS.pageFx]: true });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
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
});
