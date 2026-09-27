export type CastItem = {
  id: string;
  title: string;
  url: string;
  kind: "video" | "audio" | "screen";
  note?: string;
};

export const SAMPLES: CastItem[] = [
  {
    id: "bbb",
    title: "Big Buck Bunny",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    kind: "video",
    note: "Open sample · MP4",
  },
  {
    id: "sintel",
    title: "Sintel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    kind: "video",
    note: "Open sample · MP4",
  },
  {
    id: "elephants",
    title: "Elephants Dream",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    kind: "video",
    note: "Open sample · MP4",
  },
  {
    id: "tears",
    title: "Tears of Steel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    kind: "video",
    note: "Open sample · MP4",
  },
];

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function channelName(room: string) {
  return `sable-cast:${room.trim().toUpperCase()}`;
}
