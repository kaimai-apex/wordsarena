import './load-env.js';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { createDb, users, sessions, ratings, type Database } from '@lexiform/db';
import { getSupabaseUserFromAccessToken } from './supabase.js';
import { syncSupabaseUser } from './auth-sync.js';

const db: Database = createDb(process.env.DATABASE_URL ?? 'postgresql://lexiform:lexiform@localhost:5432/lexiform');

export function getBearerToken(c: Context): string | null {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export async function getSessionUser(c: Context) {
  const sessionId = getCookie(c, 'lexiform_session');
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

export async function getAuthenticatedUser(c: Context) {
  const sessionUser = await getSessionUser(c);
  if (sessionUser) return sessionUser;

  const accessToken = getBearerToken(c);
  if (!accessToken) return null;

  const supabaseUser = await getSupabaseUserFromAccessToken(accessToken);
  if (!supabaseUser) return null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseUserId, supabaseUser.id))
    .limit(1);
  if (existing) return existing;

  const { user } = await syncSupabaseUser(db, supabaseUser);
  return user;
}

export async function getUserRatings(userId: string) {
  return db.select().from(ratings).where(eq(ratings.userId, userId));
}

export function publicUserProfile(user: typeof users.$inferSelect, userRatings: (typeof ratings.$inferSelect)[]) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isAnonymous: user.isAnonymous,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    hasSupabaseAccount: !!user.supabaseUserId,
    ratings: userRatings.map((r) => ({
      timeControl: r.timeControl,
      rating: Math.round(r.rating),
      rd: Math.round(r.rd),
      gamesPlayed: r.gamesPlayed,
    })),
  };
}

export { db };
