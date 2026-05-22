'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WSServerMessage, WSMessage } from '@lexiform/shared';
import { getWsToken } from '@/lib/api';
import { realtimeUrl } from '@/lib/env';

type MessageHandler = (msg: WSServerMessage) => void;

export function useRealtime(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current;
    if (connecting) return wsRef.current;
    setConnecting(true);
    try {
      const { token } = await getWsToken();
      const socket = new WebSocket(`${realtimeUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = socket;
      await new Promise<void>((resolve, reject) => {
        socket.onopen = () => {
          setConnected(true);
          setConnecting(false);
          resolve();
        };
        socket.onerror = () => {
          setConnecting(false);
          reject(new Error('WebSocket connection failed'));
        };
        socket.onclose = () => {
          setConnected(false);
          wsRef.current = null;
        };
        socket.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data) as WSServerMessage;
            handlerRef.current?.(msg);
          } catch {
            // ignore malformed frames
          }
        };
      });
      return socket;
    } catch (err) {
      setConnecting(false);
      throw err;
    }
  }, [connecting]);

  const send = useCallback((msg: WSMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return { connect, send, connected, connecting, ws: wsRef };
}
