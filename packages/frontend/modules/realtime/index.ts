// Real-Time Interaction using Socket.IO
export type ChatMessage = { id: string; user: string; text: string; at: number };

function deriveWsBase() {
  // Prefer same-origin WebSocket base so nginx/Next rewrites proxy correctly
  if (typeof window !== 'undefined') {
    const loc = window.location;
    return `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}`;
  }
  // Fallback to env only for SSR/non-browser contexts
  if (process.env.NEXT_PUBLIC_WS_BASE) return process.env.NEXT_PUBLIC_WS_BASE;
  const api = process.env.NEXT_PUBLIC_API_BASE;
  try {
    if (!api) return '';
    const u = new URL(api);
    const origin = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
    return origin;
  } catch {
    return '';
  }
}
const WS_BASE = deriveWsBase();

export const realtime = {
  connectChat(streamId: string) {
    const url = `${WS_BASE}/?streamId=${encodeURIComponent(streamId)}`;
    return { url };
  },
};
