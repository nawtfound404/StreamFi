export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return text as any; } })();
  if (!res.ok) {
    throw new Error(typeof json === 'string' ? json : JSON.stringify(json));
  }
  return json as T;
}
