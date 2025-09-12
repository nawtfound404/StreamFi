// Auth & Identity Module wired to backend
export type Role = "STREAMER" | "AUDIENCE" | "ADMIN" | "streamer" | "viewer" | "admin";

export type Session = { userId: string; role: Role; token: string } | null;

const raw = process.env.NEXT_PUBLIC_API_BASE || '/api';
const API_BASE = raw.endsWith('/') ? raw.slice(0, -1) : raw;

async function getCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
    if (!res.ok) {
      if (typeof window !== 'undefined') console.warn('[auth] csrf fetch failed', res.status);
      return null;
    }
    const data = await res.json() as { csrfToken?: string };
    if (typeof window !== 'undefined') console.debug('[auth] csrf token obtained', data?.csrfToken);
    return data?.csrfToken ?? res.headers.get('x-csrf-token');
  } catch (e) { if (typeof window !== 'undefined') console.error('[auth] csrf error', e); return null; }
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const token = await getCsrfToken();
  const url = `${API_BASE}${path}`;
  if (typeof window !== 'undefined') console.debug('[auth] POST', url, { hasCsrf: !!token });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (typeof window !== 'undefined') console.warn('[auth] POST failed', url, res.status, text);
    throw new Error(text);
  }
  return (await res.json()) as T;
}

async function getJSON<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include'
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export const auth = {
  async signIn(params: { email: string; password: string }): Promise<Session> {
    const data = await postJSON<{ token: string; user: { id: string; role: Role } }>("/auth/login", params);
    return { userId: data.user.id, role: data.user.role, token: data.token };
  },
  async signUp(params: { email: string; password: string; name?: string }): Promise<Session> {
    const data = await postJSON<{ token: string; user: { id: string; role: Role } }>("/auth/signup", params);
    return { userId: data.user.id, role: data.user.role, token: data.token };
  },
  async getMe(token: string) {
    return getJSON<{ user: { id: string; role: Role } }>("/auth/me", token);
  },
  async signOut() {
    return true;
  },
  async getSession(): Promise<Session> {
    return null;
  },
};
