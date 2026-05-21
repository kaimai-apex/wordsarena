const API_BASE = '/api';

export type UserRating = {
  timeControl: string;
  rating: number;
  rd: number;
  gamesPlayed: number;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
  authProvider: string | null;
  hasSupabaseAccount: boolean;
  ratings: UserRating[];
};

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
    const message = typeof err.error === 'string' ? err.error : res.statusText || 'Request failed';
    throw new Error(message);
  }
  return res.json();
}

export async function apiWithToken<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  return api<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

export async function ensureGuest() {
  const me = await api<{ user: UserProfile | null }>('/auth/me');
  if (!me.user) {
    await api('/auth/signup-anonymous', { method: 'POST' });
  }
}

export async function syncSupabaseSession(accessToken: string) {
  return apiWithToken<{ user: UserProfile }>('/auth/sync', accessToken, { method: 'POST' });
}

export async function getWsToken() {
  return api<{ token: string; expiresIn: number }>('/auth/ws-token');
}

export function ratingFor(user: UserProfile | null | undefined, timeControl: string): number | null {
  return user?.ratings.find((r) => r.timeControl === timeControl)?.rating ?? null;
}
