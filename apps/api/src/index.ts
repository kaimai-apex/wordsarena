import './load-env.js';
import { serve, type ServerType } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 3001);

const server: ServerType = serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} in use — run pnpm dev:stop first`);
    process.exit(1);
  }
  throw err;
});

function shutdown(signal: string) {
  console.log(`\nAPI shutting down (${signal})…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
