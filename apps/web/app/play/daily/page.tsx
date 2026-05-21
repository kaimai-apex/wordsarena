import { SoloGameClient } from '@/components/game/solo-game-client';

export default function DailyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">
        <span className="text-ink">Daily Puzzle</span>
      </h1>
      <SoloGameClient mode="daily" />
    </div>
  );
}
