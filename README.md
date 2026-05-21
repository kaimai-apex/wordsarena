# WordsArena

Tropical word puzzle platform — solo daily/zen/blitz + rated multiplayer.

## Quick start

```bash
# 1. Start Postgres + Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Copy env and push DB schema
cp .env.example .env
pnpm install
pnpm db:push

# 3. Run everything
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Realtime WS: ws://localhost:3002

## What works today

- Solo play (Daily, Zen, Blitz) in the browser with tropical UI
- Game engine (deterministic board, scoring, combos)
- Auth (anonymous guest + magic link)
- API + WebSocket multiplayer skeleton
- Daily leaderboard (needs API + DB)

## Deploy on Vercel

The Next.js app (`apps/web`) includes the Hono API as serverless routes at `/api/*`, so you only need one Vercel project.

1. Import [github.com/kaimai-apex/wordsarena](https://github.com/kaimai-apex/wordsarena) in Vercel.
2. Set **Root Directory** to `apps/web` (or use the included `apps/web/vercel.json`).
3. Add environment variables:
   - `DATABASE_URL` — Postgres (Neon, Vercel Postgres, or Supabase). Run `pnpm db:push` against it once.
   - `SESSION_SECRET` — random string, 32+ characters.
   - `WEB_URL` — e.g. `https://wordsarena.vercel.app` (your production URL).
4. Deploy. Solo play works without a database; auth, score saving, and the daily leaderboard need `DATABASE_URL`.

**Not on Vercel:** the WebSocket realtime server (`apps/realtime`) — host that separately (Railway, Fly.io, etc.) and set `NEXT_PUBLIC_REALTIME_URL` if you enable multiplayer.

## Tests

```bash
pnpm --filter @lexiform/engine test
pnpm --filter @lexiform/rating test
```
