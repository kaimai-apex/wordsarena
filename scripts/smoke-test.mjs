#!/usr/bin/env node
/**
 * API smoke test — requires dev server at :3000.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const base = process.argv[2] ?? 'http://localhost:3000/api';

const jar = new Map();
let username = '';

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

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jar.size ? { Cookie: getCookieHeader() } : {}),
      ...options.headers,
    },
  });
  saveCookies(res);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, ok: res.ok };
}

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log(`Smoke testing ${base}\n`);

  ok('GET /health', (await request('/health')).status === 200);
  ok('GET /dictionary', (await request('/dictionary')).body?.wordCount > 0);

  ok('GET /auth/me (anonymous)', (await request('/auth/me')).status === 200);

  const guest = await request('/auth/signup-anonymous', { method: 'POST' });
  ok('POST /auth/signup-anonymous', guest.status === 200 && guest.body?.user?.id);
  username = guest.body?.user?.username ?? '';

  ok('GET /auth/ws-token', (await request('/auth/ws-token')).body?.token);

  if (username) {
    ok('GET /users/:username', (await request(`/users/${username}`)).status === 200);
    ok('GET /users/:username/games', Array.isArray((await request(`/users/${username}/games`)).body?.games));
    ok('GET /users/:username/insights', (await request(`/users/${username}/insights`)).body?.games);
  }

  const solo = await request('/games/solo', { method: 'POST', body: JSON.stringify({ mode: 'zen' }) });
  ok('POST /games/solo', solo.body?.gameId);
  if (solo.body?.gameId) {
    ok('POST /games/solo/:id/finalize', (await request(`/games/solo/${solo.body.gameId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ moves: [], finalScore: 0 }),
    })).body?.ok);
  }

  ok('GET /daily/today', (await request('/daily/today')).body?.dateKey);
  ok('GET /lobby/pools', (await request('/lobby/pools')).status === 200);
  ok('GET /lobby/live', Array.isArray((await request('/lobby/live')).body?.games));
  ok('GET /broadcasts', Array.isArray((await request('/broadcasts')).body?.broadcasts));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
