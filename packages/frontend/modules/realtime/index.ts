// Real-Time Interaction using Socket.IO
export type ChatMessage = { id: string; user: string; text: string; at: number };

function deriveWsBase() {
  if (process.env.NEXT_PUBLIC_WS_BASE) return process.env.NEXT_PUBLIC_WS_BASE;
  const api = process.env.NEXT_PUBLIC_API_BASE;
  if (!api) {
    if (typeof window !== 'undefined') {
      const loc = window.location;
      return `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}`;
    }
    return '';
  }
  try {
    const u = new URL(api);
    const origin = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
    return origin; // socket.io default path
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
