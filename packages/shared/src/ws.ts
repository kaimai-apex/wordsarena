import { z } from 'zod';
import { GridPositionSchema, MoveSchema, PublicUserSchema, QueueJoinSchema } from './schemas/index.js';

export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('queue:join'), payload: QueueJoinSchema }),
  z.object({ type: z.literal('queue:leave'), payload: z.object({}) }),
  z.object({ type: z.literal('game:ready'), payload: z.object({ gameId: z.string().uuid() }) }),
  z.object({ type: z.literal('game:move'), payload: z.object({ gameId: z.string().uuid(), move: MoveSchema }) }),
  z.object({
    type: z.literal('game:claim'),
    payload: z.object({
      gameId: z.string().uuid(),
      wordCells: z.array(GridPositionSchema),
      wildPick: z.string().optional(),
    }),
  }),
  z.object({ type: z.literal('game:resign'), payload: z.object({ gameId: z.string().uuid() }) }),
  z.object({ type: z.literal('game:spectate'), payload: z.object({ gameId: z.string().uuid() }) }),
  z.object({ type: z.literal('ping'), payload: z.object({}) }),
]);

export const WSServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth:ok'), payload: z.object({ userId: z.string().uuid() }) }),
  z.object({
    type: z.literal('queue:waiting'),
    payload: z.object({ positionInPool: z.number(), etaSeconds: z.number() }),
  }),
  z.object({
    type: z.literal('queue:matched'),
    payload: z.object({
      gameId: z.string().uuid(),
      opponent: PublicUserSchema,
      timeControl: z.enum(['bullet', 'blitz', 'rapid', 'long']),
    }),
  }),
  z.object({
    type: z.literal('game:state'),
    payload: z.object({
      gameId: z.string().uuid(),
      state: z.record(z.unknown()),
      role: z.enum(['player', 'spectator']),
    }),
  }),
  z.object({
    type: z.literal('game:claimed'),
    payload: z.object({
      gameId: z.string().uuid(),
      playerId: z.string(),
      word: z.string(),
      points: z.number(),
      multiplier: z.number(),
    }),
  }),
  z.object({
    type: z.literal('game:over'),
    payload: z.object({
      gameId: z.string().uuid(),
      finalScores: z.record(z.number()),
      winnerId: z.string().uuid().nullable(),
      ratingChanges: z.record(z.number()).optional(),
    }),
  }),
  z.object({
    type: z.literal('game:aborted'),
    payload: z.object({ gameId: z.string().uuid(), reason: z.string() }),
  }),
  z.object({ type: z.literal('error'), payload: z.object({ code: z.string(), message: z.string() }) }),
  z.object({ type: z.literal('pong'), payload: z.object({}) }),
]);

export type WSMessage = z.infer<typeof WSMessageSchema>;
export type WSServerMessage = z.infer<typeof WSServerMessageSchema>;
