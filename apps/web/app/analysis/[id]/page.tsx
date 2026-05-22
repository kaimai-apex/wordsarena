'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { api } from '@/lib/api';

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analysis', params.id],
    queryFn: () =>
      api<{
        game: { mode: string; player1Score: number | null; player2Score: number | null; moves: unknown[] };
        finalState: { scoresByPlayer: Record<string, number>; wordsClaimedByPlayer: Record<string, { word: string; points: number }[]> };
      }>(`/games/${params.id}/analysis`),
  });

  if (isLoading || !data) return <p className="p-8 text-muted">Loading analysis…</p>;

  const words = Object.values(data.finalState.wordsClaimedByPlayer).flat();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Game analysis" subtitle={`${data.game.moves.length} moves · ${data.game.mode}`} />
      <div className="mb-4 rounded bg-surface p-4 font-mono text-ink">
        Score: {data.game.player1Score ?? 0} — {data.game.player2Score ?? 0}
      </div>
      <h2 className="mb-2 text-sm font-bold uppercase text-muted">Words claimed</h2>
      <ul className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <li key={i} className="rounded bg-surface-2 px-3 py-1 text-sm">
            {w.word} <span className="text-brand">+{w.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
