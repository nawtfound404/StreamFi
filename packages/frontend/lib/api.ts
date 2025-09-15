// Resolve API base. Use env when provided; default to relative /api (Next.js rewrite proxies to backend in Docker).
// On the server (SSR) inside Docker, absolute http://backend:8000 can be constructed if needed later.
const rawBase = process.env.NEXT_PUBLIC_API_BASE || '/api';
export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : (path.startsWith('/api') ? path : `${API_BASE}${path}`);
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
  const text = await res.text();
  const json: unknown = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!res.ok) {
  throw new Error(typeof json === 'string' ? json : JSON.stringify(json));
  }
  return json as T;
}
