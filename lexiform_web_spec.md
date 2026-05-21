# Lexiform Web — Build Specification

> Working title: **Lexiform**. Same brand as the iOS spec; reuse all naming, color tokens, and game rules. This document covers the **web platform with competitive multiplayer**, inspired by the architecture of [lichess.org](https://github.com/lichess-org).

---

## 0. Read This First (For Cursor)

You are building a real-time competitive word puzzle platform on the web. Single-player modes (Daily, Zen, Blitz) plus head-to-head multiplayer with Glicko-2 ratings, matchmaking, tournaments, and spectator mode.

Implement phase by phase in the order given. **Do not skip ahead.** At the end of each phase, all listed acceptance criteria must pass before moving on.

**Hard rules — non-negotiable:**

1. **Do not reference, name, depict, or imitate any existing commercial game** (the GamePigeon word puzzle, Scrabble, Words With Friends, Lichess's chess assets, etc.). No code comments, asset names, variables, or copy may reference them.
2. **Architectural inspiration from Lichess is allowed; copying their code is not.** Read their patterns and concepts. Do not paste their Scala/Dart/TypeScript source into our codebase. Lichess's lila server is AGPL-3.0 — copy-pasting forces us to publish source under AGPL too. Stay clean-room.
3. **All assets are original.** No imported sprites, icons, sounds, or fonts beyond the open-licensed ones explicitly listed in Section 2.5.
4. **Server-side validation is the source of truth.** Never trust client input for scoring, word validity, time elapsed, or rating changes.
5. **Game rules are identical to the iOS spec.** Do not invent variations. Both clients must produce identical results for identical inputs.

These rules protect the project from copyright, license contamination, and cheating. They are not flexible.

---

## 1. Product Summary

**What it is:** A web platform where players solve word block puzzles. Three solo modes (Daily, Zen, Blitz). One competitive multiplayer suite with matchmaking, ratings, tournaments, and spectating.

**Why it exists:** Casual word-game players have nowhere to play rated head-to-head. Daily-puzzle players want a streak-and-leaderboard layer. We give them both, free and ad-free, in the browser.

**Inspiration:** Architecturally we lean on the Lichess model — a free, open, no-ads platform where the competitive ladder is the main draw. Lichess's stack uses Scala (lila), a pure game-logic library (scalachess), and a Flutter mobile app. We'll use a TypeScript-everywhere stack because it's friendlier to vibe coding and a solo maintainer.

**Primary surfaces:**
- Marketing/home (logged out)
- Solo game (anonymous OK)
- Lobby (matchmaking entry point, rated requires account)
- Live game (real-time vs. opponent)
- Spectator view
- Tournaments (Arena and Swiss)
- Profile (rating history, stats, recent games)
- Daily puzzle (shared seed worldwide, separate leaderboard)

**Out of scope for v1:**
- Native mobile apps (web is responsive instead; iOS handled separately by sibling spec)
- Friend lists and private messages
- Puzzle composer / user-generated content
- Coaching tools, post-game analysis
- Payments and subscriptions

---

## 2. Tech Stack

### 2.1 Stack decisions
| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | Single language, easier solo |
| Frontend | Next.js 14 (App Router) | SSR for SEO + hydrated client play |
| UI library | React + Tailwind CSS + shadcn/ui | Vibe-coding favorite, ships fast |
| Game canvas | DOM/SVG (not Canvas/WebGL) | Accessible, low complexity, sufficient perf for 9×9 grid |
| Real-time | WebSockets via `ws` library on a dedicated Node service | Persistent stateful — cannot be serverless |
| Backend HTTP | Hono on Node | Fast, modern, type-safe |
| Database | PostgreSQL | Reliable; we need transactions for rating updates |
| ORM | Drizzle ORM | Type-safe SQL, lightweight, vibe-friendly |
| Cache / pub-sub | Redis | Matchmaking queues + WS pub-sub |
| Auth | Lucia Auth v3 (or successor) | Session-based, no third-party lock-in |
| Email | Resend | Magic links for sign-in |
| Frontend hosting | Vercel | Auto deploy from GitHub |
| Backend hosting | Fly.io | Persistent WebSocket connections |
| DB hosting | Neon | Serverless Postgres, scales to zero |
| Redis hosting | Upstash | Pay-per-request, free tier |
| Monitoring | Better Stack / Axiom | Logs + uptime |
| Analytics | Plausible (self-host eventually) | No tracking cookies |

### 2.2 Why not the Lichess stack?
Lichess uses Scala (lila) and Flutter (mobile). Scala is excellent but the talent pool for vibe-coding it is much smaller and AI tooling is weaker. TypeScript end-to-end is faster for a solo maintainer. We borrow Lichess's *patterns* — pure game-logic package, microservice separation, AGPL-style openness — not their language choices.

### 2.3 Required tools
- Node.js 20 LTS or later
- pnpm 9+ (workspace support; faster than npm)
- Docker Desktop (for local Postgres + Redis during dev)
- Git
- A Cursor or VS Code editor

### 2.4 Monorepo structure
Use pnpm workspaces.

```
lexiform/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── api/                    # Hono HTTP API (Node)
│   └── realtime/               # WebSocket game server (Node + ws)
├── packages/
│   ├── engine/                 # PURE game logic, no I/O — see Section 6
│   ├── rating/                 # Glicko-2 implementation
│   ├── shared/                 # Shared types, zod schemas, constants
│   └── db/                     # Drizzle schema + migrations
├── infra/
│   ├── docker-compose.yml      # Postgres + Redis for local dev
│   └── fly/                    # Fly.io deployment configs
├── docs/
│   └── SPEC.md                 # this document
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

The `engine` package is the equivalent of Lichess's `scalachess` — pure, immutable, no side effects, no I/O. Both the web client and the realtime server import it. **This guarantees identical game behavior on both sides** (which is critical for anti-cheat).

### 2.5 Bundled assets (open-licensed)
- **Dictionary:** ENABLE2K (public domain) → `packages/engine/data/dictionary.txt`. Same source as iOS spec.
- **Fonts:** Inter Variable (SIL OFL 1.1), JetBrains Mono (SIL OFL 1.1) for code/digits — both self-hosted via `next/font/local`. No Google Fonts CDN.
- **Icons:** Lucide React (ISC license) — generous icon set, tree-shakeable.
- **Sound effects:** synthesize via Web Audio API at runtime (mirror Section 7.5 of iOS spec). No imported sound files.

---

## 3. Visual Design System

Reuse the **Architectural** direction from the iOS spec, web-tuned.

### 3.1 Color tokens
Define as CSS variables in `apps/web/app/globals.css`. Tailwind references these via the `@theme` directive (Tailwind v4) or `tailwind.config.ts` (v3).

```
--background:   #F7F5F0
--surface:      #FFFFFF
--ink:          #1A1A1A
--ink-soft:     #4A4A4A
--muted:        #B5B0A6
--accent:       #2E5BFF
--accent-soft:  #DCE5FF
--success:      #2BA84A
--warning:      #E8A12C
--danger:       #D43A3A
--gem:          #8E5BFF
--gem-soft:     #ECE0FF
```

Add a dark mode in Phase 9. Variables only — no hardcoded hex anywhere in components.

### 3.2 Typography
- Brand display: Inter Variable 700, tracking -0.02em
- UI body: Inter Variable 500
- Tile letters: Inter Variable 700, optical-size large via `font-feature-settings`
- Numerals (score, timer, rating): JetBrains Mono 600

### 3.3 Layout grid
- Max content width: 1200px
- Base unit: 4px
- Standard padding: 16px
- Game board: 540×540px on desktop, 360×360px on mobile
- Tile size: 56×56px desktop, 36×36px mobile; 4px gap

### 3.4 Tile + board visuals
Identical spec to iOS Section 3.4 — same colors, same proportions, same shadows. The game must feel like the iOS app to any user who plays both.

### 3.5 Animations
Use Framer Motion for tile transitions and combo flourishes. Same durations and easings as iOS spec.

### 3.6 Component library
Build atomic components in `apps/web/components/ui/` using shadcn/ui patterns. Required components for v1:
- Button (primary, secondary, ghost, destructive)
- Card
- Dialog / Sheet
- Toast
- Avatar
- Badge (for ratings, titles)
- Tabs
- ScrollArea
- Tooltip

---

## 4. Game Specification (Reference)

The game rules are identical to the iOS spec (Section 4 of `lexiform_project_spec.md`). Do not re-derive them. Specifically:

- 9×9 board
- Three tile types: single (1×1), pair (2×1, rotatable), wild gem (1×1)
- Letter distribution table (Section 4.3 of iOS spec)
- Tile shape distribution: 60% single, 35% pair, 5% wild
- Tap-to-claim word scoring (clicks on web)
- Scoring table: 3=5, 4=12, 5=25, 6=40, 7=55, 8=70, 9+=70+18×(n-8)
- Combo window: 5.0s; ×1.5, ×2.0, ×3.0
- End-of-game bonus: +1 per letter scored

**The shared `packages/engine` is the canonical implementation.** Both client and server import it. No client-side calculation may diverge from server.

---

## 5. Competitive Platform — Core Concepts

This is the big addition vs. the iOS spec. Read carefully.

### 5.1 Time controls
Inspired by Lichess's bullet/blitz/rapid scheme, scaled to a word puzzle where games are short:

| Control | Time per side | Notes |
|---|---|---|
| Bullet | 30 seconds | Reflex play |
| Blitz | 60 seconds | The standard |
| Rapid | 120 seconds | Same as Daily duration |
| Long | 180 seconds | More thoughtful |

In a head-to-head game, **both players race on the same seeded board for the same duration**. Whoever has the higher score at time-out wins. Draws on equal score.

Time is per-game, not per-move (word games don't have turns). Each player's countdown starts when the game begins. The board state is shared and visible to both. Tiles consumed by one player disappear for both — yes, this creates direct interference. This is the multiplayer twist that makes it competitive.

> **Design note:** This "shared board, simultaneous race with interference" mode is the unique competitive hook. It is materially different from any prior implementation. Tested: identical seeded boards guarantee both players have the same opportunities at start; what diverges is who claims which word first.

### 5.2 Rating system
**Glicko-2**, not basic Elo. Lichess uses Glicko-2 for the same reasons we should:
- Tracks rating *and* rating deviation (RD), so we know how confident we are
- Better for intermittent players (RD grows with inactivity)
- Industry standard for online games with sparse play

Initial values for a new account:
- Rating (μ): 1500
- RD (φ): 350 (high uncertainty)
- Volatility (σ): 0.06
- Tau (system constant): 0.5

Rating updates happen **per rating period**, defined here as **after every rated game** (Lichess does the same — they update immediately, treating each game as its own period). This is a slight deviation from canonical Glicko-2 (which assumes batched periods) but is the established practice for live online games.

Implementation lives in `packages/rating/`. Source the algorithm from Mark Glickman's original paper (http://www.glicko.net/glicko/glicko2.pdf) — it is freely usable. Do not copy from any specific library; implement from the paper.

**Separate ratings per time control.** A player has a Bullet rating, Blitz rating, Rapid rating, Long rating — each tracked independently, just like Lichess does. This prevents a fast-play specialist from gaming the Long ladder.

### 5.3 Matchmaking
Queue-based with rating bands. Inspired by Lichess's pool system.

**Player flow:**
1. Player picks time control + rated/casual + (optional) rating range filter
2. Server places them in a pool keyed by `(timeControl, isRated)`
3. Matchmaker runs every 1.0s, attempting pairings within widening rating bands

**Matchmaker algorithm:**
```
For each pool:
  candidates = players in pool, sorted by queueEnteredAt ascending
  while candidates has 2+ entries:
    p1 = candidates.shift()
    bandWidth = baseBand(p1.queueDurationSeconds)   // see table
    p2 = candidates.find(p => |p.rating - p1.rating| <= bandWidth
                              && rdsCompatible(p1, p2))
    if p2:
      pair(p1, p2) → create game, remove both from pool
    else:
      keep p1 in pool, try next loop iteration
```

Band widening table (rating-difference tolerance vs. seconds waited):
- 0–10s: ±50
- 10–20s: ±100
- 20–40s: ±200
- 40–60s: ±400
- 60s+: ±∞ (any opponent)

`rdsCompatible` requires `|p1.rd − p2.rd| < 200` for the first 30 seconds to prevent volatile new accounts from sniping established players. Relaxes after.

**Casual games** (unrated) use the same matchmaker but with `bandWidth × 2` baseline — looser matching is fine when no rating is at stake.

### 5.4 Game lifecycle (real-time)

State machine for a multiplayer game:

```
created → waitingForReady → live → finished
                                 ↘ aborted (disconnect within 10s)
                                 ↘ resigned
```

**Created:** Matchmaker pairs two players. Game record inserted with seed, time control, both player IDs. WS room opened.

**WaitingForReady:** Both players load the game page, send `READY`. 5-second countdown before `live`. If either fails to send `READY` within 15s, the game is aborted (no rating change).

**Live:** Both clocks running. Players send `MOVE` (tile placement), `ROTATE`, `CLAIM` (word claim). Server validates every action against the engine, applies to canonical board state, broadcasts updates to both players. Tiles consumed by one player are removed for both — this is intentional.

**Finished:** Either timer hits 0 OR both players resign OR one resigns. Server computes final scores, persists game record, applies Glicko-2 rating update (if rated), broadcasts `GAME_OVER`.

**Disconnect handling:** If a player disconnects, their clock keeps running. They have 30 seconds to reconnect. If not, they forfeit on time. (Mirrors Lichess: disconnect ≠ pause.)

### 5.5 Tournaments

Two formats, both v1:

**Arena (Lichess invented this, public-domain format):**
- Time-windowed event (e.g., 60 minutes)
- Players join freely, get paired as they become available
- Win = 2 pts, draw = 1, loss = 0
- Win streaks (2+ consecutive wins) double subsequent win points
- Highest total points at end wins
- Allows late joiners and early dropouts gracefully

**Swiss:**
- Fixed number of rounds (typically 5, 7, or 9)
- Pairings each round based on running score, avoiding repeats
- All players play every round (no elimination)
- Tiebreakers: Buchholz, then Sonneborn-Berger

Tournament infra requires:
- Scheduled events table with start time, format, time control, rated/casual
- Real-time pairing service
- Live leaderboard with WebSocket updates
- Result history per player

For v1 we ship Arena only; Swiss in Phase 11. Note in roadmap.

### 5.6 Spectator mode
Any live game has a unique URL `/game/:id`. Anyone can watch in real time.

Spectators receive the same WS events as players but cannot send moves. The game UI hides player-specific controls and shows both score timers prominently.

A "watch live games" lobby page lists currently-live games filterable by time control, sorted by combined rating of players. Mirrors Lichess's `/tv` page.

### 5.7 Anti-cheat

Word games are less amenable to engine assistance than chess, but cheating is still possible (dictionary autoclicker, solver bot reading the board via screenshot). Mitigations:

- **Server-authoritative:** every move and claim validated server-side against the engine. Client UI is suggestive only.
- **Rate limits:** max 5 moves per second per player. Max 3 claims per second.
- **Statistical flagging:** track moves-per-second distribution per player. Flag accounts whose distribution is more than 4σ from population mean.
- **Replay reproducibility:** every game is stored as `(seed, ordered moveList)`. We can replay any game and verify the score. If a player's score doesn't match the replay, the game is invalidated.
- **Glicko-2 RD as a soft signal:** unusually large rating gains in a short window auto-flag for review.
- **Manual review queue:** flagged games appear in an admin dashboard for human review.

Cheat detection is post-v1 in terms of automated flagging; the server-authoritative validation and rate limits are v1 musts.

---

## 6. Engine Package (`packages/engine`)

This is the heart of the system. Pure TypeScript, no I/O, no network, no DOM access. Equivalent in spirit to `scalachess` in the Lichess monorepo.

### 6.1 Exports
```typescript
// packages/engine/src/index.ts
export { createGame, applyMove, claimWord, tick } from './game'
export { generateBoard } from './board-generator'
export { findCandidateWords } from './word-detection'
export { computeScore } from './scoring'
export { isValidWord, loadDictionary } from './dictionary'
export type {
  GameState, Board, Tile, TileShape, GridPosition,
  Move, ClaimResult, GameMode, TimeControl
} from './types'
```

### 6.2 Core types
```typescript
export type TileShape =
  | { kind: 'single' }
  | { kind: 'pair'; orientation: 'horizontal' | 'vertical' }
  | { kind: 'wild' }

export interface Tile {
  id: string                    // uuid
  shape: TileShape
  letters: string[]             // length 1 for single/wild, 2 for pair
  position: GridPosition | null  // null if in refill queue
}

export interface GridPosition { row: number; col: number }

export interface Board {
  size: 9
  tiles: Record<string, Tile>   // by id
  occupancy: (string | null)[][]  // 9x9 grid of tile ids
}

export interface GameState {
  mode: GameMode
  seed: number | null            // null for non-seeded modes
  board: Board
  refillQueue: Tile[]
  scoresByPlayer: Record<string, number>  // playerId -> score
  totalLettersScoredByPlayer: Record<string, number>
  comboState: Record<string, { lastClaimAt: number; multiplier: number; count: number }>
  wordsClaimedByPlayer: Record<string, ClaimedWord[]>
  startedAt: number              // unix ms
  durationMs: number             // total game duration
  elapsedMs: number              // per-tick update
  isOver: boolean
  endedAt: number | null
}

export interface Move {
  playerId: string
  type: 'place' | 'rotate' | 'claim' | 'wildPick'
  tileId?: string
  to?: GridPosition
  wordCells?: GridPosition[]
  wildSubstitution?: string      // single letter A-Z
  timestamp: number
}

export interface ClaimResult {
  ok: boolean
  word?: string
  points?: number
  multiplierApplied?: number
  reason?: 'invalid_word' | 'no_word_here' | 'already_claimed' | 'not_your_turn'
}
```

### 6.3 Determinism contract
- `generateBoard(seed)` is pure: identical seed → identical board + refill queue.
- `applyMove` is pure: `(state, move) → newState`. Never mutates input.
- All time-based logic accepts an explicit `now: number` parameter; never reads `Date.now()` internally.
- No `Math.random()` calls. All randomness flows from the seeded PRNG.

This contract means **every game is fully replayable from `(seed, ordered move list)`**, which the server uses for anti-cheat verification.

### 6.4 PRNG
Implement xorshift64 (same as iOS spec Appendix A.2). One canonical implementation for both web client and server.

```typescript
export class SeededRandom {
  private state: bigint
  constructor(seed: number) { /* ... */ }
  next(): bigint { /* ... */ }
  nextInt(upperBound: number): number { /* ... */ }
  nextDouble(): number { /* ... */ }
}
```

### 6.5 Dictionary loading
Bundle `dictionary.txt` as a static asset in the engine package. Provide both sync and async loaders.

```typescript
// Server-side: load once at boot
export async function loadDictionary(): Promise<Set<string>>

// Client-side: lazy-load on first game
export async function loadDictionaryClient(url: string): Promise<Set<string>>
```

### 6.6 Tests
Vitest suite. Must include:
- Determinism: same seed produces same board across 1000 trials
- Word detection finds all horizontals + verticals ≥ 3
- Wild gem substitution picks longest valid word, ties → alphabetical
- Scoring matches the table exactly for 3-letter through 12-letter words
- Combo escalation across realistic timing scenarios
- Replay verification: arbitrary game replay reproduces final score

Target: 80%+ coverage on `packages/engine`. This is the package that **must not regress**.

---

## 7. Rating Package (`packages/rating`)

### 7.1 Glicko-2 implementation
Implement from Glickman 2012 (http://www.glicko.net/glicko/glicko2.pdf). Pure TypeScript, no dependencies.

```typescript
export interface Rating {
  rating: number      // μ on Glicko-2's display scale, base 1500
  rd: number          // φ on display scale, starts at 350
  volatility: number  // σ, starts at 0.06
}

export interface GameOutcome {
  opponent: Rating
  score: 0 | 0.5 | 1   // loss, draw, win from player perspective
}

export function updateRating(
  player: Rating,
  outcomes: GameOutcome[],
  systemTau: number = 0.5
): Rating

export function newRating(): Rating  // returns { 1500, 350, 0.06 }
```

### 7.2 Rating periods
We treat each rated game as its own period (one outcome in the outcomes list). This matches Lichess's approach. RD inflation over time is handled by `decayInactiveRatings()` — a cron job that increases RD for accounts inactive >7 days. Specifics in Phase 8.

### 7.3 Tests
- Verify against worked examples in Glickman's paper
- Idempotence: applying the same outcome twice (illegal) is rejected at API layer, not in this function
- Monotonicity: winning increases rating, losing decreases, draw moves toward opponent

---

## 8. Database Schema (`packages/db`)

Drizzle ORM, PostgreSQL. Migrations live in `packages/db/drizzle/`.

### 8.1 Tables
```sql
-- Users
users (
  id              uuid primary key,
  username        text unique not null check (length(username) between 3 and 20),
  email           text unique,
  email_verified  boolean default false,
  created_at      timestamptz default now(),
  is_anonymous    boolean default false,
  is_banned       boolean default false,
  preferences     jsonb default '{}'
)

-- Per-time-control ratings
ratings (
  user_id         uuid references users(id) on delete cascade,
  time_control    text check (time_control in ('bullet','blitz','rapid','long')),
  rating          real not null default 1500,
  rd              real not null default 350,
  volatility      real not null default 0.06,
  games_played    int not null default 0,
  last_played_at  timestamptz,
  primary key (user_id, time_control)
)

-- Auth sessions (Lucia)
sessions (
  id              text primary key,
  user_id         uuid not null references users(id) on delete cascade,
  expires_at      timestamptz not null
)

-- Games (the canonical record)
games (
  id              uuid primary key,
  mode            text not null check (mode in ('daily','zen','blitz_solo','vs')),
  time_control    text,                                 -- null for solo
  is_rated        boolean default false,
  seed            bigint not null,
  duration_ms     int not null,
  status          text not null check (status in ('created','live','finished','aborted')),
  started_at      timestamptz,
  ended_at        timestamptz,
  player1_id      uuid references users(id),
  player2_id      uuid references users(id),            -- null for solo
  player1_score   int,
  player2_score   int,
  winner_id       uuid references users(id),            -- null for draw or solo
  moves           jsonb not null default '[]',          -- ordered move list
  rating_change_p1 real,                                -- nullable
  rating_change_p2 real,
  created_at      timestamptz default now()
)

create index idx_games_player1 on games(player1_id);
create index idx_games_player2 on games(player2_id);
create index idx_games_status on games(status) where status = 'live';
create index idx_games_mode_ended on games(mode, ended_at desc);

-- Daily results (a denormalized view for fast leaderboard)
daily_results (
  user_id         uuid references users(id) on delete cascade,
  date_key        date not null,  -- UTC date
  score           int not null,
  word_count      int not null,
  max_combo       real not null,
  played_at       timestamptz not null,
  primary key (user_id, date_key)
)

create index idx_daily_results_date_score on daily_results(date_key, score desc);

-- Tournaments
tournaments (
  id              uuid primary key,
  name            text not null,
  format          text not null check (format in ('arena','swiss')),
  time_control    text not null,
  is_rated        boolean default true,
  starts_at       timestamptz not null,
  duration_minutes int not null,
  rounds          int,                  -- swiss only
  status          text not null check (status in ('scheduled','live','finished','cancelled')),
  created_by      uuid references users(id),
  created_at      timestamptz default now()
)

tournament_entries (
  tournament_id   uuid references tournaments(id) on delete cascade,
  user_id         uuid references users(id) on delete cascade,
  score           real not null default 0,
  joined_at       timestamptz default now(),
  primary key (tournament_id, user_id)
)

tournament_games (
  tournament_id   uuid references tournaments(id) on delete cascade,
  game_id         uuid references games(id) on delete cascade,
  round           int,                  -- swiss only
  primary key (tournament_id, game_id)
)
```

### 8.2 Rationale
- `games.moves` as JSONB allows full replay without a separate moves table. For v1 this is fine; if it gets slow at scale, normalize.
- Separate `daily_results` table because daily leaderboard queries are hot and we want a dedicated index.
- Per-time-control ratings as composite key — denormalized but reads are O(1) and writes are rare.

---

## 9. API Surface (`apps/api`)

Hono on Node. Endpoints below; all responses JSON.

### 9.1 Auth (Lucia v3 patterns)
```
POST   /auth/signup-anonymous       → creates guest account, returns session cookie
POST   /auth/request-magic-link     { email }
POST   /auth/verify-magic-link      { token } → sets session
POST   /auth/logout
GET    /auth/me                     → current user
PATCH  /auth/upgrade-anonymous      { email } — links a guest to an email
```

### 9.2 Games
```
POST   /games/solo                  { mode: 'daily'|'zen'|'blitz_solo' } → game id
POST   /games/solo/:id/finalize     { moves: Move[], finalScore: number }
                                    — server replays moves to verify, persists, updates streak
GET    /games/:id                   → game record + final state
GET    /games/:id/replay            → ordered move list for client-side replay
```

### 9.3 Matchmaking + multiplayer
Matchmaking is over WebSocket, not HTTP (latency matters). HTTP endpoints exist only for status:
```
GET    /lobby/pools                 → counts in each pool
GET    /lobby/live                  → list of live games (paginated)
```

### 9.4 Daily puzzle
```
GET    /daily/today                 → today's seed, leaderboard top 100
GET    /daily/today/me              → has current user played? what score?
GET    /daily/history?days=30       → user's daily history
GET    /daily/:date/leaderboard     → top 100 for that date
```

### 9.5 Profile
```
GET    /users/:username             → public profile
GET    /users/:username/games?page= → paginated game history
GET    /users/:username/rating-history?tc=blitz → for sparklines
```

### 9.6 Tournaments
```
GET    /tournaments                 → upcoming + live + recent
GET    /tournaments/:id             → details + leaderboard
POST   /tournaments/:id/join
POST   /tournaments/:id/withdraw
```

### 9.7 Validation
All request/response shapes defined with Zod in `packages/shared/schemas/`. Both client and server import from there.

### 9.8 Rate limiting
Apply Redis-backed rate limits per session:
- Auth endpoints: 10/min per IP
- Game finalize: 1 per 10s per user (prevents replay spam)
- Matchmaking enter: 1 per 3s per user

---

## 10. Realtime Service (`apps/realtime`)

Stateful Node process running `ws` (the `ws` package, not Socket.io — lower overhead). Hosted on Fly.io with persistent connections.

### 10.1 Responsibilities
- Accept WS connections authenticated via session cookie
- Maintain matchmaking pools in Redis
- Run pairing loop every 1.0s per pool
- Hold authoritative game state for live games (in-memory, snapshot to Redis every 5s for crash recovery)
- Validate every incoming move against the engine
- Broadcast state changes to participants and spectators
- Persist completed games to Postgres + trigger rating update

### 10.2 Message protocol
JSON messages, both directions. Wire format:
```typescript
{ type: string; payload: object; reqId?: string }
```

**Client → server:**
```
{ type: 'queue:join',  payload: { timeControl, isRated } }
{ type: 'queue:leave', payload: {} }
{ type: 'game:ready',  payload: { gameId } }
{ type: 'game:move',   payload: { gameId, move: Move } }
{ type: 'game:claim',  payload: { gameId, wordCells: GridPosition[], wildPick?: string } }
{ type: 'game:resign', payload: { gameId } }
{ type: 'game:spectate', payload: { gameId } }
{ type: 'ping', payload: {} }
```

**Server → client:**
```
{ type: 'queue:waiting', payload: { positionInPool, etaSeconds } }
{ type: 'queue:matched', payload: { gameId, opponent: PublicUser, timeControl } }
{ type: 'game:state',    payload: { gameId, state: GameStatePublic } }
{ type: 'game:claimed',  payload: { gameId, playerId, word, points, multiplier } }
{ type: 'game:over',     payload: { gameId, finalScores, winnerId, ratingChanges } }
{ type: 'game:aborted',  payload: { gameId, reason } }
{ type: 'error',         payload: { code, message } }
{ type: 'pong', payload: {} }
```

### 10.3 Connection lifecycle
On connect:
1. Read session cookie, validate against Postgres or Redis session cache
2. If invalid → close with code 4001
3. If valid → register socket under `userId` in an in-memory map (and Redis pubsub channel for cross-instance routing)
4. Send `auth:ok`

Heartbeat: client must send `ping` every 20s, server responds with `pong`. If 45s pass without a ping, close the socket. If a player is in a live game when their socket closes, start their 30-second reconnect window.

### 10.4 Scaling sketch (post-v1)
- Single Fly machine handles ~5000 concurrent connections comfortably with `ws`
- For >5000: shard by gameId hash, route via Redis pubsub, sticky-session by gameId
- Don't optimize this until you have the problem

---

## 11. Frontend Pages (`apps/web`)

Next.js App Router. Server components for SEO-heavy pages, client components for anything interactive.

### 11.1 Routes
```
/                          Landing (logged out) or dashboard (logged in)
/play                      Mode picker
/play/daily                Daily puzzle
/play/zen                  Zen mode
/play/blitz                Solo blitz
/lobby                     Multiplayer entry — queue UI
/game/[id]                 Live game (player or spectator depending on role)
/tournaments               List
/tournaments/[id]          Single tournament
/u/[username]              Profile
/u/[username]/games        Game history
/leaderboard               Global by time control
/leaderboard/daily         Today's daily leaderboard
/about                     Static
/login                     Magic link form
```

### 11.2 Key client components
- `<GameBoard />` — renders 9×9 grid, handles drag/drop via `react-dnd` or HTML5 drag API
- `<TilePiece />` — single, pair, or wild tile
- `<ScorePanel />` — both players' scores, timers, combo indicator
- `<WordList />` — words claimed this game (collapsible on mobile)
- `<MatchmakingQueue />` — queue status, ETA, rating filters, cancel button
- `<RatingBadge />` — rating + RD with sparkline
- `<LiveGamesTicker />` — sidebar of in-progress games for the lobby

### 11.3 State management
Avoid global state libraries for v1. Use:
- React Server Components for fetched data
- React `useState` / `useReducer` for game-local state
- A small WS client wrapper (`useGameSocket`) that exposes the live state via React Context
- TanStack Query for HTTP data with caching

### 11.4 Accessibility
- All interactive controls keyboard-navigable
- Tiles: focusable, drag via arrow keys + Enter to pick up, arrows to move, Enter to drop, Space to claim word at cursor
- Screen reader labels for every tile (e.g., "letter A, position row 3 column 4, pair tile")
- Color is never the only signal — use shape and text labels alongside accent colors
- Respect `prefers-reduced-motion`

### 11.5 Responsive
- Desktop: side-by-side board + score panel
- Tablet: stacked, board centered
- Mobile: board top, controls below, refill queue scrollable horizontal

### 11.6 Share cards (Open Graph)
Generate per-game OG images server-side via `next/og`. Daily result and finished multiplayer games each get a shareable image at `/og/game/:id`.

---

## 12. Phased Build Plan

Each phase is gated. **All acceptance criteria must pass before moving on.**

### Phase 1: Monorepo + engine package (1–2 days)
- [ ] pnpm workspaces set up per Section 2.4
- [ ] `packages/engine` with types, SeededRandom, board generation, word detection, scoring
- [ ] Dictionary loader
- [ ] Vitest suite covering Section 6.6

**Acceptance:** `pnpm test` green, ≥80% coverage on engine package.

### Phase 2: Database + auth (1 day)
- [ ] `packages/db` with Drizzle schema per Section 8.1
- [ ] `docker-compose.yml` runs Postgres + Redis locally
- [ ] Lucia v3 set up with anonymous + magic-link flows
- [ ] `/auth/me` returns current user

**Acceptance:** Sign up anonymously → upgrade to email → log out → log in via magic link. All works locally.

### Phase 3: Solo gameplay on the web (2 days)
- [ ] Next.js app scaffolded, design tokens wired
- [ ] `<GameBoard />` + `<TilePiece />` with drag/drop
- [ ] All three solo modes playable
- [ ] Score, timer, combo indicator all working
- [ ] Game finalize endpoint persists to DB

**Acceptance:** A user can play Daily, Zen, and Blitz solo end-to-end. Daily leaderboard populates.

### Phase 4: Rating package (½ day)
- [ ] `packages/rating` with Glicko-2 from the 2012 paper
- [ ] Tests against the paper's worked examples
- [ ] `updateRating(player, outcomes)` exported

**Acceptance:** Worked-example test passes byte-identical to Glickman's published expected values.

### Phase 5: Realtime service skeleton (1 day)
- [ ] `apps/realtime` with `ws` server
- [ ] Auth via session cookie
- [ ] Heartbeat
- [ ] Echo test from web client

**Acceptance:** Web client opens WS, authenticates, exchanges pings.

### Phase 6: Matchmaking + live games (2–3 days)
- [ ] Queue join/leave WS messages
- [ ] Pairing loop with rating bands per Section 5.3
- [ ] Game lifecycle from `created` through `finished`
- [ ] Move validation + state broadcast
- [ ] Disconnect/reconnect window
- [ ] Resign

**Acceptance:** Two players in two browser windows can play a full Blitz game against each other. State stays in sync. Disconnection on one side gives 30s reconnect.

### Phase 7: Rated games + rating updates (½ day)
- [ ] On game finish, if rated, call `updateRating` for both players and write back
- [ ] Per-time-control rating storage
- [ ] Display rating + RD on profile
- [ ] Sparkline of last 30 games

**Acceptance:** Playing a rated game updates both players' ratings according to Glicko-2. New users start at 1500 ± 350.

### Phase 8: Spectator + lobby (1 day)
- [ ] `/lobby` page with live queue counts and live games list
- [ ] Spectate any live game via `/game/:id`
- [ ] `LiveGamesTicker` component

**Acceptance:** A third browser can spectate any live game.

### Phase 9: Daily puzzle leaderboard + share cards (1 day)
- [ ] `/leaderboard/daily` page
- [ ] OG image generation for finished games
- [ ] Daily streak tracking on profile

**Acceptance:** Sharing a daily result on social produces a rich preview card with score and grid silhouette.

### Phase 10: Tournaments (Arena) (2 days)
- [ ] Tournament creation (admin-only for v1)
- [ ] Join/withdraw flow
- [ ] Arena pairing service (live)
- [ ] Live leaderboard
- [ ] End-of-tournament results

**Acceptance:** An Arena tournament with 10 test accounts runs to completion correctly.

### Phase 11: Polish + ship prep (2 days)
- [ ] Accessibility audit
- [ ] Mobile responsive QA
- [ ] Error states everywhere (offline, server error, malformed move)
- [ ] Rate limits in place
- [ ] Anti-cheat: replay verification on finalize
- [ ] Privacy policy, terms of service, about page
- [ ] Deployment to Vercel + Fly + Neon + Upstash

**Acceptance:** Site is at a public URL. First external user can play a rated game.

**Total estimated time for solo vibe-coded build: 13–17 working days.**

### Post-v1 phases (not in scope)
- Phase 12: Swiss tournaments
- Phase 13: Dark mode + theming
- Phase 14: Native mobile apps (or PWA installable)
- Phase 15: Public API + bots
- Phase 16: Coaching tools, post-game word analysis
- Phase 17: i18n

---

## 13. Testing Strategy

### 13.1 Engine package — Vitest
- Determinism property tests (1000 seeds)
- Word detection unit tests
- Scoring table table-test
- Replay verification: random move sequences reproduce identical final state

### 13.2 Rating package — Vitest
- Glickman paper worked examples
- Property: rating changes sum to zero across both players (within float epsilon)

### 13.3 API — supertest + Vitest
- Auth flows
- Game finalize replay verification rejects tampered scores
- Rate limits enforce

### 13.4 Realtime — integration tests
- Spin up the WS server in tests, connect two mock clients, run a full game, assert outcome
- Disconnect/reconnect scenarios
- Concurrent matchmaker correctness (multiple players join, all get paired)

### 13.5 Frontend — Playwright
- Full happy-path solo game
- Full happy-path multiplayer game (two browser contexts)
- Mobile viewport tests

### 13.6 Load test (Phase 11 only)
- k6 script: 200 concurrent matchmaking joins, assert all paired within 30s
- 100 concurrent live games, assert no state desync

---

## 14. Deployment

### 14.1 Environments
- **Local:** docker-compose for Postgres + Redis, all three apps via `pnpm dev`
- **Staging:** Fly + Neon free tier + Upstash free tier + Vercel preview
- **Production:** same but paid tiers

### 14.2 CI/CD
GitHub Actions:
- On PR: lint, typecheck, test, build
- On merge to `main`: deploy to staging
- Tagged releases (`v*`): deploy to prod

### 14.3 Secrets
Use `.env` locally, Fly/Vercel secret store in prod. Never commit secrets. `packages/shared/src/env.ts` validates env at startup with Zod.

### 14.4 Observability
- Structured logs via `pino` → Axiom or Better Stack
- Trace IDs propagated across HTTP + WS for debugging multi-service flows
- Uptime monitoring on `/health` for each service

---

## 15. Open Source and Licensing

Lichess's code is AGPL-3.0. The AGPL is a strong copyleft license that protects against proprietary forks — any service running modified code must publish source. This is good for community, hard on solo founders who later want flexibility.

**Recommended license split:**
- `packages/engine` and `packages/rating`: **MIT** — encourage reuse, build community
- `apps/web`, `apps/api`, `apps/realtime`: **AGPL-3.0** — keep the platform open, prevent SaaS clones running our code

Document attributions in `/about`:
- ENABLE2K dictionary — public domain
- Inter font — SIL OFL 1.1
- JetBrains Mono — SIL OFL 1.1
- Lucide icons — ISC
- Glicko-2 algorithm — Mark Glickman (algorithm is unpatented and freely usable)
- Inspiration — lichess.org (acknowledgment, not code reuse)

---

## 16. Critical Reminders for Cursor

- **Never reference other games by name in this codebase.** Use generic terms ("word puzzle", "this platform"). Lichess can be mentioned only in code comments as *architectural inspiration*, never as a source of copied code.
- **Server is the source of truth.** Client-computed scores are display only and must always be re-verified server-side at finalize.
- **Engine package is sacred.** Never import I/O libraries into it. Never read `Date.now()` directly — always accept `now` as a parameter. Never call `Math.random()`.
- **All game replays must reproduce identical final state.** If a test ever shows divergence, stop and fix before adding features.
- **The Glicko-2 implementation comes from the paper, not from copy-pasting an npm library.** This avoids license entanglement and ensures we understand the math.
- **Anonymous play matters.** Lichess's killer feature is "click play, you're playing." Don't force signup for solo modes.
- **Commit early, commit often.** Each phase = one PR-sized merge.

---

## Appendix A: Architecture Diagram

```
            ┌──────────────────────────────┐
            │       Browser (Next.js)      │
            │  ─ React + Tailwind          │
            │  ─ engine pkg (replay/UI)    │
            └───┬────────────────┬─────────┘
                │ HTTP           │ WebSocket
                ▼                ▼
       ┌────────────────┐  ┌──────────────────┐
       │  apps/api      │  │  apps/realtime   │
       │  Hono (Node)   │  │  ws (Node)       │
       │  ─ auth        │  │  ─ matchmaker    │
       │  ─ games CRUD  │  │  ─ game state    │
       │  ─ daily       │  │  ─ engine pkg    │
       │  ─ tourneys    │  │  ─ rating updates│
       └───┬──────┬─────┘  └────┬──────┬──────┘
           │      │             │      │
           ▼      ▼             ▼      ▼
       ┌──────┐ ┌──────────┐ ┌──────┐ ┌──────────┐
       │ Neon │ │ Upstash  │ │ Neon │ │ Upstash  │
       │  PG  │ │  Redis   │ │  PG  │ │  Redis   │
       └──────┘ └──────────┘ └──────┘ └──────────┘
            (shared)              (shared)
```

Engine and rating packages are imported by both `api` and `realtime`; the browser also imports `engine` for local UI predictions (then reconciles with server).

---

## Appendix B: Sample Code Stubs

### B.1 Engine: applying a move (signature only)
```typescript
export function applyMove(
  state: GameState,
  move: Move,
  now: number
): { state: GameState; events: GameEvent[] } {
  // 1. validate move legality
  // 2. produce new immutable state
  // 3. emit events (e.g., 'word_claimed', 'combo_started', 'game_over')
  // throws InvalidMoveError on bad input
}
```

### B.2 Matchmaker pairing loop (simplified)
```typescript
async function pairingLoop(redis: Redis) {
  for (const tc of ['bullet', 'blitz', 'rapid', 'long'] as const) {
    for (const rated of [true, false]) {
      const poolKey = `pool:${tc}:${rated ? 'rated' : 'casual'}`
      const entries = await redis.zrange(poolKey, 0, -1, 'WITHSCORES')
      const players = parsePoolEntries(entries)
      const pairs = computePairs(players, Date.now())
      for (const [p1, p2] of pairs) {
        await createGame({ p1, p2, timeControl: tc, isRated: rated })
        await redis.zrem(poolKey, p1.id, p2.id)
      }
    }
  }
}

setInterval(() => pairingLoop(redis), 1000)
```

### B.3 Glicko-2 update (signature only)
```typescript
export function updateRating(
  player: Rating,
  outcomes: GameOutcome[],
  systemTau = 0.5
): Rating {
  // implement Glickman 2012 step-by-step:
  // 1. convert μ, φ to Glicko-2 scale
  // 2. compute v (estimated variance)
  // 3. compute Δ
  // 4. compute new volatility σ' via iteration
  // 5. update φ and μ
  // 6. convert back to display scale
  // return new Rating
}
```

### B.4 WS message envelope
```typescript
export const MessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('queue:join'),  payload: QueueJoinSchema }),
  z.object({ type: z.literal('queue:leave'), payload: z.object({}) }),
  z.object({ type: z.literal('game:move'),   payload: GameMovePayloadSchema }),
  // ... etc
])

export type WSMessage = z.infer<typeof MessageSchema>
```

---

**End of specification.** Build it phase by phase. Ship Phase 11. Then breathe.
