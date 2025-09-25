// Users module: role/username/live streams/join-leave/mute
import { API_BASE } from "@/lib/api";

async function csrf(): Promise<string | undefined> {
  try {
    const r = await fetch(`${API_BASE}/csrf`, { credentials: "include" });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { csrfToken?: string };
    return j?.csrfToken;
  } catch {
    return undefined;
  }
}

function bearer(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem("streamfi-auth") || "{}").state?.session?.token;
  } catch {
    return undefined;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = bearer();
  const xcsrf = await csrf();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(xcsrf ? { "x-csrf-token": xcsrf } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  const token = bearer();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export type LiveStream = { _id: string; title?: string; streamerId: string; viewers?: number; createdAt?: string };

export const users = {
  async setRole(role: "STREAMER" | "AUDIENCE") {
    return post<{ ok: true; role: string }>(`/users/role`, { role });
  },
  async setUsername(username: string) {
    return post<{ ok: true; username: string }>(`/users/username`, { username });
  },
  async liveStreams() {
    return get<{ items: LiveStream[] }>(`/users/streams/live`);
  },
  async joinStream(streamId: string) {
    // Only call backend when authenticated; otherwise no-op for anonymous viewers
    const token = bearer();
    if (!token) return { ok: true } as any;
    return post<{ ok: true }>(`/users/streams/${encodeURIComponent(streamId)}/join`, {});
  },
  async leaveStream(streamId: string) {
    const token = bearer();
    if (!token) return { ok: true } as any;
    return post<{ ok: true }>(`/users/streams/${encodeURIComponent(streamId)}/leave`, {});
  },
  async mute(userId: string) {
    return post<{ ok: true }>(`/users/mute`, { userId });
  },
  async unmute(userId: string) {
    return post<{ ok: true }>(`/users/unmute`, { userId });
  },
};
