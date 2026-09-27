const player = document.getElementById("player");
const nameEl = document.getElementById("name");
document.getElementById("pick").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.name.endsWith(".vtt")) {
    const url = URL.createObjectURL(file);
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = file.name;
    track.srclang = "en";
    track.src = url;
    track.default = true;
    player.appendChild(track);
    return;
  }
  player.src = URL.createObjectURL(file);
  nameEl.textContent = file.name;
  player.play().catch(() => undefined);
});
