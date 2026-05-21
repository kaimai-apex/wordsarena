import './load-env.js';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { eq, and, sql } from 'drizzle-orm';
import { createDb, sessions, users, games, ratings } from '@lexiform/db';
import { verifyWsToken } from '@lexiform/shared';
import {
  createGame,
  applyMove,
  claimWord,
  tick,
  resign,
  loadDictionarySync,
  TIME_CONTROL_MS,
  type GameState,
  type Move,
  type TimeControl,
} from '@lexiform/engine';
import { updateRating, newRating } from '@lexiform/rating';
import type { WSMessage, WSServerMessage } from '@lexiform/shared';
import { randomUUID } from 'node:crypto';

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return [];
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      return key ? [[key, decodeURIComponent(value)]] : [];
    }),
  );
}

const db = createDb(process.env.DATABASE_URL ?? 'postgresql://lexiform:lexiform@localhost:5432/lexiform');
loadDictionarySync();

interface AuthUser {
  id: string;
  username: string;
  isAnonymous: boolean;
  supabaseUserId: string | null;
}

interface PoolEntry {
  userId: string;
  username: string;
  rating: number;
  rd: number;
  timeControl: TimeControl;
  isRated: boolean;
  queueEnteredAt: number;
  socket: WebSocket;
}

interface LiveGame {
  id: string;
  state: GameState;
  player1Id: string;
  player2Id: string;
  timeControl: TimeControl;
  isRated: boolean;
  moves: Move[];
  ready: Set<string>;
  sockets: Map<string, WebSocket>;
  spectators: Set<WebSocket>;
  status: 'waitingForReady' | 'live' | 'finished' | 'aborted';
  disconnectTimers: Map<string, NodeJS.Timeout>;
}

const pools = new Map<string, PoolEntry[]>();
const liveGames = new Map<string, LiveGame>();
const userSockets = new Map<string, WebSocket>();

function poolKey(tc: TimeControl, rated: boolean) {
  return `${tc}:${rated ? 'rated' : 'casual'}`;
}

function send(ws: WebSocket, msg: WSServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function bandWidth(seconds: number, isRated: boolean): number {
  let band: number;
  if (seconds < 10) band = 50;
  else if (seconds < 20) band = 100;
  else if (seconds < 40) band = 200;
  else if (seconds < 60) band = 400;
  else band = Infinity;
  return isRated ? band : band * 2;
}

function rdsCompatible(p1: PoolEntry, p2: PoolEntry, waitedSec: number): boolean {
  if (waitedSec >= 30) return true;
  return Math.abs(p1.rd - p2.rd) < 200;
}

function serializeState(state: GameState) {
  return {
    ...state,
    claimedCells: [...state.claimedCells],
    claimedWords: [...state.claimedWords],
  };
}

function broadcastGame(game: LiveGame, msg: WSServerMessage) {
  for (const ws of game.sockets.values()) send(ws, msg);
  for (const ws of game.spectators) send(ws, msg);
}

async function authenticateCookie(cookieHeader: string | undefined): Promise<AuthUser | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);
  const sessionId = cookies.lexiform_session;
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    isAnonymous: user.isAnonymous,
    supabaseUserId: user.supabaseUserId,
  };
}

async function authenticateWsToken(token: string): Promise<AuthUser | null> {
  const payload = await verifyWsToken(token);
  if (!payload) return null;
  const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    isAnonymous: user.isAnonymous,
    supabaseUserId: user.supabaseUserId,
  };
}

async function authenticateConnection(reqUrl: string | undefined, cookieHeader: string | undefined): Promise<AuthUser | null> {
  if (reqUrl) {
    try {
      const parsed = new URL(reqUrl, 'http://localhost');
      const token = parsed.searchParams.get('token');
      if (token) {
        const fromToken = await authenticateWsToken(token);
        if (fromToken) return fromToken;
      }
    } catch {
      // ignore malformed URL
    }
  }
  return authenticateCookie(cookieHeader);
}

async function getUserRating(userId: string, tc: TimeControl) {
  const [r] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.timeControl, tc)))
    .limit(1);
  if (r) return { rating: r.rating, rd: r.rd, volatility: r.volatility };
  return newRating();
}

