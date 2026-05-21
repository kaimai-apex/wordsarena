# WordsArena — Multiplayer Arena Gameplan

> **Purpose:** Context document for building rated multiplayer (accounts, Supabase, realtime hosting, Glicko-2 ratings).  
> **Work branch:** `feature/multiplayer-arena` (branched from `main` at commit `a104db3`)  
> **Repo:** https://github.com/kaimai-apex/wordsarena  
> **Last updated:** 2026-05-21

---

## 1. Git & workflow

| Branch | Use |
|--------|-----|
| `main` | Solo play, Vercel deploy, stable |
| `feature/multiplayer-arena` | All multiplayer / auth / Supabase / realtime work |

Create PR from `feature/multiplayer-arena` when ready:  
https://github.com/kaimai-apex/wordsarena/pull/new/feature/multiplayer-arena

**Monorepo layout:**

```
lexarena-web/
├── apps/
│   ├── web/          # Next.js 14 — solo UI today; needs /game/[id]
│   ├── api/          # Hono HTTP — auth, solo games, leaderboard
│   └── realtime/     # WebSocket — matchmaking + live games (skeleton works)
├── packages/
│   ├── engine/       # Pure game logic (canonical rules)
│   ├── rating/       # Glicko-2 (display as "rating" like Lichess)
│   ├── shared/       # Zod + WS message types
│   └── db/           # Drizzle schema → Postgres
├── infra/docker-compose.yml   # Local Postgres + Redis
├── lexiform_web_spec.md       # Original spec (§5 multiplayer)
└── PROJECT_DESCRIPTION.md     # Current solo implementation truth
```

**Local dev:**

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install && pnpm db:push
pnpm dev                    # web :3000, api :3001, realtime :3002
```

**Vercel (solo web only today):**

- Root Directory: repo root **or** `apps/web` with monorepo `vercel.json`
- Env: `DATABASE_URL`, `SESSION_SECRET`, `WEB_URL`
- Realtime **not** on Vercel — separate host (see §4)

---

## 2. What exists today (do not rebuild blindly)

| Area | Status | Location |
|------|--------|----------|
| Solo play (Daily/Zen/Blitz) | ✅ Works client-side | `apps/web`, `SoloGameClient`, `GameBoard` |
| Tap + drag tile control | ✅ | `apps/web/components/game/game-board.tsx` |
| Game engine | ✅ Deterministic | `packages/engine` |
| Glicko-2 ratings | ✅ Implemented, not wired to MP end | `packages/rating`, `ratings` table |
| DB schema | ✅ users, games, ratings, sessions, tournaments | `packages/db/src/schema.ts` |
| Anonymous + magic-link auth | ✅ Dev-only magic link | `apps/api`, `/login` |
| Realtime matchmaker | ✅ In-memory pools, band widening | `apps/realtime/src/index.ts` |
| WS protocol types | ✅ | `packages/shared/src/ws.ts` |
| Lobby UI | ⚠️ Skeleton | `apps/web/app/lobby/page.tsx` — WS connect, no real session |
| VS game page | ❌ Missing | Lobby redirects to `/game/:id` — **page does not exist** |
| Google OAuth | ❌ | — |
| Supabase | ❌ | — |
| Production realtime host | ❌ | — |
| Server-authoritative VS moves | ❌ | Solo is client-side; spec wants server validation for MP |

**Spec vs code:** `lexiform_web_spec.md` §5 describes multiplayer (pool, lifecycle, Glicko). `PROJECT_DESCRIPTION.md` describes **solo** behavior (length² scoring, auto-claim, tiles stay). **Decide explicitly** before VS (§7).

---

## 3. Target architecture (Lichess-informed)

Study [lichess-org/lila modules](https://github.com/lichess-org/lila/tree/master/modules) for **patterns**, not code port. Scala monolith → your TS monorepo split.

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web[Next.js on Vercel]
  end
  subgraph supabase [Supabase]
    Auth[Auth - Google OAuth]
    PG[(Postgres)]
    RToptional[Realtime optional - lobby presence only]
  end
  subgraph compute [Game compute]
    API[Hono API - REST]
    RTM[Realtime server - WebSocket]
  end
  Web --> Auth
  Web --> API
  Web --> RTM
  API --> PG
  RTM --> PG
  RTM --> Engine[@lexiform/engine]
```

### Lichess module → WordsArena mapping

| Lichess (`lila`) | WordsArena |
|------------------|------------|
| `pool` | `apps/realtime` matchmaker (already ~aligned) |
| `round` | Per-game state machine in realtime + `games` rows |
| `room` / `socket` | WS room per `gameId` |
| `lobby` | `/lobby` + pool counts |
| `rating` | `packages/rating` + `ratings` table |
| `user` | Supabase Auth + `users` profile |

### What Supabase should (and should not) do

| Use Supabase for | Do NOT use Supabase Realtime for |
|------------------|----------------------------------|
| Google (and email) OAuth | Move validation / game state |
| Hosted Postgres (`DATABASE_URL`) | Clock ticks |
| Optional: presence / lobby viewer counts | Matchmaking pairing logic |

