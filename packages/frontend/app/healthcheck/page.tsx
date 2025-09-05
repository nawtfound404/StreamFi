async function getHealth() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

export default async function HealthPage() {
  const health = await getHealth();
  return (
    <main>
      <h1>Backend Health</h1>
      <p>Status: {health.ok ? `UP (${health.status})` : 'DOWN'}</p>
      <pre>{JSON.stringify(health.data, null, 2)}</pre>
    </main>
  );
}