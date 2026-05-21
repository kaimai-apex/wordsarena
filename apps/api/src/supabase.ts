import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@lexiform/shared';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  if (!adminClient) {
    adminClient = createClient(env.url, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function getSupabaseUserFromAccessToken(
  accessToken: string,
): Promise<SupabaseUser | null> {
  const env = getSupabaseEnv();
  if (!env) return null;

  const client = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}
