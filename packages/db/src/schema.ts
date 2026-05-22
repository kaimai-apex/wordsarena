import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  real,
  date,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseUserId: uuid('supabase_user_id').unique(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  authProvider: text('auth_provider'),
  bio: text('bio'),
  title: text('title'),
  country: text('country'),
  isModerator: boolean('is_moderator').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  preferences: jsonb('preferences').default({}).notNull(),
});

export const ratings = pgTable(
  'ratings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    timeControl: text('time_control').notNull(),
    rating: real('rating').notNull().default(1500),
    rd: real('rd').notNull().default(350),
    volatility: real('volatility').notNull().default(0.06),
    gamesPlayed: integer('games_played').notNull().default(0),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.timeControl] })],
);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mode: text('mode').notNull(),
    timeControl: text('time_control'),
    isRated: boolean('is_rated').default(false).notNull(),
    seed: integer('seed').notNull(),
    durationMs: integer('duration_ms').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    player1Id: uuid('player1_id').references(() => users.id),
    player2Id: uuid('player2_id').references(() => users.id),
    player1Score: integer('player1_score'),
    player2Score: integer('player2_score'),
    winnerId: uuid('winner_id').references(() => users.id),
    moves: jsonb('moves').default([]).notNull(),
    ratingChangeP1: real('rating_change_p1'),
    ratingChangeP2: real('rating_change_p2'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_games_player1').on(t.player1Id),
    index('idx_games_player2').on(t.player2Id),
    index('idx_games_status').on(t.status),
  ],
);

export const dailyResults = pgTable(
  'daily_results',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateKey: date('date_key').notNull(),
    score: integer('score').notNull(),
    wordCount: integer('word_count').notNull(),
    maxCombo: real('max_combo').notNull(),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.dateKey] }),
    index('idx_daily_results_date_score').on(t.dateKey, t.score),
  ],
);

export const broadcasts = pgTable('broadcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  featuredGameId: uuid('tournament_id').references(() => games.id),
  isLive: boolean('is_live').default(false).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const magicLinks = pgTable('magic_links', {
  token: text('token').primaryKey(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type DailyResult = typeof dailyResults.$inferSelect;
