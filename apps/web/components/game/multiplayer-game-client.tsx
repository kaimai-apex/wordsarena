'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  findCandidateWords,
  loadDictionaryClient,
  type GameState,
  type GridPosition,
  type Move,
  type WordDictionary,
} from '@lexiform/engine/browser';
import type { WSServerMessage } from '@lexiform/shared';
import { formatClock, parseServerGameState } from '@lexiform/shared';
import { MultiplayerBoard } from '@/components/game/multiplayer-board';
import { Button } from '@/components/ui/button';
import { api, ensureGuest, type UserProfile } from '@/lib/api';
import { useRealtime } from '@/lib/use-realtime';
import { cn } from '@/lib/utils';

type Phase = 'connecting' | 'ready' | 'countdown' | 'live' | 'over' | 'aborted' | 'error';

interface OpponentInfo {
  id: string;
  username: string;
}

export function MultiplayerGameClient({ gameId }: { gameId: string }) {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
  });
  const me = meData?.user;

  const [phase, setPhase] = useState<Phase>('connecting');
  const [state, setState] = useState<GameState | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [timeControl, setTimeControl] = useState<string>('blitz');
  const [isRated, setIsRated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState<'player' | 'spectator'>('player');
  const [lastClaim, setLastClaim] = useState<{ word: string; playerId: string; points: number } | null>(null);
  const [gameOver, setGameOver] = useState<{
    finalScores: Record<string, number>;
    winnerId: string | null;
    ratingChanges?: Record<string, number>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dict, setDict] = useState<WordDictionary | null>(null);
  const [flashWord, setFlashWord] = useState<string | null>(null);

  const handleWsMessage = useCallback(
    (msg: WSServerMessage) => {
      if (msg.type === 'game:joined') {
        if (msg.payload.gameId !== gameId) return;
        setTimeControl(msg.payload.timeControl);
        setIsRated(msg.payload.isRated);
        setReadyCount(msg.payload.readyCount);
        const myId = me?.id;
        if (myId) {
          const opp =
            myId === msg.payload.player1Id
              ? { id: msg.payload.player2Id, username: msg.payload.player2Username }
              : { id: msg.payload.player1Id, username: msg.payload.player1Username };
          setOpponent(opp);
          setRole(myId === msg.payload.player1Id || myId === msg.payload.player2Id ? 'player' : 'spectator');
        }
        if (msg.payload.state) {
          setState(parseServerGameState(msg.payload.state) as unknown as GameState);
        }
        if (msg.payload.status === 'live' && msg.payload.state) {
          const parsed = parseServerGameState(msg.payload.state as Record<string, unknown>) as unknown as GameState;
          setState(parsed);
          setPhase((parsed.startedAt as number) > 0 ? 'live' : 'countdown');
        } else if (msg.payload.status === 'waitingForReady') {
          setPhase('ready');
        } else if (msg.payload.status === 'finished') {
          setPhase('over');
        } else if (msg.payload.status === 'aborted') {
          setPhase('aborted');
        }
        return;
      }

      if (msg.type === 'game:countdown' && msg.payload.gameId === gameId) {
        setCountdown(msg.payload.secondsLeft);
        setPhase('countdown');
        return;
      }

      if (msg.type === 'game:state' && msg.payload.gameId === gameId) {
        setState(parseServerGameState(msg.payload.state as Record<string, unknown>) as unknown as GameState);
        setRole(msg.payload.role);
        setPhase('live');
        setCountdown(null);
        return;
      }

      if (msg.type === 'game:claimed' && msg.payload.gameId === gameId) {
        setLastClaim({
          word: msg.payload.word,
          playerId: msg.payload.playerId,
          points: msg.payload.points,
        });
        setFlashWord(msg.payload.word);
        setTimeout(() => setFlashWord(null), 600);
        return;
      }

      if (msg.type === 'game:over' && msg.payload.gameId === gameId) {
        setGameOver(msg.payload);
        setPhase('over');
        return;
      }

      if (msg.type === 'game:aborted' && msg.payload.gameId === gameId) {
        setPhase('aborted');
        setErrorMsg(msg.payload.reason);
        return;
      }

      if (msg.type === 'error') {
        setErrorMsg(msg.payload.message);
      }
    },
    [gameId, me?.id],
  );

  const { connect, send, connected } = useRealtime(handleWsMessage);

  useEffect(() => {
    void loadDictionaryClient('/dictionary.dict').then(setDict);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await ensureGuest();
        await connect();
        send({ type: 'game:join', payload: { gameId } });
      } catch (err) {
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      }
    })();
  }, [connect, gameId, send]);

  const claimable = useMemo(() => {
    if (!state || !dict || phase !== 'live') return null;
    const words = findCandidateWords(state.board, dict);
    return words[0] ?? null;
  }, [state, dict, phase]);

  const myScore = me?.id && state ? (state.scoresByPlayer[me.id] ?? 0) : 0;
  const oppScore = opponent?.id && state ? (state.scoresByPlayer[opponent.id] ?? 0) : 0;
  const timeLeft =
    state && state.durationMs !== Infinity
      ? Math.max(0, state.durationMs - state.elapsedMs)
      : null;

  const sendMove = useCallback(
    (move: Move) => {
      send({ type: 'game:move', payload: { gameId, move } });
    },
    [gameId, send],
  );

  const sendClaim = useCallback(
    (cells: GridPosition[]) => {
      send({ type: 'game:claim', payload: { gameId, wordCells: cells } });
    },
    [gameId, send],
  );

  const markReady = () => {
    send({ type: 'game:ready', payload: { gameId } });
    setIsReady(true);
  };

  const resign = () => {
    send({ type: 'game:resign', payload: { gameId } });
  };

  if (!me) {
    return <p className="p-8 text-muted">Loading account…</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 lg:flex-row">
      <aside className="order-2 w-full shrink-0 space-y-3 lg:order-1 lg:w-56">
        <PlayerPanel
          username={me.username}
          rating={me.ratings.find((r) => r.timeControl === timeControl)?.rating}
          score={myScore}
          active={phase === 'live'}
          isYou
        />
        <PlayerPanel
          username={opponent?.username ?? '…'}
          score={oppScore}
          active={phase === 'live'}
        />
        {phase === 'live' && role === 'player' && (
          <Button variant="danger" size="sm" className="w-full" onClick={resign}>
            Resign
          </Button>
        )}
        {lastClaim && (
          <p className="rounded bg-surface-2 px-3 py-2 text-sm text-muted">
            <span className="font-mono text-brand">{lastClaim.word}</span>{' '}
            +{lastClaim.points}
          </p>
        )}
      </aside>

      <div className="order-1 flex-1 lg:order-2">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">
          <span className="capitalize">
            {timeControl} · {isRated ? 'Rated' : 'Casual'}
          </span>
          {timeLeft !== null && phase === 'live' && (
            <span className="font-mono text-lg font-bold text-ink">{formatClock(timeLeft)}</span>
          )}
          <span className={cn('text-xs', connected ? 'text-brand' : 'text-danger')}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {phase === 'connecting' && (
          <div className="flex h-64 items-center justify-center rounded bg-surface-2 text-muted">
            Connecting to game…
          </div>
        )}

        {phase === 'ready' && (
          <div className="flex flex-col items-center gap-4 rounded bg-surface-2 py-16">
            <p className="text-lg text-ink">
              {opponent ? `vs ${opponent.username}` : 'Waiting for opponent…'}
            </p>
            <p className="text-sm text-muted">{readyCount}/2 players ready</p>
            {!isReady ? (
              <Button size="lg" onClick={markReady}>
                I&apos;m ready
              </Button>
            ) : (
              <p className="text-brand">Waiting for opponent to ready up…</p>
            )}
          </div>
        )}

        {phase === 'countdown' && (
          <div className="flex h-64 flex-col items-center justify-center rounded bg-surface-2">
            <p className="text-6xl font-bold text-brand">{countdown ?? 5}</p>
            <p className="mt-2 text-muted">Game starting</p>
          </div>
        )}

        {state && phase === 'live' && (
          <MultiplayerBoard
            state={state}
            playerId={me.id}
            disabled={role !== 'player'}
            onMove={sendMove}
            onClaim={sendClaim}
            claimableCells={claimable?.cells ?? null}
            flashWord={flashWord ?? claimable?.word ?? null}
          />
        )}

        {phase === 'over' && gameOver && (
          <div className="rounded bg-surface-2 p-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-ink">
              {gameOver.winnerId === me.id
                ? 'You won!'
                : gameOver.winnerId === opponent?.id
                  ? 'You lost'
                  : 'Draw'}
            </h2>
            <p className="mb-2 font-mono text-lg">
              {myScore} — {oppScore}
            </p>
            {gameOver.ratingChanges?.[me.id] !== undefined && (
              <p className="text-sm text-muted">
                Rating {gameOver.ratingChanges[me.id]! >= 0 ? '+' : ''}
                {Math.round(gameOver.ratingChanges[me.id]!)}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/">
                <Button>New game</Button>
              </Link>
              <Link href={`/u/${me.username}`}>
                <Button variant="secondary">Profile</Button>
              </Link>
            </div>
          </div>
        )}

        {(phase === 'aborted' || phase === 'error') && (
          <div className="rounded bg-surface-2 p-8 text-center">
            <p className="text-danger">{errorMsg || 'Game aborted'}</p>
            <Link href="/" className="mt-4 inline-block">
              <Button>Back to lobby</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerPanel({
  username,
  rating,
  score,
  active,
  isYou,
}: {
  username: string;
  rating?: number;
  score: number;
  active?: boolean;
  isYou?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded bg-surface-2 px-3 py-2',
        active && 'ring-1 ring-brand/50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">
          {username}
          {isYou && <span className="ml-1 text-xs text-muted">(you)</span>}
        </span>
        {rating !== undefined && (
          <span className="font-mono text-xs text-muted">{Math.round(rating)}</span>
        )}
      </div>
      <p className="font-mono text-2xl font-bold text-ink">{score}</p>
    </div>
  );
}
