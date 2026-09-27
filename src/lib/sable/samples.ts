export type CastItem = {
  id: string;
  title: string;
  url: string;
  kind: "video" | "audio" | "screen";
  note?: string;
};

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function channelName(room: string) {
  return `sable-cast:${room.trim().toUpperCase()}`;
}
