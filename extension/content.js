function titleFor(el) {
  return (
    el.getAttribute("title") ||
    el.getAttribute("aria-label") ||
    document.title ||
    "Video on this page"
  );
}

function collect() {
  const found = [];
  const seen = new Set();
  document.querySelectorAll("video, audio").forEach((el) => {
    const url = el.currentSrc || el.src || "";
    if (!url || seen.has(url)) return;
    seen.add(url);
    found.push({
      url,
      title: titleFor(el),
      kind: el.tagName.toLowerCase(),
      width: el.videoWidth || 0,
      height: el.videoHeight || 0,
      via: "page",
    });
  });
  document.querySelectorAll("video source, audio source").forEach((el) => {
    const url = el.src || "";
    if (!url || seen.has(url)) return;
    seen.add(url);
    found.push({ url, title: document.title || "Source", kind: "source", via: "page" });
  });
  chrome.runtime.sendMessage({ type: "videos", videos: found }).catch(() => undefined);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "rescan") {
    collect();
    sendResponse({ ok: true });
  }
  if (message?.type === "position") {
    const el = document.querySelector("video, audio");
    sendResponse({
      url: el ? el.currentSrc || el.src || "" : "",
      position: el && Number.isFinite(el.duration) && el.duration > 0 ? el.currentTime / el.duration : 0,
      seconds: el ? el.currentTime || 0 : 0,
    });
  }
});
new MutationObserver(() => collect()).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["src"],
});
setInterval(collect, 4000);
collect();
