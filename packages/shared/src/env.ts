export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export type WsJwtEnv = {
  secret: string;
};

/** Returns Supabase client env vars when all are set; null if any are missing. */
export function getSupabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseEnv | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

/** True when browser/client Supabase env vars are present. */
export function isSupabaseClientConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** True when all Supabase env vars required for server auth are present. */
export function isSupabaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSupabaseEnv(env) !== null;
}

/** Returns WS JWT secret when set; null otherwise. */
export function getWsJwtSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.WS_JWT_SECRET ?? null;
}

/** Lists missing Supabase-related env var names (for startup logs / diagnostics). */
export function missingSupabaseEnvVars(env: NodeJS.ProcessEnv = process.env): string[] {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;
  return required.filter((key) => !env[key]);
}
