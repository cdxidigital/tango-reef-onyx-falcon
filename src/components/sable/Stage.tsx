import { useEffect, useRef } from "react";

export type StageHandle = {
  play: () => void;
  pause: () => void;
  seekBy: (delta: number) => void;
  seekTo: (ratio: number) => void;
  setVolume: (v: number) => void;
  setRate: (r: number) => void;
  setLoop: (on: boolean) => void;
  loadUrl: (url: string) => void;
  attachStream: (stream: MediaStream | null) => void;
  grabFrame: () => string | null;
  snapshot: () => { current: number; duration: number; paused: boolean; volume: number };
};

type Props = {
  url: string;
  title: string;
  loop: boolean;
  rate: number;
  volume: number;
  posterNote?: string;
  onTime: (current: number, duration: number, paused: boolean) => void;
  bind: (handle: StageHandle | null) => void;
};

export function Stage({ url, title, loop, rate, volume, posterNote, onTime, bind }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tick = () => onTime(video.currentTime || 0, video.duration || 0, video.paused);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("loadedmetadata", tick);
    video.addEventListener("play", tick);
    video.addEventListener("pause", tick);
    return () => {
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("loadedmetadata", tick);
      video.removeEventListener("play", tick);
      video.removeEventListener("pause", tick);
    };
  }, [onTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = loop;
    video.playbackRate = rate;
    video.volume = volume;
  }, [loop, rate, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handle: StageHandle = {
      play: () => void video.play().catch(() => undefined),
      pause: () => video.pause(),
      seekBy: (delta) => {
        const next = Math.max(0, (video.currentTime || 0) + delta);
        video.currentTime = Number.isFinite(video.duration) ? Math.min(next, video.duration) : next;
      },
      seekTo: (ratio) => {
        if (!Number.isFinite(video.duration)) return;
        video.currentTime = Math.max(0, Math.min(1, ratio)) * video.duration;
      },
      setVolume: (v) => {
        video.volume = v;
        video.muted = v === 0;
      },
      setRate: (r) => {
        video.playbackRate = r;
      },
      setLoop: (on) => {
        video.loop = on;
      },
      loadUrl: (next) => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        video.srcObject = null;
        video.src = next;
        void video.play().catch(() => undefined);
      },
      attachStream: (stream) => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        video.src = "";
        video.srcObject = stream;
        if (stream) void video.play().catch(() => undefined);
      },
      grabFrame: () => {
        if (!video.videoWidth) return null;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.85);
      },
      snapshot: () => ({
        current: video.currentTime || 0,
        duration: video.duration || 0,
        paused: video.paused,
        volume: video.volume,
      }),
    };
    bind(handle);
    return () => bind(null);
  }, [bind]);

  return (
    <div className="relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,.45)]">
      <video
        ref={videoRef}
        className="h-full w-full flex-1 bg-black object-contain"
        src={url || undefined}
        playsInline
        controls={false}
      />
      {!url && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-2xl font-semibold tracking-tight text-[var(--color-brass)]">Ready when you are</p>
          <p className="max-w-xs text-sm text-[var(--color-mute)]">
            {posterNote ?? "Pick a stream, drop a file, or mirror this screen."}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2 text-xs tracking-wide text-[var(--color-mute)] uppercase">
        <span className="truncate">{title || "Nothing loaded"}</span>
        <span>Sable receiver</span>
      </div>
    </div>
  );
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
