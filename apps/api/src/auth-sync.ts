import { eq } from 'drizzle-orm';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { generateIdFromEntropySize } from 'lucia';
import type { Database } from '@lexiform/db';
import { users, ratings } from '@lexiform/db';
import { newRating } from '@lexiform/rating';
import { deriveUsername, type AuthProvider } from '@lexiform/shared';

const TIME_CONTROLS = ['bullet', 'blitz', 'rapid', 'long'] as const;

function baseUsername(supabaseUser: SupabaseUser): string {
  const meta = supabaseUser.user_metadata as Record<string, unknown>;
  return deriveUsername({
    fullName: typeof meta.full_name === 'string' ? meta.full_name : null,
    name: typeof meta.name === 'string' ? meta.name : null,
    userName: typeof meta.user_name === 'string' ? meta.user_name : null,
    email: supabaseUser.email,
  });
}

function authProviderFromSupabase(supabaseUser: SupabaseUser): AuthProvider {
  const provider = supabaseUser.app_metadata?.provider;
  if (provider === 'google') return 'google';
  if (provider === 'email') return 'email';
  return 'google';
}

async function uniqueUsername(db: Database, base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 16)}_${i}`;
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!existing) return candidate;
  }
  return `player_${generateIdFromEntropySize(4)}`;
}

function avatarUrl(supabaseUser: SupabaseUser): string | null {
  const meta = supabaseUser.user_metadata as Record<string, unknown>;
  if (typeof meta.avatar_url === 'string') return meta.avatar_url;
  if (typeof meta.picture === 'string') return meta.picture;
  return null;
}

export async function syncSupabaseUser(db: Database, supabaseUser: SupabaseUser) {
  const supabaseUserId = supabaseUser.id;
  const email = supabaseUser.email ?? null;
  const avatar = avatarUrl(supabaseUser);
  const authProvider = authProviderFromSupabase(supabaseUser);

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseUserId, supabaseUserId))
    .limit(1);

  if (!user && email) {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      [user] = await db
        .update(users)
        .set({
          supabaseUserId,
          avatarUrl: avatar,
          authProvider,
          isAnonymous: false,
          emailVerified: true,
        })
        .where(eq(users.id, user.id))
        .returning();
    }
  }

  if (!user) {
    const username = await uniqueUsername(db, baseUsername(supabaseUser));
    [user] = await db
      .insert(users)
      .values({
        username,
        email,
        emailVerified: !!email,
        isAnonymous: false,
        supabaseUserId,
        avatarUrl: avatar,
        authProvider,
      })
      .returning();
  } else if (avatar && user.avatarUrl !== avatar) {
    [user] = await db
      .update(users)
      .set({ avatarUrl: avatar, authProvider })
      .where(eq(users.id, user.id))
      .returning();
  }

  const defaults = newRating();
  for (const timeControl of TIME_CONTROLS) {
    await db
      .insert(ratings)
      .values({
        userId: user!.id,
        timeControl,
        rating: defaults.rating,
        rd: defaults.rd,
        volatility: defaults.volatility,
      })
      .onConflictDoNothing();
  }

  const userRatings = await db.select().from(ratings).where(eq(ratings.userId, user!.id));

  return { user: user!, ratings: userRatings };
}