**Reason:** Lichess uses dedicated socket servers with server-authoritative rounds. Generic pubsub does not replace validated game loops.

### Hosting matrix

| Service | Host | Notes |
|---------|------|-------|
| Web | Vercel | Current; `apps/web` or root `vercel.json` |
| API | Vercel serverless **or** Fly/Railway | Split if cookie/JWT/WS token flow is awkward on serverless |
| Realtime WS | **Fly.io** or **Railway** | Always-on; sticky connections; not Vercel |
| DB + Auth | **Supabase** | Drizzle can stay — point at Supabase Postgres URL |
| Redis | Upstash (later) | Only when scaling realtime to **multiple instances** |

---

## 4. Auth design (Google + accounts)

### Requirements

- **Rated multiplayer:** require real account (recommendation; matches Lichess).
- **Solo:** can stay playable without account (current guest fallback) or require login — product choice.
- Replace or supplement magic-link with **Supabase Auth**.

### Recommended flow

1. User signs in with Google → Supabase session (Next.js `@supabase/ssr`).
2. `POST /auth/sync` (Hono) — upsert `users` row, create default `ratings` per time control (1500 / RD 350 / σ 0.06).
3. Lobby requests `GET /auth/ws-token` → short-lived JWT for WebSocket.
4. Realtime validates JWT on connect (today: cookie session in `authenticate()` — refactor).

### Schema additions (suggested)

```sql
-- users table additions
supabase_user_id uuid unique
avatar_url text
auth_provider text  -- 'google' | 'email' | 'anonymous'
```

Keep internal `users.id` as FK for games/ratings; map from Supabase `sub`.

---

## 5. Realtime server (`apps/realtime`)

### Already implemented (verify against spec)

- Pools keyed by `(timeControl, isRated)` e.g. `blitz:rated`
- Matchmaker every 1s, rating band widening by wait time
- `rdsCompatible` for first 30s
- `createMultiplayerGame` → `waitingForReady` (15s timeout) → `live`
- In-memory `liveGames` Map
- Disconnect timers (partial — confirm clock-on-disconnect behavior)
- Cookie auth from session table

### Production deployment checklist

- [ ] `Dockerfile` for `apps/realtime`
- [ ] Deploy Fly.io / Railway with `PORT`, `DATABASE_URL`
- [ ] `wss://` domain + CORS / cookie domain alignment
- [ ] `NEXT_PUBLIC_REALTIME_URL` in Vercel env
- [ ] Health endpoint for load balancer
- [ ] Graceful shutdown (drain games or persist — v1: single instance, announce maintenance)

### Scaling path (Lichess `pool` lesson)

| Stage | Architecture |
|-------|----------------|
| v1 | Single realtime instance, in-memory pools |
| v2 | Redis (Upstash) for pool queues + pub/sub across instances |
| v3 | Separate matchmaker worker vs game nodes (only at serious scale) |

---

## 6. Rating system (“Elo”)

**Implementation:** Glicko-2 in `packages/rating` — **use this**, not flat Elo. UI can label it “Rating” (Lichess style).

- Separate ratings per time control: `bullet`, `blitz`, `rapid`, `long`
- Update after each rated game (treat each game as one rating period — standard online practice)
- Store on `ratings` table; write deltas to `games.rating_change_p1/p2`

**Wire-up location:** `apps/realtime` on game `finished` → `updateRating()` → DB upsert.

**Matchmaking:** Already uses `rating` + `rd` from DB in pool entries.

---

## 7. VS game rules — decision required

Solo (`PROJECT_DESCRIPTION.md`) differs from original MP spec (`lexiform_web_spec.md` §5.4):

| Topic | Solo (current) | Original MP spec |
|-------|----------------|------------------|
| Claiming | Auto-claim on drag | Manual `CLAIM` messages |
| Tiles after score | Stay on board | Consumed / removed |
| Scoring | length² | Different table |

**Recommendation for MP v1:** Match **solo feel** (auto-claim, tiles stay) so one `GameBoard` adaptation — but both players see same board state; **server applies** `dragTileAndAutoClaim` and broadcasts. Document in engine if VS mode flag needed.

---

## 8. Web app gaps

### Must build

| Route / component | Purpose |
|-------------------|---------|
| `app/game/[id]/page.tsx` | VS match UI |
| `VsGameClient` | WS connection, state sync, clocks |
| `GameBoard` extensions | `mode="vs"`, opponent id, server-driven state |
| Lobby improvements | Show ratings, require auth for rated, WS token |
| Auth UI | Google sign-in via Supabase |

### WS messages (see `packages/shared/src/ws.ts`)

Key client → server: `queue:join`, `queue:leave`, `game:ready`, moves/claims per spec  
Key server → client: `queue:matched`, `game:state`, `game:over`, clock updates

Align message handlers with **current** engine API (`drag`, not legacy `place`/`claim` if adopting solo rules).

---

## 9. Phased implementation plan

### Phase 0 — Foundation (1–2 days)

