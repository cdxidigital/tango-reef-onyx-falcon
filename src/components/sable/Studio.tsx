import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { channelName, roomCode, type CastItem } from "@/lib/sable/samples";
import { Stage, formatTime, type StageHandle } from "./Stage";

type Wire =
  | { type: "load"; url: string; title: string }
  | { type: "control"; action: string; value?: number | boolean }
  | { type: "hello"; role: "sender" | "receiver" };

export function Studio() {
  const [room, setRoom] = useState("SABLE1");
  const [queue, setQueue] = useState<CastItem[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [pasted, setPasted] = useState("");
  const [volume, setVolume] = useState(0.9);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [peers, setPeers] = useState(0);
  const [status, setStatus] = useState("Local receiver ready.");
  const [frame, setFrame] = useState<string | null>(null);
  const [subs, setSubs] = useState<string | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const fileUrl = useRef<string | null>(null);

  const current = queue.find((q) => q.id === currentId) ?? null;

  const bind = useCallback((handle: StageHandle | null) => {
    stageRef.current = handle;
  }, []);

  const onTime = useCallback((currentTime: number, duration: number, isPaused: boolean) => {
    setTime({ current: currentTime, duration });
    setPaused(isPaused);
  }, []);

  const publish = useCallback((msg: Wire) => {
    channelRef.current?.postMessage(msg);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("sable-room");
    const next = stored && stored.length >= 4 ? stored : roomCode();
    setRoom(next);
    sessionStorage.setItem("sable-room", next);
  }, []);

  useEffect(() => {
    if (!room) return;
    const channel = new BroadcastChannel(channelName(room));
    channelRef.current = channel;
    const onMessage = (event: MessageEvent<Wire>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "hello" && msg.role === "receiver") {
        setPeers((n) => n + 1);
        setStatus("A second window joined this room.");
        if (current && current.kind !== "screen") {
          channel.postMessage({ type: "load", url: current.url, title: current.title } satisfies Wire);
        }
      }
    };
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "hello", role: "sender" } satisfies Wire);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [room, current]);

  function loadItem(item: CastItem) {
    setCurrentId(item.id);
    setFrame(null);
    if (item.kind === "screen") return;
    stageRef.current?.loadUrl(item.url);
    publish({ type: "load", url: item.url, title: item.title });
    setStatus(`Casting “${item.title}” to this room.`);
  }

  function addUrl() {
    const url = pasted.trim();
    if (!/^https?:\/\//i.test(url)) {
      setStatus("Paste a direct http(s) video or audio URL.");
      return;
    }
    const item: CastItem = {
      id: `url-${Date.now()}`,
      title: url.split("/").pop()?.split("?")[0] || "Pasted stream",
      url,
      kind: /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url) ? "audio" : "video",
      note: "Pasted URL",
    };
    setQueue((q) => [item, ...q]);
    setPasted("");
    loadItem(item);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    const url = URL.createObjectURL(file);
    fileUrl.current = url;
    const item: CastItem = {
      id: `file-${Date.now()}`,
      title: file.name,
      url,
      kind: file.type.startsWith("audio") ? "audio" : "video",
      note: "Local file · this browser only",
    };
    setQueue((q) => [item, ...q]);
    loadItem(item);
  }

  async function mirror() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const item: CastItem = {
        id: `screen-${Date.now()}`,
        title: "Screen mirror",
        url: "",
        kind: "screen",
        note: "Live capture",
      };
      setQueue((q) => [item, ...q]);
      setCurrentId(item.id);
      stageRef.current?.attachStream(stream);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => setStatus("Mirror stopped."));
      setStatus("Mirroring into the receiver. Drag this window to a second display, or open the room on another screen.");
    } catch {
      setStatus("Screen share was cancelled.");
    }
  }

  function control(action: string, value?: number | boolean) {
    const stage = stageRef.current;
    if (!stage) return;
    if (action === "toggle") paused ? stage.play() : stage.pause();
    if (action === "play") stage.play();
    if (action === "pause") stage.pause();
    if (action === "back") stage.seekBy(-10);
    if (action === "forward") stage.seekBy(10);
    if (action === "seek" && typeof value === "number") stage.seekTo(value);
    publish({ type: "control", action, value });
  }

  function changeVolume(v: number) {
    setVolume(v);
    stageRef.current?.setVolume(v);
    publish({ type: "control", action: "volume", value: v });
  }

  function changeRate(r: number) {
    setRate(r);
    stageRef.current?.setRate(r);
    publish({ type: "control", action: "rate", value: r });
  }

  function toggleLoop() {
    const next = !loop;
    setLoop(next);
    stageRef.current?.setLoop(next);
    publish({ type: "control", action: "loop", value: next });
  }

  function skip(dir: number) {
    if (!queue.length) return;
    const idx = Math.max(0, queue.findIndex((q) => q.id === currentId));
    const next = queue[(idx + dir + queue.length) % queue.length];
    if (next) loadItem(next);
  }

  function grab() {
    const shot = stageRef.current?.grabFrame();
    if (!shot) {
      setStatus("Nothing to grab yet.");
      return;
    }
    setFrame(shot);
    setStatus("Still grabbed from the current frame.");
  }

  function onSub(file: File | undefined) {
    if (!file) return;
    if (subs) URL.revokeObjectURL(subs);
    const url = URL.createObjectURL(file);
    setSubs(url);
    const video = document.querySelector("video");
    if (video) {
      const existing = video.querySelector("track[data-sable]");
      existing?.remove();
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = file.name;
      track.srclang = "en";
      track.src = url;
      track.default = true;
      track.dataset.sable = "1";
      video.appendChild(track);
      setStatus(`Subtitles attached: ${file.name}`);
    }
  }

  const receiveHref = useMemo(() => `/receive?room=${encodeURIComponent(room)}`, [room]);
  const ratio = time.duration ? time.current / time.duration : 0;

  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-paper)]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 md:px-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-brass)] uppercase">AirPlay from the browser</p>
          <h1 className="text-4xl font-semibold tracking-tight">Sable</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5">
            <span className="text-[var(--color-mute)]">Room</span>
            <input
              value={room}
              onChange={(e) => {
                const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                setRoom(next);
                sessionStorage.setItem("sable-room", next);
              }}
              className="w-24 bg-transparent font-mono tracking-[0.2em] outline-none"
              aria-label="Room code"
            />
          </label>
          <a
            href={receiveHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[var(--color-brass)] px-4 py-1.5 font-medium text-[var(--color-ink)]"
          >
            Open receiver
          </a>
          <a href="/sable-cast.zip" className="rounded-full border border-[var(--color-line)] px-4 py-1.5">
            Download extension
          </a>
        </div>
      </header>

      <main className="grid gap-4 px-5 py-5 lg:grid-cols-[280px_1fr_280px] md:px-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-[0.2em] text-[var(--color-mute)] uppercase">Queue</h2>
          <div className="flex gap-2">
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              placeholder="Direct video URL"
              className="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none"
            />
            <button type="button" onClick={addUrl} className="rounded-xl bg-white/10 px-3 text-sm">
              Add
            </button>
          </div>
          <label className="cursor-pointer rounded-xl border border-dashed border-[var(--color-line)] px-3 py-3 text-sm text-[var(--color-mute)]">
            Drop or choose a local video / audio file
            <input
              type="file"
              accept="video/*,audio/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <ul className="flex max-h-[460px] flex-col gap-1 overflow-auto">
            {queue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => loadItem(item)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${
                    item.id === currentId ? "bg-[var(--color-brass)] text-[var(--color-ink)]" : "bg-[var(--color-panel)]"
                  }`}
                >
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className={`block truncate text-xs ${item.id === currentId ? "text-black/70" : "text-[var(--color-mute)]"}`}>
                    {item.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-[420px] flex-col gap-3">
          <Stage
            url={current && current.kind !== "screen" ? current.url : ""}
            title={current?.title ?? ""}
            loop={loop}
            rate={rate}
            volume={volume}
            onTime={onTime}
            bind={bind}
          />
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(ratio * 1000)}
            aria-label="Seek"
            onChange={(e) => control("seek", Number(e.target.value) / 1000)}
            className="w-full accent-[var(--color-brass)]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-mono text-[var(--color-mute)]">
              {formatTime(time.current)} / {formatTime(time.duration)}
            </span>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => skip(-1)}>Prev</Btn>
              <Btn onClick={() => control("back")}>−10</Btn>
              <Btn onClick={() => control("toggle")} strong>
                {paused ? "Play" : "Pause"}
              </Btn>
              <Btn onClick={() => control("forward")}>+10</Btn>
              <Btn onClick={() => skip(1)}>Next</Btn>
            </div>
          </div>
          <p className="text-sm text-[var(--color-mute)]">{status}</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs tracking-[0.2em] text-[var(--color-mute)] uppercase">Remote</h2>
          <label className="text-sm">
            Volume {Math.round(volume * 100)}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => changeVolume(Number(e.target.value) / 100)}
              className="mt-1 w-full accent-[var(--color-brass)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => changeRate(r)}
                className={`rounded-full px-3 py-1 text-xs ${rate === r ? "bg-[var(--color-brass)] text-black" : "bg-white/10"}`}
              >
                {r}×
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={toggleLoop}>{loop ? "Loop on" : "Loop off"}</Btn>
            <Btn onClick={mirror}>Mirror screen</Btn>
            <Btn onClick={grab}>Grab still</Btn>
            <Btn
              onClick={() => {
                if (!current?.url || current.url.startsWith("blob:")) return;
                void navigator.clipboard.writeText(current.url);
                setStatus("Stream URL copied.");
              }}
            >
              Copy URL
            </Btn>
          </div>
          <label className="cursor-pointer rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm">
            Attach WebVTT subtitles
            <input type="file" accept=".vtt,text/vtt" className="sr-only" onChange={(e) => onSub(e.target.files?.[0])} />
          </label>
          {frame && <img src={frame} alt="Grabbed still" className="rounded-xl border border-[var(--color-line)]" />}
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-sm leading-relaxed text-[var(--color-mute)]">
            <p className="mb-2 text-[var(--color-paper)]">Same job as a cast dongle, inside the browser.</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Play a direct stream on this stage and on any window that joins the room.</li>
              <li>Mirror the screen or a window into the receiver.</li>
              <li>Remote: pause, seek, volume, speed, loop, queue, stills, subtitles.</li>
              <li>
                The unpacked extension sniffs videos on whatever page you are browsing. Windows joined here: {peers}.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function Btn({ children, onClick, strong }: { children: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm ${strong ? "bg-[var(--color-brass)] text-black" : "bg-white/10"}`}
    >
      {children}
    </button>
  );
}
