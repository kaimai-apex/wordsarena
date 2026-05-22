import { Hono } from 'hono';
import { eq, desc, or, sql } from 'drizzle-orm';
import { broadcasts, games, users, dailyResults } from '@lexiform/db';
import { createGame, replayMoves, loadDictionarySync } from '@lexiform/engine';
import { db } from '../auth-request.js';

loadDictionarySync();

export const platformApp = new Hono();

platformApp.get('/broadcasts', async (c) => {
  const list = await db.select().from(broadcasts).orderBy(desc(broadcasts.startsAt)).limit(20);
  return c.json({ broadcasts: list });
});

platformApp.get('/games/:id/analysis', async (c) => {
  const [game] = await db.select().from(games).where(eq(games.id, c.req.param('id'))).limit(1);
  if (!game) return c.json({ error: 'Not found' }, 404);
  const playerIds = [game.player1Id!, game.player2Id ?? game.player1Id!].filter(Boolean) as string[];
  const initial = createGame({
    mode: game.mode === 'vs' ? 'vs' : (game.mode as 'daily' | 'zen' | 'blitz_solo'),
    playerIds,
    seed: game.seed,
    now: game.startedAt?.getTime() ?? 0,
  });
  const finalState = replayMoves(initial, game.moves as never[], loadDictionarySync());
  return c.json({ game, finalState });
});

platformApp.get('/users/:username/insights', async (c) => {
  const [user] = await db.select().from(users).where(eq(users.username, c.req.param('username'))).limit(1);
  if (!user) return c.json({ error: 'Not found' }, 404);
  const [gameStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${games.winnerId} = ${user.id})::int`,
    })
    .from(games)
    .where(or(eq(games.player1Id, user.id), eq(games.player2Id, user.id)));
  const [dailyBest] = await db
    .select({ best: sql<number>`max(${dailyResults.score})::int` })
    .from(dailyResults)
    .where(eq(dailyResults.userId, user.id));
  const total = gameStats?.total ?? 0;
  const wins = gameStats?.wins ?? 0;
  return c.json({
    games: { total, wins, losses: total - wins },
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    dailyBest: dailyBest?.best ?? 0,
  });
});
