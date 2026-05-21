/** @type {import('next').NextConfig} */
const nextConfig = {
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
    if (process.env.API_URL) {
      return [{ source: '/api/:path*', destination: `${process.env.API_URL}/:path*` }];
    }
    return [];
  },
};

module.exports = nextConfig;
