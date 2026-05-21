#!/usr/bin/env node
/**
 * Smoke test for local API (embedded Next at :3000 or standalone at :3001).
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const base = process.argv[2] ?? 'http://localhost:3000/api';

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
  const single = res.headers.get('set-cookie');
  if (single && !raw.length) {
    const [pair] = single.split(';');
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
  return { status: res.status, body };
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

  const health = await request('/health');
  ok('GET /health', health.status === 200 && health.body?.ok === true, `status ${health.status}`);

  const me0 = await request('/auth/me');
  ok('GET /auth/me (anonymous)', me0.status === 200, `status ${me0.status}`);

  const guest = await request('/auth/signup-anonymous', { method: 'POST' });
  ok('POST /auth/signup-anonymous', guest.status === 200 && guest.body?.user?.id, `status ${guest.status}`);

  const me1 = await request('/auth/me');
  ok('GET /auth/me (guest cookie)', me1.status === 200 && me1.body?.user?.username, `status ${me1.status}`);

  const ws = await request('/auth/ws-token');
  ok('GET /auth/ws-token', ws.status === 200 && ws.body?.token, `status ${ws.status}`);

  if (me1.body?.user?.username) {
    const profile = await request(`/users/${me1.body.user.username}`);
    ok('GET /users/:username', profile.status === 200 && profile.body?.ratings, `status ${profile.status}`);
  }

  const sync = await request('/auth/sync', {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid-token' },
  });
  ok('POST /auth/sync rejects bad token', sync.status === 401, `status ${sync.status}`);

  const daily = await request('/daily/today');
  ok('GET /daily/today', daily.status === 200 && daily.body?.dateKey, `status ${daily.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
