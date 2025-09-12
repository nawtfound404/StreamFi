const rawApiBase = process.env.NEXT_PUBLIC_API_BASE || '/api';
export const config = {
  HLS_BASE: process.env.NEXT_PUBLIC_HLS_BASE || '',
  HLS_PATH_TEMPLATE: process.env.NEXT_PUBLIC_HLS_PATH_TEMPLATE || '/live/{id}/index.m3u8',
  CHAT_WS_BASE: process.env.NEXT_PUBLIC_CHAT_WS_BASE || 'ws://localhost:8000',
  API_BASE: rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase,
};

export function hlsUrlFor(id: string) {
  if (config.API_BASE) {
    return `${config.API_BASE}/stream/${id}/hls?redirect=1`;
  }
  const path = config.HLS_PATH_TEMPLATE.replace("{id}", id);
  return `${config.HLS_BASE}${path}`;
}

export function chatWsUrlFor(room: string) {
  return `${config.CHAT_WS_BASE}/chat?room=${encodeURIComponent(room)}`;
}
