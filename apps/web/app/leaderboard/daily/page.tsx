import { Card } from '@/components/ui/card';
import { getSiteUrl } from '@/lib/site-url';

async function getLeaderboard() {
  try {
    const res = await fetch(`${getSiteUrl()}/api/daily/today`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DailyLeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">Daily Leaderboard</h1>
      <Card>
        {!data ? (
          <p className="text-ink-soft">Leaderboard unavailable — check DATABASE_URL on Vercel.</p>
        ) : data.leaderboard.length === 0 ? (
          <p className="text-ink-soft">No scores yet today — be the first!</p>
        ) : (
          <ol className="space-y-2">
            {data.leaderboard.map((entry: { username: string; score: number }, i: number) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-teal/5 px-4 py-2">
                <span className="font-semibold">
                  <span className="mr-2 font-mono text-teal">#{i + 1}</span>
                  {entry.username}
                </span>
                <span className="font-mono font-bold">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
