import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createDb, users, sessions, games, dailyResults, ratings, tournaments, tournamentEntries, magicLinks } from '@lexiform/db';
import {
  createGame as createEngineGame,
  replayMoves,
  dailySeedForDate,
  loadDictionarySync,
} from '@lexiform/engine';
import {
  SoloGameCreateSchema,
  SoloGameFinalizeSchema,
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  UpgradeAnonymousSchema,
} from '@lexiform/shared';
import { generateIdFromEntropySize } from 'lucia';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { getWebUrl } from './web-url.js';

const db = createDb(process.env.DATABASE_URL ?? 'postgresql://lexiform:lexiform@localhost:5432/lexiform');

loadDictionarySync();

export const app = new Hono();

app.use('*', cors({
  origin: getWebUrl(),
  credentials: true,
}));

async function getSessionUser(c: { req: { header: (n: string) => string | undefined } }) {
  const sessionId = getCookie(c as never, 'lexiform_session');
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

function randomUsername(): string {
  return `player_${generateIdFromEntropySize(4)}`;
}

function engineDataPath(filename: string): string {
  const require = createRequire(import.meta.url);
  const engineRoot = dirname(require.resolve('@lexiform/engine/package.json'));
  return join(engineRoot, 'data', filename);
}

app.get('/health', (c) => c.json({ ok: true }));

app.get('/dictionary', (c) => {
  const text = readFileSync(engineDataPath('dictionary.txt'), 'utf-8');
  return c.text(text);
});

app.post('/auth/signup-anonymous', async (c) => {
  const [user] = await db.insert(users).values({
    username: randomUsername(),
    isAnonymous: true,
  }).returning();

  const sessionId = generateIdFromEntropySize(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: sessionId, userId: user!.id, expiresAt });

  setCookie(c, 'lexiform_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({ user: { id: user!.id, username: user!.username, isAnonymous: true } });
});

app.get('/auth/me', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ user: null });
  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified,
    },
  });
});

app.post('/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'lexiform_session');
  if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, 'lexiform_session', { path: '/' });
  return c.json({ ok: true });
});

app.post('/auth/request-magic-link', async (c) => {
  const body = MagicLinkRequestSchema.parse(await c.req.json());
  const token = generateIdFromEntropySize(32);
  await db.insert(magicLinks).values({
    token,
    email: body.email,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  console.log(`Magic link: ${getWebUrl()}/login?token=${token}`);
  return c.json({ ok: true });
});

app.post('/auth/verify-magic-link', async (c) => {
  const body = MagicLinkVerifySchema.parse(await c.req.json());
  const [link] = await db.select().from(magicLinks).where(eq(magicLinks.token, body.token)).limit(1);
  if (!link || link.expiresAt < new Date() || link.usedAt) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  let [user] = await db.select().from(users).where(eq(users.email, link.email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({
      username: link.email.split('@')[0]!.slice(0, 20),
      email: link.email,
      emailVerified: true,
      isAnonymous: false,
    }).returning();
  } else {
    await db.update(users).set({ emailVerified: true, isAnonymous: false }).where(eq(users.id, user.id));
  }

  await db.update(magicLinks).set({ usedAt: new Date() }).where(eq(magicLinks.token, body.token));

  const sessionId = generateIdFromEntropySize(32);
  await db.insert(sessions).values({
    id: sessionId,
    userId: user!.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  setCookie(c, 'lexiform_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({ user: { id: user!.id, username: user!.username } });
});

app.post('/auth/upgrade-anonymous', async (c) => {
  const user = await getSessionUser(c);
  if (!user?.isAnonymous) return c.json({ error: 'Not anonymous' }, 400);
  const body = UpgradeAnonymousSchema.parse(await c.req.json());
  await db.update(users).set({ email: body.email, isAnonymous: false }).where(eq(users.id, user.id));
  return c.json({ ok: true });
});

app.post('/games/solo', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = SoloGameCreateSchema.parse(await c.req.json());

  const seed = body.mode === 'daily' ? dailySeedForDate() : Math.floor(Math.random() * 1e9);
  const engineState = createEngineGame({ mode: body.mode, playerIds: [user.id], seed, now: Date.now() });

  const [game] = await db.insert(games).values({
    mode: body.mode,
    seed,
    durationMs: engineState.durationMs === Infinity ? 0 : engineState.durationMs,
    status: 'live',
    player1Id: user.id,
    startedAt: new Date(),
  }).returning();

  return c.json({ gameId: game!.id, seed, mode: body.mode, durationMs: engineState.durationMs });
});

app.post('/games/solo/:id/finalize', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const gameId = c.req.param('id');
  const body = SoloGameFinalizeSchema.parse(await c.req.json());

  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game || game.player1Id !== user.id) return c.json({ error: 'Not found' }, 404);

  const initial = createEngineGame({
    mode: game.mode as 'daily' | 'zen' | 'blitz_solo',
    playerIds: [user.id],
    seed: game.seed,
    now: game.startedAt?.getTime() ?? 0,
  });

  const finalState = replayMoves(initial, body.moves, loadDictionarySync());
  const computedScore = finalState.scoresByPlayer[user.id] ?? 0;

  if (computedScore !== body.finalScore) {
    return c.json({ error: 'Score mismatch', computedScore }, 400);
  }

  const wordCount = finalState.wordsClaimedByPlayer[user.id]?.length ?? 0;
  const maxCombo = Math.max(
    ...Object.values(finalState.comboState).map((combo) => (combo as { multiplier: number }).multiplier),
    1,
  );

  await db.update(games).set({
    status: 'finished',
    endedAt: new Date(),
    player1Score: computedScore,
    moves: body.moves,
    winnerId: user.id,
  }).where(eq(games.id, gameId));

  if (game.mode === 'daily') {
    const dateKey = new Date().toISOString().slice(0, 10);
    await db.insert(dailyResults).values({
      userId: user.id,
      dateKey,
      score: computedScore,
      wordCount,
      maxCombo,
      playedAt: new Date(),
    }).onConflictDoUpdate({
      target: [dailyResults.userId, dailyResults.dateKey],
      set: {
        score: sql`GREATEST(${dailyResults.score}, ${computedScore})`,
        wordCount,
        maxCombo,
        playedAt: new Date(),
      },
    });
  }

  return c.json({ ok: true, score: computedScore, wordCount });
});

app.get('/games/:id', async (c) => {
  const [game] = await db.select().from(games).where(eq(games.id, c.req.param('id'))).limit(1);
  if (!game) return c.json({ error: 'Not found' }, 404);
  return c.json({ game });
});

app.get('/daily/today', async (c) => {
  const seed = dailySeedForDate();
  const dateKey = new Date().toISOString().slice(0, 10);
  const leaderboard = await db
    .select({
      username: users.username,
      score: dailyResults.score,
      wordCount: dailyResults.wordCount,
    })
    .from(dailyResults)
    .innerJoin(users, eq(dailyResults.userId, users.id))
    .where(eq(dailyResults.dateKey, dateKey))
    .orderBy(desc(dailyResults.score))
    .limit(100);

  return c.json({ seed, dateKey, leaderboard });
});

app.get('/daily/today/me', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ played: false });
  const dateKey = new Date().toISOString().slice(0, 10);
  const [result] = await db
    .select()
    .from(dailyResults)
    .where(and(eq(dailyResults.userId, user.id), eq(dailyResults.dateKey, dateKey)))
    .limit(1);
  return c.json({ played: !!result, score: result?.score ?? null });
});