async function createMultiplayerGame(p1: PoolEntry, p2: PoolEntry) {
  const gameId = randomUUID();
  const seed = Date.now() % 1_000_000_000;
  const state = createGame({
    mode: 'vs',
    playerIds: [p1.userId, p2.userId],
    seed,
    timeControl: p1.timeControl,
    now: Date.now(),
  });

  await db.insert(games).values({
    id: gameId,
    mode: 'vs',
    timeControl: p1.timeControl,
    isRated: p1.isRated,
    seed,
    durationMs: TIME_CONTROL_MS[p1.timeControl],
    status: 'created',
    player1Id: p1.userId,
    player2Id: p2.userId,
  });

  const game: LiveGame = {
    id: gameId,
    state,
    player1Id: p1.userId,
    player2Id: p2.userId,
    timeControl: p1.timeControl,
    isRated: p1.isRated,
    moves: [],
    ready: new Set(),
    sockets: new Map([
      [p1.userId, p1.socket],
      [p2.userId, p2.socket],
    ]),
    spectators: new Set(),
    status: 'waitingForReady',
    disconnectTimers: new Map(),
  };

  liveGames.set(gameId, game);

  send(p1.socket, {
    type: 'queue:matched',
    payload: { gameId, opponent: { id: p2.userId, username: p2.username, isAnonymous: false }, timeControl: p1.timeControl },
  });
  send(p2.socket, {
    type: 'queue:matched',
    payload: { gameId, opponent: { id: p1.userId, username: p1.username, isAnonymous: false }, timeControl: p1.timeControl },
  });

  setTimeout(() => {
    if (game.status === 'waitingForReady' && game.ready.size < 2) {
      game.status = 'aborted';
      broadcastGame(game, { type: 'game:aborted', payload: { gameId, reason: 'ready_timeout' } });
      liveGames.delete(gameId);
    }
  }, 15000);
}

function runMatchmaker() {
  for (const [key, entries] of pools.entries()) {
    const isRated = key.endsWith(':rated');
    const candidates = [...entries].sort((a, b) => a.queueEnteredAt - b.queueEnteredAt);

    while (candidates.length >= 2) {
      const p1 = candidates.shift()!;
      const waitedSec = (Date.now() - p1.queueEnteredAt) / 1000;
      const band = bandWidth(waitedSec, isRated);
      const p2Idx = candidates.findIndex(
        (p) =>
          (band === Infinity || Math.abs(p.rating - p1.rating) <= band) &&
          rdsCompatible(p1, p, waitedSec),
      );
      if (p2Idx === -1) {
        candidates.unshift(p1);
        break;
      }
      const p2 = candidates.splice(p2Idx, 1)[0]!;

      const pool = pools.get(key)!;
      pools.set(
        key,
        pool.filter((e) => e.userId !== p1.userId && e.userId !== p2.userId),
      );

      void createMultiplayerGame(p1, p2);
    }
  }
}

const matchmakerInterval = setInterval(runMatchmaker, 1000);

const tickInterval = setInterval(() => {
  const now = Date.now();
  for (const game of liveGames.values()) {
    if (game.status !== 'live') continue;
    const { state } = tick(game.state, now);
    if (state.isOver) {
      game.state = state;
      game.status = 'finished';
      void finishGame(game);
    } else if (state.elapsedMs !== game.state.elapsedMs) {
      game.state = state;
      broadcastGame(game, {
        type: 'game:state',
        payload: { gameId: game.id, state: serializeState(state), role: 'player' },
      });
    }
  }
}, 250);

