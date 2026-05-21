'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/card';
import { api, ensureGuest, getWsToken, ratingFor, type UserProfile } from '@/lib/api';
import { isSupabaseReady, realtimeUrl } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const TIME_CONTROLS = ['bullet', 'blitz', 'rapid', 'long'] as const;

async function hasSupabaseSession(): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  } catch {
    return false;
  }
}

export default function LobbyPage() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState('Idle');
  const [authError, setAuthError] = useState('');

  const { data: meData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
    retry: false,
  });

  const user = meData?.user ?? null;

  useEffect(() => {
    void (async () => {
      await new Promise((r) => setTimeout(r, 1200));
      const cached = queryClient.getQueryData<{ user: UserProfile | null }>(['me']);
      if (cached?.user) return;
      if (await hasSupabaseSession()) return;
      try {
        await ensureGuest();
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {
        // AuthSync or guest signup may still be in flight
      }
    })();
  }, [queryClient]);

  async function connect() {
    setAuthError('');
    try {
      const { token } = await getWsToken();
      const socket = new WebSocket(`${realtimeUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        setQueueStatus('Connected');
      };
      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'queue:waiting') {
          setQueueStatus(`Waiting… ~${msg.payload.etaSeconds}s`);
        }
        if (msg.type === 'queue:matched') {
          window.location.href = `/game/${msg.payload.gameId}`;
        }
        if (msg.type === 'error') {
          setAuthError(msg.payload.message ?? 'Queue error');
          setQueueStatus('Idle');
        }
      };
      socket.onclose = () => {
        setConnected(false);
        wsRef.current = null;
      };
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  function joinQueue(tc: (typeof TIME_CONTROLS)[number], isRated: boolean) {
    if (isRated && !user?.hasSupabaseAccount) {
      setAuthError('Sign in with Google to play rated games.');
      return;
    }

    setAuthError('');
    const sendJoin = () => {
      wsRef.current?.send(JSON.stringify({ type: 'queue:join', payload: { timeControl: tc, isRated } }));
      setQueueStatus(`Queued for ${isRated ? 'rated' : 'casual'} ${tc}…`);
    };

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      void connect().then(() => {
        setTimeout(sendJoin, 400);
      });
      return;
    }
    sendJoin();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-ink">Multiplayer Lobby</h1>
      <p className="mb-8 text-ink-soft">Race on a shared board. Claim words before your opponent.</p>

      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">
              {isLoading ? 'Loading…' : user?.username ?? 'Guest'}
            </p>
            {user?.hasSupabaseAccount ? (
              <p className="text-sm text-ink-soft">Signed in · rated play unlocked</p>
            ) : (
              <p className="text-sm text-ink-soft">
                Guest · <Link href="/login" className="text-accent underline">Sign in</Link> for rated
              </p>
            )}
          </div>
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-teal/20" />
          ) : null}
        </div>

        {user?.hasSupabaseAccount && user.ratings.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIME_CONTROLS.map((tc) => {
              const rating = ratingFor(user, tc);
              return (
                <div key={tc} className="rounded-bubble bg-white/60 px-3 py-2 text-center">
                  <p className="text-xs capitalize text-ink-soft">{tc}</p>
                  <p className="font-bold text-ink">{rating ?? 1500}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-semibold">Connection</span>
          <Badge variant={connected ? 'default' : 'rating'}>{connected ? 'Live' : 'Offline'}</Badge>
        </div>
        {!connected && (
          <Button onClick={() => void connect()} variant="ocean" className="w-full">
            Connect
          </Button>
        )}
        <p className="text-sm text-ink-soft">{queueStatus}</p>
        {authError && <p className="text-sm text-danger">{authError}</p>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {TIME_CONTROLS.map((tc) => (
          <Card key={tc} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold capitalize">{tc}</h2>
              {user?.hasSupabaseAccount && (
                <span className="text-sm text-ink-soft">{ratingFor(user, tc) ?? 1500}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => joinQueue(tc, false)}
                variant="secondary"
                className="flex-1"
              >
                Casual
              </Button>
              <Button
                size="sm"
                onClick={() => joinQueue(tc, true)}
                className="flex-1"
                disabled={!user?.hasSupabaseAccount}
              >
                Rated
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