- [ ] Create Supabase project (Auth + Postgres) — **needs your Supabase dashboard**
- [ ] Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- [x] `pnpm db:push` against Supabase
- [x] Document env in `.env.example`
- [x] Schema: `users.supabase_user_id`, `avatar_url`, `auth_provider` (`packages/db/src/schema.ts`)
- [x] Env helpers: `packages/shared/src/env.ts` (`isSupabaseConfigured`, `missingSupabaseEnvVars`)
- [x] All work on `feature/multiplayer-arena`

### Phase 1 — Real accounts (3–5 days)

- [x] `@supabase/ssr` in `apps/web` — Google OAuth
- [x] `POST /auth/sync` — upsert user + default ratings
- [x] `GET /auth/ws-token` — JWT for realtime
- [x] Realtime: validate WS JWT (`?token=`) + cookie fallback
- [x] Require login for rated queue (UI + server)
- [x] Profile display on lobby (username + ratings per TC)
- [ ] **You:** Enable Google provider in Supabase + Google Cloud OAuth credentials

### Phase 2 — Realtime in production (3–4 days)

- [ ] Dockerize + deploy `apps/realtime` (Fly/Railway)
- [ ] Production `NEXT_PUBLIC_REALTIME_URL`
- [ ] End-to-end: lobby → queue → match event (even with stub game page)
- [ ] Monitoring / logs

### Phase 3 — VS game UI (5–7 days) — **critical path**

- [ ] `/game/[id]` page
- [ ] Server-authoritative moves over WS
- [ ] Shared board + dual clocks + scores
- [ ] Ready → countdown → live (existing state machine)
- [ ] Reconnect handling (resume game room)
- [ ] Resign / timeout → `finished`

### Phase 4 — Rated pipeline (2–3 days)

- [ ] Glicko-2 update on rated `finished`
- [ ] Persist rating deltas on `games`
- [ ] Post-game rating change UI
- [ ] Leaderboard / profile pages (optional v1)

### Phase 5 — Scale & polish (ongoing)

- [ ] Redis-backed pools (multi-instance realtime)
- [ ] Rate limits (5 moves/s per player)
- [ ] Replay audit: `replayMoves` vs stored moves
- [ ] Spectators on `/game/[id]` (read-only WS)
- [ ] Arena tournaments (schema exists; Swiss later)
- [ ] Anti-cheat flagging (post-v1)

---

## 10. Recommended build order

1. **Phase 0 + 1** — Supabase, Google auth, WS token, user sync  
2. **Phase 2** — Deploy realtime (unblocks friends testing queue)  
3. **Phase 3** — `/game/[id]` (makes product real)  
4. **Phase 4** — Rated Glicko updates + UI  

---

## 11. Environment variables (target production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only

# Database (Supabase Postgres connection string)
DATABASE_URL=

# Web
WEB_URL=https://your-domain.vercel.app
NEXT_PUBLIC_REALTIME_URL=wss://realtime.your-domain.fly.dev

# API
SESSION_SECRET=                      # if legacy cookies remain during migration

# Realtime server
PORT=3002
DATABASE_URL=                        # same Supabase DB
```

---

## 12. Lichess reading guide (focused)

| Topic | What to learn | Your code |
|-------|---------------|-----------|
| Pool pairing | Band widening, wait-time fairness | `runMatchmaker()` in realtime |
| Round lifecycle | Server applies moves; one truth | `LiveGame.state` + engine |
| Disconnect | Clock runs; reconnect window | Spec §5.4; verify implementation |
| Rating | Per-TC Glicko/Elo display | `packages/rating` |
| Auth | OAuth accounts for rated | Supabase (new) |

Do **not** port Scala. Keep TypeScript engine as source of truth.

---

## 13. Open product decisions

1. **VS rules:** Solo-like auto-claim vs spec manual claim + consumed tiles?  
2. **Guests in casual MP:** Allow anonymous WS or account-only?  
3. **Magic link:** Remove after Google, or keep email fallback?  
4. **API on Vercel vs Fly:** Start Vercel; split only if needed.  
5. **Display name:** “WordsArena” vs internal `@lexiform/*` package names (cosmetic).

---

## 14. Success criteria for multiplayer v1

- [ ] User signs in with Google  
- [ ] User joins rated blitz queue with visible rating  
- [ ] Match found within band widening rules  
- [ ] Both land on `/game/[id]`, ready up, play full game  
- [ ] Server rejects illegal moves  
- [ ] Winner/loser ratings update in DB  
- [ ] Game row persisted with moves for replay  

---

## 15. References in this repo

| File | Contents |
|------|----------|
| `lexiform_web_spec.md` §5 | Multiplayer product spec (pool, lifecycle, tournaments) |
| `PROJECT_DESCRIPTION.md` | Solo implementation truth |
| `apps/realtime/src/index.ts` | Matchmaker + live game loop |
| `packages/shared/src/ws.ts` | WS message types |
| `packages/rating/src/index.ts` | Glicko-2 |
| `packages/db/src/schema.ts` | Tables |
| `README.md` | Vercel deploy notes |
| `DEPLOY.md` | Vercel troubleshooting |

---

*Use this file as the single source of context when starting a new Cursor conversation on multiplayer.*
