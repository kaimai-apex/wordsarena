'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type UserProfile } from '@/lib/api';

type ApiRating = {
  timeControl: string;
  rating: number;
  rd: number;
  gamesPlayed: number;
};

type GameRow = {
  id: string;
  mode: string;
  timeControl: string | null;
  isRated: boolean;
  status: string;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  createdAt: string;
  player1Id: string;
  player2Id: string | null;
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

  const { data: gamesData } = useQuery({
    queryKey: ['profile-games', username],
    queryFn: () =>
      api<{ games: GameRow[] }>(`/users/${encodeURIComponent(username)}/games`),
    enabled: !!data,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', username],
    queryFn: () =>
      api<{
        games: { total: number; wins: number; losses: number };
        winRate: number;
        dailyBest: number;
      }>(`/users/${encodeURIComponent(username)}/insights`),
    enabled: !!data,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
    retry: false,
  });

  if (isLoading) {
    return <p className="px-4 py-12 text-muted">Loading profile…</p>;
  }

  if (error || !data) {
    return <p className="px-4 py-12 text-danger">Profile not found.</p>;
  }

  const isSelf = me?.user?.username === username;
  const games = gamesData?.games ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 rounded bg-surface p-6">
        <div className="flex items-center gap-4">
          {isSelf && me?.user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.user.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{data.user.username}</h1>
            {isSelf && me?.user?.hasSupabaseAccount && (
              <p className="text-sm text-muted">Registered player</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['bullet', 'blitz', 'rapid', 'long'] as const).map((tc) => {
            const row = data.ratings.find((r) => r.timeControl === tc);
            return (
              <div key={tc} className="rounded bg-surface-2 px-3 py-2 text-center">
                <p className="text-xs capitalize text-muted">{tc}</p>
                <p className="font-mono text-xl font-bold text-ink">
                  {row ? Math.round(row.rating) : 1500}
                </p>
                {row && row.gamesPlayed > 0 && (
                  <p className="text-xs text-muted">{row.gamesPlayed} games</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {insights && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Performance</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Games" value={insights.games.total} />
            <StatCard label="Wins" value={insights.games.wins} />
            <StatCard label="Win rate" value={insights.winRate} suffix="%" />
            <StatCard label="Daily best" value={insights.dailyBest} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Recent games
        </h2>
        {games.length === 0 ? (
          <p className="text-muted">No games yet.</p>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const isP1 = g.player1Id === data.user.id;
              const myScore = isP1 ? g.player1Score : g.player2Score;
              const oppScore = isP1 ? g.player2Score : g.player1Score;
              const won = g.winnerId === data.user.id;
              const lost = g.winnerId && g.winnerId !== data.user.id;
              return (
                <li key={g.id}>
                  <Link
                    href={g.mode === 'vs' ? `/game/${g.id}` : `/play/${g.mode === 'blitz_solo' ? 'blitz' : g.mode}`}
                    className="flex items-center justify-between rounded bg-surface px-4 py-3 hover:bg-surface-2"
                  >
                    <div>
                      <span className="capitalize text-ink">{g.mode.replace('_', ' ')}</span>
                      {g.timeControl && (
                        <span className="ml-2 text-xs text-muted">{g.timeControl}</span>
                      )}
                      {g.isRated && (
                        <span className="ml-1 text-xs text-brand">rated</span>
                      )}
                    </div>
                    <div className="text-right">
                      {myScore !== null && (
                        <span className="font-mono text-sm text-ink">
                          {myScore}
                          {oppScore !== null ? ` – ${oppScore}` : ''}
                        </span>
                      )}
                      {g.status === 'finished' && (
                        <span
                          className={
                            won ? 'ml-2 text-xs text-brand' : lost ? 'ml-2 text-xs text-danger' : 'ml-2 text-xs text-muted'
                          }
                        >
                          {won ? 'Win' : lost ? 'Loss' : 'Draw'}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded bg-surface px-3 py-2 text-center">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="font-mono text-xl font-bold text-ink">
        {value}
        {suffix}
      </p>
    </div>
  );
}
