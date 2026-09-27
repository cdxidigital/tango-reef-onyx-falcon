const stage = document.getElementById("stage");
document.getElementById("go").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stage.srcObject = stream;
    stage.muted = false;
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      stage.srcObject = null;
    });
  } catch {
    /* picker cancelled */
  }
});
