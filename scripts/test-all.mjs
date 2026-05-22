#!/usr/bin/env node
/**
 * Run unit tests + smoke + stress + WS smoke (requires dev server for integration).
 * Usage: node scripts/test-all.mjs
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: true });
  return r.status ?? 1;
}

console.log('═══ Unit tests ═══\n');
if (run('pnpm', ['test']) !== 0) process.exit(1);

console.log('\n═══ Smoke test (needs pnpm dev) ═══\n');
const smoke = run('node', ['scripts/smoke-test.mjs']);
if (smoke !== 0) {
  console.error('\n⚠️  Smoke failed — is pnpm dev running on :3000?');
  process.exit(1);
}

console.log('\n═══ Stress test ═══\n');
if (run('node', ['scripts/stress-test.mjs']) !== 0) process.exit(1);

console.log('\n═══ WS smoke test ═══\n');
const wsSmoke = run('node', ['scripts/ws-smoke-test.mjs']);
if (wsSmoke !== 0) {
  console.error('\n⚠️  WS smoke failed — is realtime running on :3002?');
  process.exit(1);
}

console.log('\n✅ All tests passed');
