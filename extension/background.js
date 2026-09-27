importScripts("airplay.js");

const tabs = new Map();

function stateFor(tabId) {
  if (!tabs.has(tabId)) tabs.set(tabId, { videos: [], sniffed: [] });
  return tabs.get(tabId);
}

function isMedia(url, type) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return false;
  const mime = (type || "").toLowerCase();
  if (mime.startsWith("video/") || mime.startsWith("audio/") || mime.includes("mpegurl") || mime.includes("dash+xml")) return true;
  return /\.(mp4|webm|mkv|mov|m4v|mp3|m4a|ogg|wav|m3u8|mpd)(\?|$)/i.test(url);
}

chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (!isMedia(details.url, details.type === "media" ? "video/" : "")) return;
    const headerType = (details.responseHeaders || []).find((h) => h.name.toLowerCase() === "content-type")?.value || "";
    if (details.type !== "media" && !isMedia(details.url, headerType)) return;
    const bucket = stateFor(details.tabId);
    const title = decodeURIComponent(details.url.split("/").pop()?.split("?")[0] || "Stream");
    const next = { url: details.url, title, via: "network" };
    bucket.sniffed = [next, ...bucket.sniffed.filter((item) => item.url !== details.url)].slice(0, 12);
    const count = bucket.videos.length + bucket.sniffed.length;
    chrome.action.setBadgeText({ tabId: details.tabId, text: count ? String(Math.min(count, 99)) : "" });
    chrome.action.setBadgeBackgroundColor({ tabId: details.tabId, color: "#e4c27a" });
  },
  { urls: ["http://*/*", "https://*/*"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"],
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (message.type === "videos" && tabId != null) {
    const bucket = stateFor(tabId);
    bucket.videos = message.videos || [];
    const count = bucket.videos.length + bucket.sniffed.length;
    chrome.action.setBadgeText({ tabId, text: count ? String(Math.min(count, 99)) : "" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#e4c27a" });
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "get-state") {
    chrome.tabs.query({ active: true, currentWindow: true }, (found) => {
      const id = found[0]?.id;
      const bucket = id != null ? stateFor(id) : { videos: [], sniffed: [] };
      chrome.storage.session.get(["room"], (stored) => {
        sendResponse({
          tabId: id,
          title: found[0]?.title || "",
          videos: bucket.videos,
          sniffed: bucket.sniffed,
          room: stored.room || "",
        });
      });
    });
    return true;
  }
  if (message.type === "set-room") {
    chrome.storage.session.set({ room: message.room });
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "airplay-probe") {
    airplayProbe(message.host).then(sendResponse);
    return true;
  }
  if (message.type === "airplay-play") {
    airplayPlay(message.host, message.url, message.position).then((result) => {
      if (result.ok) chrome.storage.session.set({ appleHost: result.host, appleUrl: message.url });
      sendResponse(result);
    });
    return true;
  }
  if (message.type === "airplay-control") {
    chrome.storage.session.get(["appleHost"], (stored) => {
      airplayControl(message.host || stored.appleHost, message.action, message.value).then(sendResponse);
    });
    return true;
  }
    if (message.type === "cast" || message.type === "control") {
    chrome.runtime.sendMessage({ ...message, relay: true }).catch(() => undefined);
    sendResponse({ ok: true });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "cast-best") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const bucket = stateFor(tab.id);
  const best = bucket.videos[0] || bucket.sniffed[0];
  if (!best) return;
  const room = (await chrome.storage.session.get("room")).room || "SABLE1";
  await chrome.tabs.create({ url: chrome.runtime.getURL(`receiver.html?room=${encodeURIComponent(room)}`) });
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: "cast", relay: true, url: best.url, title: best.title, room }).catch(() => undefined);
  }, 600);
});

chrome.tabs.onRemoved.addListener((tabId) => tabs.delete(tabId));