app.get('/users/:username', async (c) => {
  const [user] = await db.select().from(users).where(eq(users.username, c.req.param('username'))).limit(1);
  if (!user) return c.json({ error: 'Not found' }, 404);
  const userRatings = await db.select().from(ratings).where(eq(ratings.userId, user.id));
  return c.json({ user: { username: user.username, id: user.id }, ratings: userRatings });
});

app.get('/users/:username/games', async (c) => {
  const [user] = await db.select().from(users).where(eq(users.username, c.req.param('username'))).limit(1);
  if (!user) return c.json({ error: 'Not found' }, 404);
  const page = Number(c.req.query('page') ?? 1);
  const userGames = await db
    .select()
    .from(games)
    .where(sql`${games.player1Id} = ${user.id} OR ${games.player2Id} = ${user.id}`)
    .orderBy(desc(games.createdAt))
    .limit(20)
    .offset((page - 1) * 20);
  return c.json({ games: userGames });
});

app.get('/lobby/pools', (c) => c.json({ bullet: 0, blitz: 0, rapid: 0, long: 0 }));

app.get('/lobby/live', async (c) => {
  const live = await db.select().from(games).where(eq(games.status, 'live')).limit(20);
  return c.json({ games: live });
});

app.get('/tournaments', async (c) => {
  const list = await db.select().from(tournaments).orderBy(desc(tournaments.startsAt)).limit(20);
  return c.json({ tournaments: list });
});

app.get('/tournaments/:id', async (c) => {
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, c.req.param('id'))).limit(1);
  if (!tournament) return c.json({ error: 'Not found' }, 404);
  const entries = await db
    .select({ username: users.username, score: tournamentEntries.score })
    .from(tournamentEntries)
    .innerJoin(users, eq(tournamentEntries.userId, users.id))
    .where(eq(tournamentEntries.tournamentId, tournament.id))
    .orderBy(desc(tournamentEntries.score));
  return c.json({ tournament, leaderboard: entries });
});

app.post('/tournaments/:id/join', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  await db.insert(tournamentEntries).values({
    tournamentId: c.req.param('id'),
    userId: user.id,
  }).onConflictDoNothing();
  return c.json({ ok: true });
});
