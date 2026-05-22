'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, ListRow } from '@/components/layout/page-header';
import { api } from '@/lib/api';

type LiveGame = {
  id: string;
  mode: string;
  timeControl: string | null;
  isRated: boolean;
  player1Score: number | null;
  player2Score: number | null;
  status: string;
};

export default function BroadcastPage() {
  const { data: broadcasts, isLoading: loadingBroadcasts } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () =>
      api<{ broadcasts: { id: string; title: string; description: string | null; isLive: boolean; featuredGameId: string | null; startsAt: string }[] }>(
        '/broadcasts',
      ),
  });

  const { data: live, isLoading: loadingLive } = useQuery({
    queryKey: ['lobby-live'],
    queryFn: () => api<{ games: LiveGame[] }>('/lobby/live'),
    refetchInterval: 10_000,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Broadcast"
        subtitle="Watch live games and see how top players perform."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Live now</h2>
        {loadingLive && <p className="text-muted">Loading live games…</p>}
        {!loadingLive && (live?.games.length ?? 0) === 0 && (
          <p className="text-muted">No live games right now. Check back soon.</p>
        )}
        <div className="space-y-2">
          {live?.games.map((g) => (
            <ListRow
              key={g.id}
              href={`/game/${g.id}`}
              title={`${g.timeControl ?? g.mode} ${g.isRated ? 'rated' : 'casual'}`}
              meta={
                g.player1Score !== null && g.player2Score !== null
                  ? `${g.player1Score} – ${g.player2Score}`
                  : 'In progress'
              }
              trailing={<span className="text-xs text-danger">LIVE</span>}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Featured</h2>
        {loadingBroadcasts && <p className="text-muted">Loading…</p>}
        <div className="space-y-2">
          {broadcasts?.broadcasts.map((b) => (
            <ListRow
              key={b.id}
              href={b.featuredGameId ? `/game/${b.featuredGameId}` : '/play'}
              title={b.title}
              meta={b.description ?? undefined}
              trailing={b.isLive ? <span className="text-xs text-danger">LIVE</span> : null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
