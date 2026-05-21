'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { api, type UserProfile } from '@/lib/api';

type ApiRating = {
  timeControl: string;
  rating: number;
  rd: number;
  gamesPlayed: number;
};

export default function ProfilePage({ username }: { username: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{ user: { username: string; id: string }; ratings: ApiRating[] }>(
        `/users/${encodeURIComponent(username)}`,
      ),
    retry: false,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
    retry: false,
  });

  if (isLoading) {
    return <p className="px-4 py-12 text-ink-soft">Loading profile…</p>;
  }

  if (error || !data) {
    return <p className="px-4 py-12 text-danger">Profile not found.</p>;
  }

  const isSelf = me?.user?.username === username;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="space-y-6">
        <div className="flex items-center gap-4">
          {isSelf && me?.user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.user.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-teal/20 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{data.user.username}</h1>
            {isSelf && me?.user?.hasSupabaseAccount && (
              <p className="text-sm text-ink-soft">Google account linked</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-ink">Ratings</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['bullet', 'blitz', 'rapid', 'long'] as const).map((tc) => {
              const row = data.ratings.find((r) => r.timeControl === tc);
              return (
                <div key={tc} className="rounded-bubble bg-white/60 px-3 py-2">
                  <p className="text-xs capitalize text-ink-soft">{tc}</p>
                  <p className="text-lg font-bold text-ink">{row ? Math.round(row.rating) : 1500}</p>
                  {row && row.gamesPlayed > 0 && (
                    <p className="text-xs text-ink-soft">{row.gamesPlayed} games</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
