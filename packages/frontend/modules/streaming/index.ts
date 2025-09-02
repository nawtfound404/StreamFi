// Streaming Core wired to backend
export type StreamQuality = "audio" | "720p" | "1080p";
export type StreamInfo = { key: string; ingestUrl: string; hlsUrl: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export const streaming = {
  async createIngest(): Promise<StreamInfo> {
    if (!API_BASE) return { key: "dev", ingestUrl: "rtmp://localhost:1935/live", hlsUrl: "/hls/demo.m3u8" };
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
    const res = await fetch(`${API_BASE}/stream/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { ingestUrl: string; streamKey: string };
    return { key: data.streamKey, ingestUrl: data.ingestUrl, hlsUrl: '' };
  },
  hlsFor(streamId: string): string {
    if (!API_BASE) return `/hls/${streamId}.m3u8`;
    // Backend provides dynamic HLS URL
    return `${API_BASE}/stream/${streamId}/hls`;
  }
};
