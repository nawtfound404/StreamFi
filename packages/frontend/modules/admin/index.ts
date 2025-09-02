// Admin & Moderation wired to backend
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

async function post(path: string, body: unknown) {
  const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export const admin = {
  muteUser(userId: string) {
    if (!API_BASE) return true;
    return post('/admin/mute', { userId });
  },
  banUser(userId: string) {
    if (!API_BASE) return true;
    return post('/admin/ban', { userId });
  },
};
