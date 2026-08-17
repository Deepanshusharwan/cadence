# Cadence — Backend

The single cloud API behind all three clients (web, iOS, Android). Owns the primary Postgres database and runs the deterministic Planner, Analytics, and Leave engines described in the spec — those rules live only here, not duplicated per client.

- **Stack:** Python + FastAPI, SQLAlchemy + Alembic, Postgres, PyJWT verifying Clerk session tokens against Clerk's JWKS
- **Status:**
  - ✅ Data model + migrations for every core entity (users, categories, anchors, sessions, events, day types, weekly reviews)
  - ✅ CRUD endpoints for all of the above, scoped per authenticated user
  - ✅ Computed endpoints ported from the web prototype's client-side logic: `GET /today` (deficit/priority planner), `GET /leave` (carry-forward balance), `GET /streaks`, `GET /insights`
  - ✅ Automated test suite (`tests/`) covering the endpoints above against an isolated in-memory DB — passing
  - ✅ Wired up to `apps/web` — `src/lib/api.ts`/`store.tsx` on the web side talk to this API for everything, running against `DEV_AUTH_BYPASS=true` (a single fixed dev user)
  - ⚠️ Clerk verification is implemented per Clerk's documented JWKS approach (`app/auth.py`) but **has not been live-tested** — this environment has no real Clerk project/keys, and `apps/web` has no `@clerk/nextjs` integration yet either. `DEV_AUTH_BYPASS=true` exists to develop/test everything else without them; never enable it against a real deployment

See [`../docs/architecture.md`](../docs/architecture.md) for the API's role in the sync model and system architecture.

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
```

## Connecting a real Clerk project

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the publishable/secret keys and your instance's JWKS URL (`https://<your-clerk-domain>/.well-known/jwks.json`) into `.env`.
3. Set `DEV_AUTH_BYPASS=false`.
4. Install and wire up `@clerk/nextjs` in `apps/web` (not done yet — today it calls this API with no `Authorization` header at all, which only works because `DEV_AUTH_BYPASS` skips verification entirely) — add the same publishable key there, wrap the app in `<ClerkProvider>`, and attach the session token in `apps/web/src/lib/api.ts`'s `apiFetch`.
