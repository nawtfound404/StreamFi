// Real-Time Interaction (stubs)
export type ChatMessage = { id: string; user: string; text: string; at: number };

export const realtime = {
  connectChat(streamId: string) {
    // TODO: replace with websocket URL
    const url = `wss://example.com/chat?stream=${encodeURIComponent(streamId)}`;
    return { url };
  },
};
