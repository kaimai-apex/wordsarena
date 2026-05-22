import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & { __lexiformDb?: DbInstance };

/** Shared Postgres pool — singleton in dev/serverless to avoid connection exhaustion. */
export function createDb(connectionString: string): DbInstance {
  if (globalForDb.__lexiformDb) return globalForDb.__lexiformDb;

  const max = Number(process.env.DB_POOL_MAX ?? 5);
  const client = postgres(connectionString, {
    max,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  const db = drizzle(client, { schema });
  globalForDb.__lexiformDb = db;
  return db;
}

export type Database = ReturnType<typeof createDb>;
export * from './schema.js';
