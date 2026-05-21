const API_BASE = '/api';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export async function ensureGuest() {
  const me = await api<{ user: { id: string } | null }>('/auth/me');
  if (!me.user) {
    await api('/auth/signup-anonymous', { method: 'POST' });
  }
}
