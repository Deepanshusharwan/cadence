# Deployment

> Companion to [`architecture.md`](architecture.md) (system design) and the
> per-app READMEs ([`../backend/README.md`](../backend/README.md),
> [`../apps/web/README.md`](../apps/web/README.md)). This document is the
> step-by-step runbook for actually putting `backend` and `apps/web`
> somewhere real.

---

## 1. Current status

- **Backend**: builds and runs as the real production topology — Caddy →
  containerized FastAPI → Postgres — via `docker compose --profile full up
  -d`. Verified locally against real Clerk credentials (JWKS verification,
  the `azp` check, the `/feedback` admin email allowlist). Not yet pointed
  at a public domain or a real host — that's what §2 covers.
- **Web**: builds and runs as a real production build (`next build` +
  `next start`) locally, proxied at the Caddy backend. Not yet deployed to
  Vercel — that's what §3 covers.
- **Clerk**: the project in use (`touched-foal-1710`) is in **test mode**
  (`pk_test_...`/`sk_test_...`). See §5 before sending real users through
  either deploy.

Nothing in this document has been executed against a real server or a real
Vercel project — it's the guide for doing that, written against what's
already built and verified locally.

---

## 2. Backend

The backend is a self-contained Docker Compose stack (`backend/`): `db`
(Postgres), `api` (the FastAPI app, built from `backend/Dockerfile`), and
`caddy` (reverse proxy + automatic HTTPS, `backend/Caddyfile`). `api` and
`caddy` are gated behind the `full` profile so day-to-day development can
keep using a faster `uv run uvicorn --reload` loop without Docker.

### 2.1 Any VPS (primary path — this is what the stack is built for)

Prerequisites: a server with Docker + the Compose plugin installed, and a
domain's DNS `A`/`AAAA` record pointed at the server's IP.

1. Clone the repo onto the server (or just copy `backend/` — it has no
   dependency on the rest of the monorepo at runtime).
