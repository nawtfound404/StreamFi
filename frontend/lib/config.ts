export const config = {
  // Example: http://localhost:8000 for Node Media Server HTTP server
  HLS_BASE: process.env.NEXT_PUBLIC_HLS_BASE || "",
  // Template like "/live/{id}/index.m3u8" for NMS; fallback to "/hls/{id}.m3u8"
  HLS_PATH_TEMPLATE: process.env.NEXT_PUBLIC_HLS_PATH_TEMPLATE || "/live/{id}/index.m3u8",
  // Example: wss://chat.yourdomain.tld
  CHAT_WS_BASE: process.env.NEXT_PUBLIC_CHAT_WS_BASE || "wss://example.com",
};

export function hlsUrlFor(id: string) {
  const path = config.HLS_PATH_TEMPLATE.replace("{id}", id);
  return `${config.HLS_BASE}${path}`;
}

export function chatWsUrlFor(room: string) {
  return `${config.CHAT_WS_BASE}/chat?room=${encodeURIComponent(room)}`;
}
