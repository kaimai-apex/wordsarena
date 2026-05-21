const path = require('path');
const { loadEnvConfig } = require('@next/env');

// Monorepo root .env (Supabase, DATABASE_URL, etc.)
loadEnvConfig(path.resolve(__dirname, '../..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  },
  transpilePackages: [
    '@lexiform/api',
    '@lexiform/db',
    '@lexiform/engine',
    '@lexiform/rating',
    '@lexiform/shared',
  ],
  experimental: {
    serverComponentsExternalPackages: ['postgres', 'drizzle-orm'],
  },
  async rewrites() {
    if (process.env.VERCEL) return [];
    // Local dev: use embedded Hono at app/api/[[...route]] (same code, root .env loaded).
    // Set USE_STANDALONE_API=true to proxy to apps/api on :3001 instead.
    if (process.env.USE_STANDALONE_API === 'true' && process.env.API_URL) {
      return [{ source: '/api/:path*', destination: `${process.env.API_URL}/:path*` }];
    }
    return [];
  },
};

module.exports = nextConfig;
