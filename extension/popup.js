const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const titleEl = document.getElementById("page-title");
const tpl = document.getElementById("row");

function setStatus(text) {
  statusEl.textContent = text;
}

function render(items) {
  listEl.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No direct video yet. Play the page, or cast a file.";
    listEl.append(li);
    return;
  }
  items.forEach((item) => {
    const node = tpl.content.cloneNode(true);
    node.querySelector("strong").textContent = item.title || "Stream";
    const meta = [item.via];
    if (item.width) meta.push(`${item.width}×${item.height}`);
    node.querySelector("span").textContent = meta.filter(Boolean).join(" · ") + " · " + item.url;
    node.querySelector("button.atv").addEventListener("click", () => castApple(item));
    listEl.append(node);
  });
}

const appleEl = document.getElementById("apple-ip");
const transport = document.getElementById("transport");

chrome.storage.local.get(["appleHost"], (stored) => {
  if (stored.appleHost) appleEl.value = stored.appleHost;
});

function saveApple() {
  const host = appleEl.value.trim();
  chrome.storage.local.set({ appleHost: host });
  return host;
}

appleEl.addEventListener("change", saveApple);

document.getElementById("apple-test").addEventListener("click", () => {
  const host = saveApple();
  setStatus("Looking for AirPlay…");
  chrome.runtime.sendMessage({ type: "airplay-probe", host }, (result) => {
    setStatus(result?.ok ? `AirPlay is answering at ${result.host}.` : result?.error || "No answer from that address.");
  });
});

function atvControl(action) {
  chrome.runtime.sendMessage({ type: "airplay-control", host: saveApple(), action }, (result) => {
    setStatus(result?.ok ? `Sent ${action} to Apple TV.` : result?.error || "Apple TV did not respond.");
  });
}

document.getElementById("atv-pause").addEventListener("click", () => atvControl("pause"));
document.getElementById("atv-play").addEventListener("click", () => atvControl("play"));
document.getElementById("atv-stop").addEventListener("click", () => atvControl("stop"));

function castApple(item) {
  const host = saveApple();
  if (!host) {
    setStatus("Enter the Apple TV IP. On the TV: Settings, Network.");
    return;
  }
  if (!item.url || item.url.startsWith("blob:") || item.url.startsWith("data:")) {
    setStatus("This player hides the file. AirPlay needs a direct http(s) link.");
    return;
  }
  setStatus("Contacting Apple TV…");
  chrome.runtime.sendMessage({ type: "get-state" }, (state) => {
    const send = (position) => {
      chrome.runtime.sendMessage({ type: "airplay-play", host, url: item.url, position }, (result) => {
        if (result?.ok) {
          transport.hidden = false;
          setStatus("Playing on the Apple TV. Pause and Stop control that session.");
        } else {
          setStatus(result?.error || "Apple TV did not start.");
        }
      });
    };
    if (state?.tabId == null) {
      send(0);
      return;
    }
    chrome.tabs.sendMessage(state.tabId, { type: "position" }, (pos) => {
      void chrome.runtime.lastError;
      const fraction = pos && pos.url === item.url ? pos.position : 0;
      send(fraction || 0);
    });
  });
}
ensureRoom();
function ensureRoom() {
  chrome.runtime.sendMessage({ type: "get-state" }, (state) => {
    if (!state) {
      setStatus("Could not read this tab.");
      return;
    }
    titleEl.textContent = state.title || "This tab";
    if (state.tabId != null) {
      chrome.tabs.sendMessage(state.tabId, { type: "rescan" }, () => void chrome.runtime.lastError);
    }
    const items = [...(state.videos || []), ...(state.sniffed || [])];
    const unique = [];
    const seen = new Set();
    items.forEach((item) => {
      if (!item.url || seen.has(item.url)) return;
      seen.add(item.url);
      unique.push(item);
    });
    render(unique);
    setStatus(unique.length ? `${unique.length} stream${unique.length === 1 ? "" : "s"} ready to AirPlay.` : "Play the video, then open Sable again.");
  });
}
