/** Next.js inlines these at build time — read from apps/web code, not @lexiform/shared. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:3002';

export function isSupabaseReady(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
