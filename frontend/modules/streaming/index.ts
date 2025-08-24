// Streaming Core (stubs)
export type StreamQuality = "audio" | "720p" | "1080p";
export type StreamInfo = { key: string; ingestUrl: string; hlsUrl: string };

export const streaming = {
  async createIngest(): Promise<StreamInfo> {
    return { key: "dev-key", ingestUrl: "rtmp://localhost:1935/live", hlsUrl: "/hls/demo.m3u8" };
  },
};
