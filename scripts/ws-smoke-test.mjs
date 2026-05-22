#!/usr/bin/env node
/**
 * WebSocket smoke test — requires dev server + realtime on :3002.
 * Usage: node scripts/ws-smoke-test.mjs [apiBase] [wsUrl]
 */

const apiBase = process.argv[2] ?? 'http://localhost:3000/api';
const wsUrl = process.argv[3] ?? process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:3002';

const jar = new Map();

function getCookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function saveCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jar.size ? { Cookie: getCookieHeader() } : {}),
      ...options.headers,
    },
  });
  saveCookies(res);
  return res.json();
}

function waitForMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS timeout')), timeoutMs);
    const handler = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.removeEventListener('message', handler);
          resolve(msg);
        }
      } catch {
        /* ignore */
      }
    };
    ws.addEventListener('message', handler);
  });
}

async function main() {
  console.log(`WS smoke test → ${wsUrl}\n`);

  await api('/auth/signup-anonymous', { method: 'POST' });
  const { token } = await api('/auth/ws-token');
  if (!token) {
    console.error('❌ No WS token from /auth/ws-token');
    process.exit(1);
  }

  const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const authOk = await waitForMessage(ws, (m) => m.type === 'auth:ok');
  console.log(`✅ auth:ok userId=${authOk.payload.userId}`);

  ws.send(JSON.stringify({ type: 'ping', payload: {} }));
  await waitForMessage(ws, (m) => m.type === 'pong');
  console.log('✅ ping/pong');

  ws.send(JSON.stringify({ type: 'queue:join', payload: { timeControl: 'blitz', isRated: false } }));
  const waiting = await waitForMessage(ws, (m) => m.type === 'queue:waiting');
  console.log(`✅ queue:waiting position=${waiting.payload.positionInPool}`);

  ws.send(JSON.stringify({ type: 'queue:leave', payload: {} }));
  await new Promise((r) => setTimeout(r, 200));
  console.log('✅ queue:leave');

  ws.close();
  console.log('\n✅ WS smoke test passed');
}

main().catch((err) => {
  console.error('❌ WS smoke test failed:', err.message);
  process.exit(1);
});
