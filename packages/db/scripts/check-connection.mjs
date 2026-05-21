import postgres from 'postgres';
import { loadRootEnv } from './load-root-env.mjs';

loadRootEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

let host;
try {
  host = new URL(url.replace(/^postgresql:\/\//, 'http://')).hostname;
} catch {
  console.error('❌ DATABASE_URL is not a valid URL');
  process.exit(1);
}

if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
  console.error('❌ Direct host db.*.supabase.co is IPv6-only and often fails with ENOTFOUND.');
  console.error('   In Supabase → Connect → choose Session pooler → copy the URI instead.');
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 15 });
try {
  await sql`select 1 as ok`;
  console.log('✅ Database connection OK');
  console.log(`   host: ${host}`);
} catch (err) {
  const msg = String(err.message ?? err);
  console.error('❌ Database connection failed:', msg);
  console.error('');
  if (msg.includes('password authentication failed')) {
    console.error('   ✅ Host/region look correct — the DATABASE PASSWORD is wrong.');
    console.error('   1. Supabase → Connect → Reset database password');
    console.error('   2. Pick a password without special chars (easiest), or URL-encode them ($ → %24)');
    console.error('   3. Update DATABASE_URL in .env');
  } else if (msg.includes('Tenant or user not found')) {
    console.error('   Wrong pooler region or project ref in the connection string.');
    console.error('   Copy the exact URI from Supabase → Connect → Session pooler → URI');
    console.error('   (Your host should look like aws-1-us-west-1.pooler.supabase.com — copy, don\'t guess)');
  } else if (msg.includes('ENOTFOUND') && host.startsWith('db.')) {
    console.error('   Direct db.*.supabase.co is IPv6-only. Use Session pooler URI instead.');
  }
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
