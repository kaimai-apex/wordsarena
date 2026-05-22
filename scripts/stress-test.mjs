#!/usr/bin/env node
/**
 * Stress test — concurrent requests against local API.
 * Usage: node scripts/stress-test.mjs [baseUrl] [concurrency]
 */
const base = process.argv[2] ?? 'http://localhost:3000/api';
const concurrency = Math.min(Number(process.argv[3] ?? 20), 100);

async function hit(path, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return { ok: res.ok, status: res.status, ms: performance.now() - start };
  } catch (err) {
    return { ok: false, status: 0, ms: performance.now() - start, error: err.message };
  }
}

async function stress(name, fn, rounds = concurrency) {
  const results = await Promise.all(Array.from({ length: rounds }, fn));
  const okCount = results.filter((r) => r.ok).length;
  const avgMs = results.reduce((s, r) => s + r.ms, 0) / results.length;
  const maxMs = Math.max(...results.map((r) => r.ms));
  console.log(`${okCount === rounds ? '✅' : '❌'} ${name}: ${okCount}/${rounds} ok · avg ${avgMs.toFixed(0)}ms · max ${maxMs.toFixed(0)}ms`);
  return okCount === rounds;
}

async function main() {
  console.log(`Stress testing ${base} (${concurrency} concurrent)\n`);

  if (!(await hit('/health')).ok) {
    console.error('❌ Server not reachable — start with pnpm dev');
    process.exit(1);
  }

  let allOk = true;
  allOk &&= await stress('GET /health', () => hit('/health'));
  allOk &&= await stress('GET /lobby/pools', () => hit('/lobby/pools'));
  allOk &&= await stress('GET /lobby/live', () => hit('/lobby/live'));
  allOk &&= await stress('GET /broadcasts', () => hit('/broadcasts'));
  allOk &&= await stress('GET /dictionary', () => hit('/dictionary'));

  console.log(allOk ? '\n✅ Stress test passed' : '\n❌ Stress test had failures');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
