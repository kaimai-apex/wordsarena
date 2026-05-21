# Vercel deploy checklist

Your build log shows `> @lexiform/api@0.1.0 build /vercel/path0/apps/api` — the **Root Directory is wrong**.

## Required settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` (recommended) or repo root (`.`) |
| **Framework** | Next.js |
| **Build Command** | *(leave empty — use `vercel.json`)* |
| **Install Command** | *(leave empty — use `vercel.json`)* |
| **Include source files outside Root Directory** | **On** (when Root Directory is `apps/web`) |

If Root Directory is accidentally `apps/api`, `apps/api/vercel.json` redirects the build to the Next.js app — but **`apps/web` is still preferred**.

## After changing settings

1. Push latest `main` from GitHub.
2. Vercel → Deployments → **Redeploy** → check commit is **not** `bcff071` (use latest).
3. A good build log shows `@lexiform/web build` → `next build`, not `@lexiform/api` → `tsc` alone.

## Environment variables

- `DATABASE_URL`
- `SESSION_SECRET` (32+ chars)
- `WEB_URL` (e.g. `https://your-app.vercel.app`)
