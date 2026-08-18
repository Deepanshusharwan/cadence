# Cadence — Backend

The single cloud API behind all three clients (web, iOS, Android). Owns the primary Postgres database and runs the deterministic Planner, Analytics, and Leave engines described in the spec — those rules live only here, not duplicated per client.

- **Stack:** Python + FastAPI, SQLAlchemy + Alembic, Postgres, PyJWT verifying Clerk session tokens against Clerk's JWKS
- **Status:**
  - ✅ Data model + migrations for every core entity (users, categories, anchors, sessions, events, day types, weekly reviews)
  - ✅ CRUD endpoints for all of the above, scoped per authenticated user
  - ✅ Computed endpoints ported from the web prototype's client-side logic: `GET /today` (deficit/priority planner), `GET /leave` (carry-forward balance), `GET /streaks`, `GET /insights`
  - ✅ Automated test suite (`tests/`) covering the endpoints above against an isolated in-memory DB — passing
  - ✅ Wired up to `apps/web` — `src/lib/api.ts`/`store.tsx` on the web side talk to this API for everything, with a real Clerk session token on every request
  - ✅ Caddy reverse proxy (`Caddyfile`) in front of a containerized API (`Dockerfile`), wired into `docker-compose.yml` behind the `full` profile — TLS termination + a stable :80/:443 entry point for a real deployment, automatic HTTPS via just setting `CADDY_DOMAIN` to a real domain. Verified end to end locally (Caddy → containerized API → Postgres, `caddy validate`/`caddy fmt` clean)
  - ✅ Clerk verification is live-tested against a real (test-mode) Clerk project — JWKS signature check, issuer, and `azp` origin validation (`app/auth.py`), running with `DEV_AUTH_BYPASS=false`. `DEV_AUTH_BYPASS=true` still exists purely for local development without live Clerk credentials — never enable it against a real deployment
  - ✅ `GET /feedback` admin view, gated by a Clerk-email allowlist (`ADMIN_EMAILS` in `.env`, plus emails added at runtime via `/admin/emails`) rather than any role stored on the user

See [`../docs/architecture.md`](../docs/architecture.md) for the API's role in the sync model and system architecture, and [`../docs/deployment.md`](../docs/deployment.md) for the deploy runbook (VPS + Vercel).

## Setup

Requires [`uv`](https://docs.astral.sh/uv/) and Docker (for local Postgres).

```bash
cp .env.example .env      # fill in Clerk keys when you have a project, or leave
                           # DEV_AUTH_BYPASS=true for local dev without them
docker compose up -d      # starts Postgres on localhost:5433
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API docs, or `GET /health` for a bare liveness check.

### Running the full stack (Caddy + containerized API + Postgres)

The above runs the API directly on the host for fast iteration. To instead run the actual production topology — Caddy fronting a containerized API, both talking to Postgres over the compose network — use the `full` profile:

```bash
docker compose --profile full up -d --build
curl http://localhost/health      # through Caddy, not :8000 directly — the API has no host port
```

Set `CADDY_DOMAIN=your-real-domain.com` (in `.env`, picked up by compose) to get automatic HTTPS instead of the local-dev `:80`-only fallback — nothing else changes. `docker compose --profile full up -d` still starts `db` too (it's always in the default set); only `api`/`caddy` are behind the profile.

## Tests

```bash
uv run pytest
```

Runs against an isolated in-memory SQLite database per test (see `tests/conftest.py`) — no Docker/Postgres required to run the suite, and auth is overridden to a fixed test user rather than depending on Clerk.

## Project layout

```text
app/
  main.py            FastAPI app, CORS, router registration
  config.py           Env-based settings (pydantic-settings)
  db.py                SQLAlchemy engine/session, declarative Base
  models.py             ORM models — one per spec §60-72 entity actually in use
  schemas.py             Pydantic request/response models
  auth.py                  Clerk JWT verification (+ DEV_AUTH_BYPASS)
  deps.py                   get_current_user — fetches/lazily creates the row for the authenticated Clerk user
  routers/                   One module per resource
  services/                   planner.py, leave.py, analytics.py — the engines from architecture.md §2
alembic/                       Migrations
tests/                          pytest suite against an in-memory DB
Dockerfile                       Container image for `api` (docker-compose `full` profile)
Caddyfile                         Reverse proxy in front of the containerized API
docker-compose.yml                 db (always) + api/caddy (behind the `full` profile)
```

## Connecting a Clerk project

Both sides are already wired up (`app/auth.py` here, `<ClerkProvider>` +
`apiFetch`'s bearer token in `apps/web`) and running against a real
test-mode Clerk project. To point this at a *different* Clerk project (a
fresh one, or switching test → production):

1. Create/open the Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the publishable/secret keys and the instance's JWKS URL
   (`https://<your-clerk-domain>/.well-known/jwks.json`) into `.env`.
3. Set the matching `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`
   in `apps/web/.env.local` too — both sides must agree on the same
   project.
4. Leave `DEV_AUTH_BYPASS=false`. It must never be `true` against
   anything real — see [`../docs/deployment.md`](../docs/deployment.md).
