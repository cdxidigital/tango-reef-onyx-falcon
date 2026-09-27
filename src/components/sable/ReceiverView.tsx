import { useEffect, useState } from "react";
import { channelName } from "@/lib/sable/samples";

type Wire =
  | { type: "load"; url: string; title: string }
  | { type: "control"; action: string; value?: number | boolean }
  | { type: "hello"; role: "sender" | "receiver" };

export function ReceiverView({ initialRoom }: { initialRoom: string }) {
  const [room, setRoom] = useState(initialRoom.toUpperCase());
  const [title, setTitle] = useState("Waiting for a sender");
  const [url, setUrl] = useState("");
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (room.length < 4) return;
    const channel = new BroadcastChannel(channelName(room));
    const video = () => document.getElementById("sable-rx") as HTMLVideoElement | null;
    const onMessage = (event: MessageEvent<Wire>) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "hello" && msg.role === "sender") {
        setLinked(true);
        channel.postMessage({ type: "hello", role: "receiver" } satisfies Wire);
      }
      if (msg.type === "load") {
        setLinked(true);
        setTitle(msg.title || "Cast");
        setUrl(msg.url);
        const el = video();
        if (el) {
          el.src = msg.url;
          void el.play().catch(() => undefined);
        }
      }
      if (msg.type === "control") {
        const el = video();
        if (!el) return;
        const { action, value } = msg;
        if (action === "toggle") el.paused ? void el.play() : el.pause();
        if (action === "play") void el.play();
        if (action === "pause") el.pause();
        if (action === "back") el.currentTime = Math.max(0, el.currentTime - 10);
        if (action === "forward") el.currentTime = Math.min(el.duration || el.currentTime + 10, el.currentTime + 10);
        if (action === "seek" && typeof value === "number" && Number.isFinite(el.duration)) el.currentTime = value * el.duration;
        if (action === "volume" && typeof value === "number") el.volume = value;
        if (action === "rate" && typeof value === "number") el.playbackRate = value;
        if (action === "loop" && typeof value === "boolean") el.loop = value;
      }
    };
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "hello", role: "receiver" } satisfies Wire);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [room]);

  return (
    <div className="flex min-h-screen flex-col bg-black text-[var(--color-paper)]">
      <header className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
        <div>
          <p className="font-serif text-2xl text-[var(--color-brass)]">Sable</p>
          <p className="text-[var(--color-mute)]">{title}</p>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
          <span className="text-[var(--color-mute)]">{linked ? "Linked" : "Room"}</span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            className="w-24 bg-transparent font-mono tracking-[0.18em] outline-none"
            aria-label="Room code"
          />
        </label>
      </header>
      <video id="sable-rx" className="min-h-0 w-full flex-1 bg-black object-contain" src={url || undefined} controls playsInline />
    </div>
  );
}
