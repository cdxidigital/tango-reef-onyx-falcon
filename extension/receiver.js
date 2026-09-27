const params = new URLSearchParams(location.search);
const room = (params.get("room") || "SABLE1").toUpperCase();
const player = document.getElementById("player");
document.getElementById("room").textContent = room;

function sameRoom(message) {
  return !message.room || message.room === room;
}

function applyControl(action, value) {
  if (action === "toggle") player.paused ? player.play() : player.pause();
  if (action === "play") player.play();
  if (action === "pause") player.pause();
  if (action === "back") player.currentTime = Math.max(0, player.currentTime - 10);
  if (action === "forward") player.currentTime += 10;
  if (action === "seek" && typeof value === "number" && Number.isFinite(player.duration)) player.currentTime = value * player.duration;
  if (action === "volume" && typeof value === "number") player.volume = value;
  if (action === "rate" && typeof value === "number") player.playbackRate = value;
  if (action === "loop" && typeof value === "boolean") player.loop = value;
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message?.relay || !sameRoom(message)) return;
  if (message.type === "cast" && message.url) {
    document.getElementById("title").textContent = message.title || "Cast";
    player.src = message.url;
    player.play().catch(() => undefined);
  }
  if (message.type === "control") applyControl(message.action, message.value);
});

chrome.runtime.sendMessage({ type: "hello", relay: true, role: "receiver", room });