2. `cp backend/.env.example backend/.env` and fill it in:
   - `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_JWKS_URL`,
     `CLERK_ISSUER` — from your Clerk project (§5 on test vs. live).
   - `DEV_AUTH_BYPASS=false` — **must** be false. There is no code path
     that makes this safe against a real deployment.
   - `CORS_ORIGINS=["https://your-web-domain.com"]` — the real origin(s)
     the web app will be served from (Vercel's domain, or your own).
   - `ADMIN_EMAILS=["you@example.com"]` — whoever should be able to read
     `GET /feedback`. More can be added later from the admin UI
     (`/dashboard/feedback`) once you're signed in as one of these.
   - `CADDY_DOMAIN=your-api-domain.com` — this is what switches Caddy from
     the local-dev `:80`-only fallback to real, automatic HTTPS. Nothing
     else about the Caddyfile needs to change.
3. Bring the stack up:
   ```bash
   cd backend
   docker compose --profile full up -d --build
   ```
   Caddy will request a Let's Encrypt certificate for `CADDY_DOMAIN`
   automatically on first request — give it a few seconds.
4. Run migrations (the app doesn't auto-migrate on boot, by design — see
   `backend/README.md`):
   ```bash
   docker compose exec api uv run alembic upgrade head
   ```
5. Verify:
   ```bash
   curl https://your-api-domain.com/health          # {"status": "ok"}
   curl https://your-api-domain.com/me               # 401 (no token) — confirms
                                                       # DEV_AUTH_BYPASS is really off
   ```

**Redeploying after a code change:**
```bash
docker compose --profile full up -d --build api
docker compose exec api uv run alembic upgrade head   # only if there's a new migration
```
`db` and `caddy` don't need rebuilding for an app-code change.

**Migrations**: generated locally with `uv run alembic revision
--autogenerate -m "..."` against your local Postgres, committed to the
repo (`backend/alembic/versions/`), and applied on the server with
`alembic upgrade head` as a separate step from the deploy — never
autogenerate against a production database.

### 2.2 Container PaaS (Fly.io / Railway) — alternative

`backend/Dockerfile` is a plain, portable image (`uv sync` + `uvicorn`) —
either platform can build and run it directly from the Dockerfile with
essentially no changes. The tradeoff versus §2.1: you don't get the
Caddy/TLS setup already built into this repo, and you're using their
managed Postgres instead of the `db` service in `docker-compose.yml`.

Either way, the same env vars from §2.1 step 2 need to be set in the
platform's dashboard/CLI (not committed — these are secrets), and
`alembic upgrade head` still needs to run once against the platform's
Postgres before the app can serve real traffic (most platforms support a
one-off "release command" or a manual `ssh`/`exec` into the running
container for this).

---

## 3. Web (Vercel)

`apps/web` is a standard Next.js App Router project — Vercel needs no
special configuration beyond the environment variables below.

1. Import the repo into Vercel, with **Root Directory** set to `apps/web`
   (this is a pnpm workspace — Vercel's Next.js framework preset handles
   the monorepo detection automatically once the root directory is set).
2. Set these environment variables in the Vercel project settings
   (Production — and Preview too, if you want preview deploys to work
   against the same backend):
   ```
   NEXT_PUBLIC_API_URL=https://your-api-domain.com   # the backend from §2, over Caddy — never :8000
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
   The last two matter more than they look — without them,
   `clerkMiddleware`'s `auth.protect()` redirects unauthenticated visitors
   to Clerk's *hosted* Account Portal instead of this app's own
   `/sign-in`/`/sign-up` pages. This was a real bug caught only once the
   app was running as a genuine production build rather than `next dev`
   (see `apps/web/.env.production.local` locally, and §4).
3. Deploy. Vercel builds with `next build` and serves it — no further
   config needed.
4. Back on the backend (§2.1 step 2), update `CORS_ORIGINS` in
   `backend/.env` to include the real Vercel domain(s) (production domain
   and, if you want preview deploys to work, the `*.vercel.app` preview
   pattern), then redeploy the backend so the new CORS config takes
   effect.

**Custom domain**: point it at Vercel per their DNS instructions; no
changes needed on the Cadence side beyond adding that domain to
`CORS_ORIGINS`.

---

## 4. Why local `next start` isn't quite the same as Vercel

Two things differ between `pnpm --filter web dev` (used day to day) and a
real deployment, both already hit locally while getting the local
Docker/Caddy rehearsal working:

- **`NEXT_PUBLIC_*` vars are baked in at build time**, not read at
  runtime. `next dev` re-evaluates `.env.local` on every request; a
  production build (`next build` + `next start`, or Vercel) inlines
  whatever was set *at build time* into the client bundle. If you need a
  build that talks to a different `NEXT_PUBLIC_API_URL` than your `.env.local`
  (e.g. the containerized backend on `:80` instead of the direct `uvicorn
  --reload` on `:8000`), use a separate `.env.production.local` — Next.js
  loads it only for production builds, overriding `.env.local`, so the
  fast dev loop's config is untouched.
- **Middleware-driven redirects need `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`_SIGN_UP_URL`
  explicitly set** (§3 step 2) — this can look like it's working in `next
  dev` and then silently send users to Clerk's hosted portal in a real
  production build if those aren't set. Confirmed as a real, live
  discrepancy in this project — not a hypothetical.

---

## 5. Clerk: test mode vs. live

The Clerk project currently in use is in **test mode** — sign-ups don't
send real email/SMS, and every page shows Clerk's own "Development mode"
badge. That's fine for the local rehearsal in §1, not for real users.

Before sending real traffic through either deploy:

1. In the Clerk dashboard, either flip the existing instance to
   **Production** or create a separate production instance (Clerk's
   recommended pattern — keeps test and live user data fully separate).
2. Get the new `pk_live_...`/`sk_live_...` keys and matching JWKS
   URL/issuer (the domain changes too, e.g.
   `touched-foal-1710.clerk.accounts.dev` → your production Clerk
   domain).
3. Update both `backend/.env` (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`,
   `CLERK_JWKS_URL`, `CLERK_ISSUER`) and the Vercel env vars
   (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) to the live
   values, then redeploy both.
4. Clerk's own dashboard also lets you set the application's display name
   (shows as "My Application" in the widget right now — that's a Clerk
   *project* setting, not something in this codebase) and, for social
   sign-in, real OAuth credentials per provider instead of Clerk's shared
   development ones.

---

## 6. Post-deploy checklist

Run through this after any deploy that touches auth, CORS, or env vars —
it's the same set of checks used to verify the local rehearsal in this
repo, just against the real URLs:

- [ ] `GET https://your-api-domain.com/health` → `{"status": "ok"}`
- [ ] `GET https://your-api-domain.com/me` with no `Authorization` header → `401`
- [ ] Visiting `/dashboard` on the deployed web app while signed out
      redirects to the deployed web app's own `/sign-in` (not Clerk's
      hosted portal, and not `localhost`)
- [ ] Signing in successfully lands on `/dashboard` (or `/setup` for a
      brand-new account) — `fallbackRedirectUrl` on `<SignIn>`/`<SignUp>`
      (`apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` and the `sign-up`
      equivalent)
- [ ] A logged-in, non-admin account visiting `/dashboard/feedback` is
      bounced back to `/dashboard` with no error message
- [ ] `docker compose exec api uv run alembic upgrade head` reports "up to
      date," confirming the deploy step actually ran (a forgotten
      migration is the most common way this kind of deploy silently
      breaks)
