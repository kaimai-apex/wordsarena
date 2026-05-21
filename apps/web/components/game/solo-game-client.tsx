'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameBoard } from '@/components/game/game-board';
import { ensureGuest, api } from '@/lib/api';
import type { GameMode, GameState, Move } from '@lexiform/engine/browser';

interface SoloGameClientProps {
  mode: GameMode;
}

export function SoloGameClient({ mode }: SoloGameClientProps) {
  const [playerId, setPlayerId] = useState<string>('local-player');
  const [gameId, setGameId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await ensureGuest();
        const me = await api<{ user: { id: string } }>('/auth/me');
        setPlayerId(me.user.id);
        const game = await api<{ gameId: string }>('/games/solo', {
          method: 'POST',
          body: JSON.stringify({ mode }),
        });
        setGameId(game.gameId);
      } catch {
        // API offline — solo play still works client-side
        setPlayerId(`local-${mode}`);
      } finally {
        setReady(true);
      }
    })();
  }, [mode]);

  const handleNewGame = useCallback(async () => {
    setFinalizing(false);
    try {
      const game = await api<{ gameId: string }>('/games/solo', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      setGameId(game.gameId);
    } catch {
      /* offline — client-only reset is enough */
    }
  }, [mode]);

  const handleGameOver = useCallback(
    async (state: GameState, moves: Move[]) => {
      if (!gameId || finalizing) return;
      setFinalizing(true);
      const score = state.scoresByPlayer[playerId] ?? 0;
      try {
        await api(`/games/solo/${gameId}/finalize`, {
          method: 'POST',
          body: JSON.stringify({ moves, finalScore: score }),
        });
      } catch {
        /* score save optional when API is down */
      }
    },
    [gameId, playerId, finalizing],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <GameBoard
      mode={mode}
      playerId={playerId}
      onGameOver={handleGameOver}
      onNewGame={handleNewGame}
    />
  );
}
