#!/usr/bin/env node
/**
 * Seed broadcast content.
 * Usage: node packages/db/scripts/seed-platform.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
if (existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[trimmed.slice(0, eq).trim()] = val;
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  console.log('Seeding platform…');
  const startsAt = new Date();
  await sql`
    INSERT INTO broadcasts (title, description, is_live, starts_at)
    SELECT 'Featured live games', 'Watch top-rated matches in real time', true, ${startsAt}
    WHERE NOT EXISTS (SELECT 1 FROM broadcasts WHERE title = 'Featured live games')
  `;
  console.log('✅ Platform seed complete');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
