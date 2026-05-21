'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/card';
import { ensureGuest, api } from '@/lib/api';

const TIME_CONTROLS = ['bullet', 'blitz', 'rapid', 'long'] as const;

export default function LobbyPage() {
  const [connected, setConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string>('Idle');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    void ensureGuest();
  }, []);

  function connect() {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:3002';
    const socket = new WebSocket(url);
    socket.onopen = () => {
      setConnected(true);
      setInterval(() => socket.send(JSON.stringify({ type: 'ping', payload: {} })), 20000);
    };
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'queue:waiting') setQueueStatus(`Waiting… ~${msg.payload.etaSeconds}s`);
      if (msg.type === 'queue:matched') {
        window.location.href = `/game/${msg.payload.gameId}`;
      }
    };
    socket.onclose = () => setConnected(false);
    setWs(socket);
  }

  function joinQueue(tc: typeof TIME_CONTROLS[number], isRated: boolean) {
    if (!ws || ws.readyState !== WebSocket.OPEN) connect();
    setTimeout(() => {
      ws?.send(JSON.stringify({ type: 'queue:join', payload: { timeControl: tc, isRated } }));
      setQueueStatus(`Queued for ${tc}…`);
    }, 500);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-ink">Multiplayer Lobby</h1>
      <p className="mb-8 text-ink-soft">Race on a shared board. Claim words before your opponent.</p>

      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Connection</span>
          <Badge variant={connected ? 'default' : 'rating'}>{connected ? 'Live' : 'Offline'}</Badge>
        </div>
        {!connected && (
          <Button onClick={connect} variant="ocean" className="w-full">Connect</Button>
        )}
        <p className="text-sm text-ink-soft">{queueStatus}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {TIME_CONTROLS.map((tc) => (
          <Card key={tc} className="space-y-3">
            <h2 className="font-bold capitalize">{tc}</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => joinQueue(tc, false)} variant="secondary" className="flex-1">
                Casual
              </Button>
              <Button size="sm" onClick={() => joinQueue(tc, true)} className="flex-1">
                Rated
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
