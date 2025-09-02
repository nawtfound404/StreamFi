// Auth & Identity Module wired to backend
export type Role = "STREAMER" | "AUDIENCE" | "ADMIN" | "streamer" | "viewer" | "admin";

export type Session = { userId: string; role: Role; token: string } | null;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

async function getCsrfToken(): Promise<string | null> {
  try {
    if (!API_BASE) return null;
    const res = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { csrfToken?: string };
    return data?.csrfToken ?? res.headers.get('x-csrf-token');
  } catch { return null; }
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const token = await getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function getJSON<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export const auth = {
  async signIn(params: { email: string; password: string }): Promise<Session> {
    if (!API_BASE) return null; // fallback disabled if no API
    const data = await postJSON<{ token: string; user: { id: string; role: Role } }>("/auth/login", params);
    return { userId: data.user.id, role: data.user.role, token: data.token };
  },
  async signUp(params: { email: string; password: string; name?: string }): Promise<Session> {
    if (!API_BASE) return null;
    const data = await postJSON<{ token: string; user: { id: string; role: Role } }>("/auth/signup", params);
    return { userId: data.user.id, role: data.user.role, token: data.token };
  },
  async getMe(token: string) {
    if (!API_BASE) return null;
    return getJSON<{ user: { id: string; role: Role } }>("/auth/me", token);
  },
  async signOut() {
    return true;
  },
  async getSession(): Promise<Session> {
    return null;
  },
};
