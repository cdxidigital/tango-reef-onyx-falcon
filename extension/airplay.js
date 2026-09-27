const AIRPLAY_PORT = 7000;

function sessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanHost(input) {
  const host = String(input || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && !/^[a-z0-9.-]+$/i.test(host)) return "";
  return host;
}

async function airplayRequest(host, path, { method = "POST", body, contentType } = {}) {
  const response = await fetch(`http://${host}:${AIRPLAY_PORT}${path}`, {
    method,
    headers: {
      "User-Agent": "MediaControl/1.0",
      "X-Apple-Session-ID": sessionId(),
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });
  const text = await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, text };
}

async function airplayProbe(host) {
  const target = cleanHost(host);
  if (!target) return { ok: false, error: "Enter the Apple TV’s IP address." };
  try {
    const info = await airplayRequest(target, "/server-info", { method: "GET" });
    if (info.status === 403 || info.status === 401) {
      return { ok: false, error: "Apple TV refused the connection. Set AirPlay to Allow Everyone, then try again." };
    }
    if (!info.ok && info.status !== 0) {
      return { ok: false, error: `No AirPlay receiver on ${target} (HTTP ${info.status}). Check the IP in Settings → Network.` };
    }
    const name = info.text.match(/<key>deviceid<\/key>\s*<string>([^<]+)/i)?.[1] || target;
    return { ok: true, host: target, name };
  } catch {
    return { ok: false, error: `Cannot reach ${target}:7000. Same Wi-Fi as the Apple TV, and AirPlay allowed for everyone.` };
  }
}

async function airplayPlay(host, url, position = 0) {
  const target = cleanHost(host);
  if (!target) return { ok: false, error: "Enter the Apple TV’s IP address." };
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: "Apple TV can only play a direct http(s) link. It cannot play a blob or a DRM player." };
  }
  const start = Number.isFinite(position) ? position : 0;
  const textBody = `Content-Location: ${url}\nStart-Position: ${start}\n`;
  try {
    let result = await airplayRequest(target, "/play", {
      body: textBody,
      contentType: "text/parameters",
    });
    if (!result.ok) {
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Content-Location</key><string>${url.replace(/&/g, "&")}</string>
<key>Start-Position</key><real>${start}</real>
</dict></plist>`;
      result = await airplayRequest(target, "/play", {
        body: plist,
        contentType: "text/x-apple-plist+xml",
      });
    }
    if (result.status === 403 || result.status === 401) {
      return { ok: false, error: "Apple TV asked for a pairing code. Set AirPlay access to Everyone and cast again." };
    }
    if (!result.ok) {
      return { ok: false, error: `Apple TV did not start playback (HTTP ${result.status}). The link may be blocked, DRM, or not a file the TV can fetch.` };
    }
    return { ok: true, host: target };
  } catch {
    return { ok: false, error: `Cannot reach ${target}:7000 from this browser.` };
  }
}

async function airplayControl(host, action, value) {
  const target = cleanHost(host);
  if (!target) return { ok: false, error: "No Apple TV IP saved." };
  try {
    if (action === "pause") return shape(await airplayRequest(target, "/rate?value=0"));
    if (action === "play" || action === "toggle") return shape(await airplayRequest(target, "/rate?value=1"));
    if (action === "stop") return shape(await airplayRequest(target, "/stop"));
    if (action === "seek" && typeof value === "number") return shape(await airplayRequest(target, `/scrub?position=${Math.max(0, value)}`));
    if (action === "forward") return shape(await airplayRequest(target, "/scrub?position=30"));
    return { ok: false, error: "That control is not sent to Apple TV." };
  } catch {
    return { ok: false, error: `Lost contact with ${target}.` };
  }
}

function shape(result) {
  return result.ok ? { ok: true } : { ok: false, error: `Apple TV returned HTTP ${result.status}.` };
}
