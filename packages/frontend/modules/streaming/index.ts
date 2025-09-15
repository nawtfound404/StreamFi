// Streaming Core wired to backend
export type StreamQuality = "audio" | "720p" | "1080p";
export type StreamInfo = { key: string; id?: string; ingestUrl: string; hlsUrl: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export const streaming = {
  async createIngest(): Promise<StreamInfo> {
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
  const csrfRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
    const res = await fetch(`${API_BASE}/stream/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
  const data = await res.json() as { ingestUrl: string; streamKey: string; streamId?: string };
  return { key: data.streamKey, id: data.streamId, ingestUrl: data.ingestUrl, hlsUrl: '' };
  },
  async peekIngest(): Promise<{ streamKey?: string } | null> {
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
      const csrfRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
      const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
      const res = await fetch(`${API_BASE}/stream/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
      });
      if (!res.ok) return null;
      const data = await res.json() as { streamKey?: string };
      return { streamKey: data.streamKey };
    } catch { return null; }
  },
  // Prefer passing streamId here. Accepts string for backward compat (dev fallback only)
  hlsFor(idOrKey: string): string {
    // Backend provides dynamic HLS URL
    return `${API_BASE}/stream/${idOrKey}/hls`;
  },
  async chatHistory(idOrKey: string) {
    const res = await fetch(`${API_BASE}/chat/${encodeURIComponent(idOrKey)}/messages`);
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as { items: Array<{ _id: string; userId: string; text: string; createdAt: string }> };
  }
};
