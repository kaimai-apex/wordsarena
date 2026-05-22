import { MultiplayerGameClient } from '@/components/game/multiplayer-game-client';

export default function GamePage({ params }: { params: { id: string } }) {
  return <MultiplayerGameClient gameId={params.id} />;
}
