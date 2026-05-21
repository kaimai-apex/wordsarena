import { z } from 'zod';

export const AuthProviderSchema = z.enum(['google', 'email', 'anonymous']);
export const TimeControlSchema = z.enum(['bullet', 'blitz', 'rapid', 'long']);
export const GameModeSchema = z.enum(['daily', 'zen', 'blitz_solo', 'vs']);
export const GridPositionSchema = z.object({ row: z.number().int().min(0).max(8), col: z.number().int().min(0).max(8) });

export const MoveSchema = z.object({
  playerId: z.string(),
  type: z.enum(['place', 'rotate', 'claim', 'wildPick', 'drag']),
  tileId: z.string().optional(),
  to: GridPositionSchema.optional(),
  wordCells: z.array(GridPositionSchema).optional(),
  wildSubstitution: z.string().optional(),
  timestamp: z.number(),
});

export const SoloGameCreateSchema = z.object({
  mode: z.enum(['daily', 'zen', 'blitz_solo']),
});

export const SoloGameFinalizeSchema = z.object({
  moves: z.array(MoveSchema),
  finalScore: z.number().int().min(0),
});

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export const UpgradeAnonymousSchema = z.object({
  email: z.string().email(),
});

export const PublicUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  isAnonymous: z.boolean(),
});

export const QueueJoinSchema = z.object({
  timeControl: TimeControlSchema,
  isRated: z.boolean(),
});

export const GameMovePayloadSchema = z.object({
  gameId: z.string().uuid(),
  move: MoveSchema,
});

export const GameClaimPayloadSchema = z.object({
  gameId: z.string().uuid(),
  wordCells: z.array(GridPositionSchema),
  wildPick: z.string().optional(),
});

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32),
  API_URL: z.string().url().optional(),
  REALTIME_URL: z.string().url().optional(),
  WEB_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  WS_JWT_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_REALTIME_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type TimeControl = z.infer<typeof TimeControlSchema>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type GameMode = z.infer<typeof GameModeSchema>;
export type Move = z.infer<typeof MoveSchema>;
