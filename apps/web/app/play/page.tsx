'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ensureGuest, getWsToken, ratingFor, type UserProfile } from '@/lib/api';
import { isSupabaseReady, realtimeUrl } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const TIME_CONTROLS = [
  { key: 'bullet' as const, label: 'Bullet', time: '30s' },
  { key: 'blitz' as const, label: 'Blitz', time: '1 min' },
  { key: 'rapid' as const, label: 'Rapid', time: '2 min' },
  { key: 'long' as const, label: 'Long', time: '3 min' },
];

const SOLO_MODES = [
  { href: '/play/daily', title: 'Daily', desc: 'One board per day — compete on the leaderboard' },
  { href: '/play/zen', title: 'Zen', desc: 'No clock — practice at your pace' },
  { href: '/play/blitz', title: 'Blitz solo', desc: '60 seconds — chase a high score' },
];

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

export default function PlayPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [queueStatus, setQueueStatus] = useState('');
  const [authError, setAuthError] = useState('');

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
    retry: false,
  });
  const user = meData?.user;

  useEffect(() => {
    void (async () => {
      await new Promise((r) => setTimeout(r, 800));
      const cached = queryClient.getQueryData<{ user: UserProfile | null }>(['me']);
      if (cached?.user) return;
      if (await hasSupabaseSession()) return;
      try {
        await ensureGuest();
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {
        // guest signup in flight
      }
    })();
  }, [queryClient]);

  async function connectWs() {
    const { token } = await getWsToken();
    const socket = new WebSocket(`${realtimeUrl}?token=${encodeURIComponent(token)}`);
    wsRef.current = socket;
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'queue:waiting') {
        setQueueStatus(`Searching… ~${msg.payload.etaSeconds}s`);
      }
      if (msg.type === 'queue:matched') {
        router.push(`/game/${msg.payload.gameId}`);
      }
      if (msg.type === 'error') {
        setAuthError(msg.payload.message ?? 'Queue error');
        setQueueStatus('');
      }
    };
    await new Promise<void>((resolve, reject) => {
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error('Connection failed'));
    });
  }

  async function quickPlay(tc: (typeof TIME_CONTROLS)[number]['key'], isRated: boolean) {
    if (isRated && !user?.hasSupabaseAccount) {
      setAuthError('Sign in for rated games.');
      return;
    }
    setAuthError('');
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectWs();
      }
      wsRef.current?.send(
        JSON.stringify({ type: 'queue:join', payload: { timeControl: tc, isRated } }),
      );
      setQueueStatus(`Finding ${isRated ? 'rated' : 'casual'} ${tc} opponent…`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">Play</h1>
        <p className="mt-1 text-muted">
          Ranked or casual — pick a time control and find an opponent.
        </p>
      </div>

      {authError && <p className="mb-4 text-sm text-danger">{authError}</p>}
      {queueStatus && <p className="mb-4 text-sm text-brand">{queueStatus}</p>}

      <section className="mb-8 rounded bg-surface p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Multiplayer</h2>
        <div className="space-y-2">
          {TIME_CONTROLS.map(({ key, label, time }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded bg-surface-2 px-3 py-2"
            >
              <div>
                <span className="font-semibold text-ink">{label}</span>
                <span className="ml-2 text-sm text-muted">{time}</span>
                {user?.hasSupabaseAccount && (
                  <span className="ml-2 font-mono text-xs text-brand">
                    {ratingFor(user, key) ?? 1500}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void quickPlay(key, false)}
                  className="rounded bg-surface px-3 py-1 text-sm text-ink hover:bg-background"
                >
                  Casual
                </button>
                <button
                  type="button"
                  onClick={() => void quickPlay(key, true)}
                  disabled={!user?.hasSupabaseAccount}
                  className={cn(
                    'rounded px-3 py-1 text-sm font-semibold',
                    user?.hasSupabaseAccount
                      ? 'bg-brand text-white hover:bg-brand-bright'
                      : 'cursor-not-allowed bg-surface text-muted',
                  )}
                >
                  Rated
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded bg-surface p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Solo modes</h2>
        <p className="mb-3 text-sm text-muted">More word game types coming soon.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SOLO_MODES.map(({ href, title, desc }) => (
            <Link key={href} href={href} className="block rounded bg-surface-2 px-3 py-3 hover:bg-background">
              <span className="font-semibold text-ink">{title}</span>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
