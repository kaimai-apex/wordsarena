import { SoloGameClient } from '@/components/game/solo-game-client';

export default function ZenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">
        <span className="text-ink">Zen Mode</span>
      </h1>
      <SoloGameClient mode="zen" />
    </div>
  );
}