async function finishGame(game: LiveGame) {
  const s1 = game.state.scoresByPlayer[game.player1Id] ?? 0;
  const s2 = game.state.scoresByPlayer[game.player2Id] ?? 0;
  let winnerId: string | null = null;
  if (s1 > s2) winnerId = game.player1Id;
  else if (s2 > s1) winnerId = game.player2Id;

  const ratingChanges: Record<string, number> = {};

  if (game.isRated) {
    const r1 = await getUserRating(game.player1Id, game.timeControl);
    const r2 = await getUserRating(game.player2Id, game.timeControl);
    const score1: 0 | 0.5 | 1 = s1 > s2 ? 1 : s1 < s2 ? 0 : 0.5;
    const score2: 0 | 0.5 | 1 = s2 > s1 ? 1 : s2 < s1 ? 0 : 0.5;
    const newR1 = updateRating(r1, [{ opponent: r2, score: score1 }]);
    const newR2 = updateRating(r2, [{ opponent: r1, score: score2 }]);
    ratingChanges[game.player1Id] = newR1.rating - r1.rating;
    ratingChanges[game.player2Id] = newR2.rating - r2.rating;

    for (const [userId, nr, old] of [
      [game.player1Id, newR1, r1] as const,
      [game.player2Id, newR2, r2] as const,
    ]) {
      await db
        .insert(ratings)
        .values({
          userId,
          timeControl: game.timeControl,
          rating: nr.rating,
          rd: nr.rd,
          volatility: nr.volatility,
          gamesPlayed: 1,
          lastPlayedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.timeControl],
          set: {
            rating: nr.rating,
            rd: nr.rd,
            volatility: nr.volatility,
            lastPlayedAt: new Date(),
          },
        });
    }
  }

  await db
    .update(games)
    .set({
      status: 'finished',
      endedAt: new Date(),
      player1Score: s1,
      player2Score: s2,
      winnerId,
      moves: game.moves,
    })
    .where(eq(games.id, game.id));

  broadcastGame(game, {
    type: 'game:over',
    payload: {
      gameId: game.id,
      finalScores: { [game.player1Id]: s1, [game.player2Id]: s2 },
      winnerId,
      ratingChanges: game.isRated ? ratingChanges : undefined,
    },
  });
}

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  const user = await authenticateConnection(req.url, req.headers.cookie);
  if (!user) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  userSockets.set(user.id, ws);
  send(ws, { type: 'auth:ok', payload: { userId: user.id } });

  let lastPing = Date.now();
  const heartbeat = setInterval(() => {
    if (Date.now() - lastPing > 45000) ws.close(4002, 'Heartbeat timeout');
  }, 5000);

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString()) as WSMessage;

      if (msg.type === 'ping') {
        lastPing = Date.now();
        send(ws, { type: 'pong', payload: {} });
        return;
      }

      if (msg.type === 'queue:join') {
        if (msg.payload.isRated && (!user.supabaseUserId || user.isAnonymous)) {
          send(ws, {
            type: 'error',
            payload: { code: 'auth_required', message: 'Sign in with Google for rated games' },
          });
          return;
        }

        const rating = await getUserRating(user.id, msg.payload.timeControl);
        const key = poolKey(msg.payload.timeControl, msg.payload.isRated);
        const entry: PoolEntry = {
          userId: user.id,
          username: user.username,
          rating: rating.rating,
          rd: rating.rd,
          timeControl: msg.payload.timeControl,
          isRated: msg.payload.isRated,
          queueEnteredAt: Date.now(),
          socket: ws,
        };
        const pool = pools.get(key) ?? [];
        pool.push(entry);
        pools.set(key, pool);
        send(ws, { type: 'queue:waiting', payload: { positionInPool: pool.length, etaSeconds: 15 } });
        return;
      }

      if (msg.type === 'queue:leave') {
        for (const [key, pool] of pools.entries()) {
          pools.set(key, pool.filter((e) => e.userId !== user.id));
        }
        return;
      }

      if (msg.type === 'game:ready') {
        const game = liveGames.get(msg.payload.gameId);
        if (!game) return;
        game.ready.add(user.id);
        if (game.ready.size >= 2 && game.status === 'waitingForReady') {
          game.status = 'live';
          game.state = { ...game.state, startedAt: Date.now() };
          await db.update(games).set({ status: 'live', startedAt: new Date() }).where(eq(games.id, game.id));
          setTimeout(() => {
            broadcastGame(game, {
              type: 'game:state',
              payload: { gameId: game.id, state: serializeState(game.state), role: 'player' },
            });
          }, 5000);
        }
        return;
      }

      if (msg.type === 'game:spectate') {
        const game = liveGames.get(msg.payload.gameId);
        if (!game) return;
        game.spectators.add(ws);
        send(ws, {
          type: 'game:state',
          payload: { gameId: game.id, state: serializeState(game.state), role: 'spectator' },
        });
        return;
      }

      if (msg.type === 'game:resign') {
        const game = liveGames.get(msg.payload.gameId);
        if (!game || game.status !== 'live') return;
        game.state = resign(game.state, user.id, Date.now());
        game.status = 'finished';
        await finishGame(game);
        return;
      }

      if (msg.type === 'game:claim') {
        const game = liveGames.get(msg.payload.gameId);
        if (!game || game.status !== 'live') return;
        const now = Date.now();
        const move: Move = {
          playerId: user.id,
          type: 'claim',
          wordCells: msg.payload.wordCells,
          timestamp: now,
        };
        const { state, result, events } = claimWord(game.state, user.id, msg.payload.wordCells, now, loadDictionarySync());
        if (!result.ok) {
          send(ws, { type: 'error', payload: { code: 'invalid_claim', message: result.reason ?? 'Invalid' } });
          return;
        }
        game.state = state;
        game.moves.push(move);
        if (result.word) {
          broadcastGame(game, {
            type: 'game:claimed',
            payload: {
              gameId: game.id,
              playerId: user.id,
              word: result.word,
              points: result.points!,
              multiplier: result.multiplierApplied!,
            },
          });
        }
        broadcastGame(game, {
          type: 'game:state',
          payload: { gameId: game.id, state: serializeState(state), role: 'player' },
        });
        return;
      }

      if (msg.type === 'game:move') {
        const game = liveGames.get(msg.payload.gameId);
        if (!game || game.status !== 'live') return;
        try {
          const { state } = applyMove(game.state, msg.payload.move, Date.now());
          game.state = state;
          game.moves.push(msg.payload.move);
          broadcastGame(game, {
            type: 'game:state',
            payload: { gameId: game.id, state: serializeState(state), role: 'player' },
          });
        } catch (e) {
          send(ws, { type: 'error', payload: { code: 'invalid_move', message: String(e) } });
        }
      }
    } catch {
      send(ws, { type: 'error', payload: { code: 'parse_error', message: 'Invalid message' } });
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    userSockets.delete(user.id);
    for (const [key, pool] of pools.entries()) {
      pools.set(key, pool.filter((e) => e.userId !== user.id));
    }
  });
});

const port = Number(process.env.PORT ?? 3002);
server.listen(port, () => console.log(`Realtime WS on ws://localhost:${port}`));
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} in use — run pnpm dev:stop first`);
    process.exit(1);
  }
  throw err;
});

function shutdown(signal: string) {
  console.log(`\nRealtime shutting down (${signal})…`);
  clearInterval(matchmakerInterval);
  clearInterval(tickInterval);
  for (const ws of wss.clients) {
    ws.close(1001, 'Server shutting down');
  }
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
