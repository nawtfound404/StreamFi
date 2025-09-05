// Admin & Moderation wired to backend
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

async function post(path: string, body: unknown) {
  const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
  const csrfRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export const admin = {
  muteUser(userId: string) {
    return post('/admin/mute', { userId });
  },
  banUser(userId: string) {
    return post('/admin/ban', { userId });
  },
};
